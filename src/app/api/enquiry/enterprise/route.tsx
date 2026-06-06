import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { parseJsonBody } from "@/lib/validate";
import {
  LIMITS,
  enforceLimits,
  tooManyRequests,
  clientIp,
} from "@/lib/rateLimit-upstash";

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
 */

const schema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
    company: z.string().trim().min(1).max(160),
    message: z.string().trim().min(1).max(4000),
  })
  .strict();

export async function POST(req: NextRequest) {
  // Anonymous allowed — but we still rate-limit by IP to keep spam down.
  const session = await auth();
  const ip = clientIp(req);
  const identity = session?.user?.id
    ? `u:${session.user.id}:enquiry`
    : `ip:${ip}:enquiry`;

  // Reuse the signup limiter shape: a few enquiries per 5 min, a sane
  // daily cap. Real spam tooling can be added later (Turnstile field, etc.).
  const guard = await enforceLimits(identity, [
    LIMITS.signup_window,
    LIMITS.signup_daily,
  ]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) return parsed.response;

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
