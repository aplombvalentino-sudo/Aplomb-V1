// ⚠️ next-auth is pinned at 5.0.0-beta.31 (see package.json). The whole auth
// surface — session, JWT, providers, callbacks, middleware integration —
// rides on this single dependency. Migrate to 5.0.0 stable BEFORE the first
// paying user OR once DAU > 1k, whichever comes first. Upgrade playbook +
// trigger criteria live in docs/DEPENDENCIES.md.
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { LIMITS, enforceLimits } from "@/lib/rateLimit-upstash";
import { verifyTurnstileToken, TURNSTILE_PROTECT_LOGIN } from "@/lib/security/turnstile";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/** Best-effort IP extraction from a Web Request (NextAuth passes this in). */
function ipFromRequest(req: Request | undefined): string {
  if (!req) return "unknown";
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Credentials authorize, extracted from the inline NextAuth provider config so
 * it can be unit-tested in isolation. Behaviour is identical to the previous
 * inline version: schema → ip → optional Turnstile → rate-limit → Supabase signIn.
 */
export async function authorizeCredentialsLogin(
  credentials: Partial<Record<string, unknown>> | undefined,
  request: Request | undefined,
) {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const ip = ipFromRequest(request);

  // Bot protection (toggle via TURNSTILE_PROTECT_LOGIN). Verified before the
  // password check. Returning null keeps the failure generic.
  if (TURNSTILE_PROTECT_LOGIN) {
    const token =
      typeof credentials?.turnstileToken === "string"
        ? credentials.turnstileToken
        : null;
    const captcha = await verifyTurnstileToken(token, ip);
    if (!captcha.success) return null;
  }

  // Anti-credential-stuffing: cap attempts per (IP, email) pair. Returning null
  // on rate-limit makes the error indistinguishable from "wrong password" so
  // attackers can't probe the limiter.
  const guard = await enforceLimits(
    `${ip}:${parsed.data.email.toLowerCase()}`,
    [LIMITS.login_window],
  );
  if (!guard.allowed) return null;

  // Validate credentials against Supabase Auth.
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? "",
    name: (data.user.user_metadata?.name as string) ?? null,
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        turnstileToken: { label: "Turnstile", type: "text" },
      },
      authorize: (credentials, request) =>
        authorizeCredentialsLogin(credentials, request as Request | undefined),
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});
