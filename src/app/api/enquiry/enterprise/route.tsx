import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, err } from "@/lib/api";
import { parseJsonBody } from "@/lib/validate";
import {
  LIMITS,
  enforceLimits,
  tooManyRequests,
  clientIp,
} from "@/lib/rateLimit-upstash";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

/**
 * POST /api/enquiry/enterprise
 *
 * Captures an enterprise / Premier-plan sales enquiry from the pro
 * pricing page. Persists to the `enterprise_enquiries` table so ops can
 * follow up. This replaced an earlier `console.log` placeholder in the
 * modal that leaked submitted contact data to server logs.
 *
 * No email send is wired up yet — that lives one layer above and can hook
 * a webhook / notification job onto the table later. The important
 * invariant here is that the data lands somewhere durable, not in stdout.
 *
 * Auth is optional (the form may be reached by a signed-out visitor on a
 * future public surface); when present, the userId is captured for context.
 * IP + UA are stored for spam triage only.
 *
 * Bot protection: Turnstile token is verified server-side via the shared
 * helper. The token field is optional in the Zod schema (so dev / preview
 * deploys without a secret keep working), but `verifyTurnstileToken`
 * rejects every request once `TURNSTILE_SECRET_KEY` is set in env. This
 * matters BEFORE the form is exposed to any signed-out / public surface —
 * IP-keyed rate limiting alone is trivially defeated by a botnet rotating
 * IPs through this no-CAPTCHA endpoint.
 */

const schema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
    company: z.string().trim().min(1).max(160),
    message: z.string().trim().min(1).max(4000),
    // Cloudflare Turnstile token. Optional in the schema (absent when
    // Turnstile isn't configured locally); the server enforces it whenever
    // a secret key is set, via verifyTurnstileToken below.
    turnstileToken: z.string().min(1).max(4000).optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  // Anonymous allowed — but we still rate-limit by IP and require a
  // Turnstile token in any environment where the secret is configured.
  const session = await auth();
  const ip = clientIp(req);
  const identity = session?.user?.id
    ? `u:${session.user.id}:enquiry`
    : `ip:${ip}:enquiry`;

  // Reuse the signup limiter shape: a few enquiries per 5 min, a sane
  // daily cap. First line of defence against burst spam.
  const guard = await enforceLimits(identity, [
    LIMITS.signup_window,
    LIMITS.signup_daily,
  ]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) return parsed.response;

  // Bot protection — must pass before we write anything. Enforced whenever
  // a Turnstile secret is configured; skipped (with a warning) only when
  // it isn't (local dev / preview without the env var).
  const captcha = await verifyTurnstileToken(parsed.data.turnstileToken, ip);
  if (!captcha.success) {
    return err(
      "TURNSTILE_FAILED",
      "Verification failed. Please complete the challenge and try again.",
      403,
    );
  }

  await db.enterpriseEnquiry.create({
    data: {
      userId: session?.user?.id ?? null,
      name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company,
      message: parsed.data.message,
      ipAddress: ip === "unknown" ? null : ip,
      userAgent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
    },
  });

  // 202: accepted — ops will follow up. We don't echo back the enquiry id
  // since the client doesn't need it (no "view your enquiry" surface).
  return ok({ accepted: true }, 202);
}
