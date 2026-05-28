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
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const ip = ipFromRequest(request as Request | undefined);

        // Bot protection (toggle via TURNSTILE_PROTECT_LOGIN). Verified before
        // the password check. Returning null keeps the failure generic.
        if (TURNSTILE_PROTECT_LOGIN) {
          const token =
            typeof credentials?.turnstileToken === "string"
              ? credentials.turnstileToken
              : null;
          const captcha = await verifyTurnstileToken(token, ip);
          if (!captcha.success) return null;
        }

        // Anti-credential-stuffing: cap attempts per (IP, email) pair.
        // Returning null on rate-limit makes the error indistinguishable from
        // "wrong password" — important so attackers can't probe the limiter.
        const guard = await enforceLimits(
          `${ip}:${parsed.data.email.toLowerCase()}`,
          [LIMITS.login_window],
        );
        if (!guard.allowed) return null;

        // Validate credentials against Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });

        if (error || !data.user) return null;

        // Return the user object for the JWT
        return {
          id: data.user.id,
          email: data.user.email ?? "",
          name: (data.user.user_metadata?.name as string) ?? null,
        };
      },
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
