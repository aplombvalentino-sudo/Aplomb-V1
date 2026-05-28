import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { ok, err } from "@/lib/api";
import { parseJsonBody } from "@/lib/validate";
import {
  LIMITS,
  enforceLimits,
  tooManyRequests,
  clientIp,
} from "@/lib/rateLimit-upstash";
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from "@/lib/legal/legalVersions";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

const signupSchema = z
  .object({
    name: z.string().min(1).max(100),
    // brandName is optional — when absent, we create a client account (no Brand record)
    brandName: z.string().min(1).max(100).optional(),
    email: z.string().email().max(200),
    password: z.string().min(8).max(100),
    // Clickwrap acceptance — must be literally true. The accepted *version* is
    // chosen server-side (never trusted from the client) when the row is written.
    acceptTerms: z.boolean(),
    acceptPrivacy: z.boolean(),
    // Cloudflare Turnstile token. Optional in the schema (absent when Turnstile
    // isn't configured); the server enforces it whenever a secret key is set.
    turnstileToken: z.string().min(1).max(4000).optional(),
  })
  .strict();

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, signupSchema);
  if (!parsed.ok) return parsed.response;
  const { name, brandName, email, password, acceptTerms, acceptPrivacy, turnstileToken } =
    parsed.data;

  // Clickwrap gate — both must be explicitly accepted. Enforced here on the
  // server regardless of any client-side checkbox state. No account is created
  // (Supabase Auth or Prisma) unless this passes.
  if (acceptTerms !== true || acceptPrivacy !== true) {
    return err(
      "LEGAL_NOT_ACCEPTED",
      "You must accept the Terms of Use and acknowledge the Privacy Policy to create an account.",
      400,
    );
  }

  // Two-tier rate limit against account-farming:
  //   1) IP+email pair — slows targeted attempts to one slot per 5 min.
  //   2) IP alone, daily — hard cap on the number of signups from one IP/day.
  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent")?.slice(0, 1000) ?? null;
  const emailLower = email.toLowerCase();
  const guard = await enforceLimits(`${ip}:${emailLower}`, [
    LIMITS.signup_daily,
    LIMITS.signup_window,
  ]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);
  const ipGuard = await enforceLimits(`ip:${ip}`, [LIMITS.signup_daily]);
  if (!ipGuard.allowed) return tooManyRequests(ipGuard.retryAfterSeconds);

  // Bot protection — must pass before we create anything. Enforced whenever a
  // secret key is configured; skipped (with a warning) only when it isn't.
  const captcha = await verifyTurnstileToken(turnstileToken, ip);
  if (!captcha.success) {
    return err(
      "TURNSTILE_FAILED",
      "Verification failed. Please complete the challenge and try again.",
      403,
    );
  }

  // 1. Create the user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },           // stored in user_metadata
      emailRedirectTo: undefined, // skip confirmation redirect
    },
  });

  if (authError) {
    const alreadyExists =
      authError.message.toLowerCase().includes("already") ||
      authError.message.toLowerCase().includes("registered");
    return err(
      alreadyExists ? "EMAIL_IN_USE" : "AUTH_ERROR",
      alreadyExists
        ? "An account with this email already exists"
        : authError.message,
      alreadyExists ? 409 : 400
    );
  }

  if (!authData.user) {
    return err("AUTH_ERROR", "Failed to create user account", 500);
  }

  const supabaseUserId = authData.user.id;

  // 2. Mirror the user into Prisma. If brandName provided, also create Brand+BrandUser.
  try {
    const result = await db.$transaction(async (tx) => {
      // Upsert so replayed requests are idempotent
      const user = await tx.user.upsert({
        where: { id: supabaseUserId },
        create: { id: supabaseUserId, name, email },
        update: { name, email },
      });

      // Store immutable proof of clickwrap acceptance. Versions are taken from
      // the server-side config (not the request) so the record is trustworthy.
      await tx.legalAcceptance.createMany({
        data: [
          {
            userId: user.id,
            documentType: "terms",
            documentVersion: CURRENT_TERMS_VERSION,
            ipAddress: ip,
            userAgent,
          },
          {
            userId: user.id,
            documentType: "privacy",
            documentVersion: CURRENT_PRIVACY_VERSION,
            ipAddress: ip,
            userAgent,
          },
        ],
      });

      if (brandName) {
        const baseSlug = slugify(brandName);
        let slug = baseSlug;
        let i = 1;
        while (await tx.brand.findUnique({ where: { slug } })) {
          slug = `${baseSlug}-${i++}`;
        }
        const brand = await tx.brand.create({
          data: { name: brandName, slug },
        });
        await tx.brandUser.create({
          data: { userId: user.id, brandId: brand.id, role: "owner" },
        });
        return { user: { id: user.id, email: user.email, name: user.name }, brand };
      }

      // Client signup — no Brand created
      return { user: { id: user.id, email: user.email, name: user.name }, brand: null };
    });

    return ok(result, 201);
  } catch (dbError) {
    // Roll back the Supabase Auth user if the DB transaction failed
    await supabase.auth.admin?.deleteUser(supabaseUserId).catch(() => null);

    console.error("[signup] DB transaction failed:", dbError);
    return err("DB_ERROR", "Account creation failed. Please try again.", 500);
  }
}
