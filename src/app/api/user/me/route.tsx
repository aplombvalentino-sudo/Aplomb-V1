import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, unauthorized, err, notFound } from "@/lib/api";
import { parseJsonBody } from "@/lib/validate";
import { LIMITS, enforceLimits, tooManyRequests } from "@/lib/rateLimit-upstash";
import { eraseUser } from "@/lib/userErasure";

/**
 * GET    /api/user/me   →  basic profile + counts (for the account page)
 * PATCH  /api/user/me   →  update mutable profile fields (name only for now)
 * DELETE /api/user/me   →  full GDPR Art 17 erasure (photos + DB + Supabase Auth)
 *
 * For raw data export (Art 15/20) see /api/user/me/export.
 */

const patchSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    /** Self-reported height in centimeters. Used by the wardrobe-driven
     *  AI try-on to render size proportions. Allow null to let the user
     *  explicitly clear it (e.g. to be asked again next try-on). */
    heightCm: z.number().int().min(100).max(250).nullable().optional(),
  })
  .strict();

// ─────────────────────────────────────────────────────────────────────────────
// GET — profile + activity counters for the account page
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      clientPlan: true,
      heightCm: true,
      createdAt: true,
      _count: {
        select: {
          bodyProfiles: true,
          recommendationSessions: true,
          legalAcceptances: true,
        },
      },
    },
  });
  if (!user) return notFound("User");

  return ok({ user });
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — update profile (currently: name only; email rotation requires
// Supabase Auth flow + re-verification, deferred to a dedicated endpoint)
// ─────────────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  // Anti-abuse: a user spamming PATCH could thrash the DB or test side-channel
  // timing on validation. Per-user rate-limit catches it cheaply.
  const guard = await enforceLimits(`u:${session.user.id}`, [LIMITS.brand_writes]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  const parsed = await parseJsonBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;

  // If nothing actionable in the body, return current state — keeps the
  // caller's logic simple (no 400 on empty PATCH).
  const hasName = parsed.data.name !== undefined;
  const hasHeight = parsed.data.heightCm !== undefined;
  if (!hasName && !hasHeight) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, heightCm: true },
    });
    return ok({ user });
  }

  const updated = await db.user.update({
    where: { id: session.user.id },
    data: {
      ...(hasName ? { name: parsed.data.name } : {}),
      ...(hasHeight ? { heightCm: parsed.data.heightCm } : {}),
    },
    select: { id: true, name: true, email: true, heightCm: true },
  });
  return ok({ user: updated });
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — Art 17 right to erasure (deletes photos + cascades DB + Supabase Auth)
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  // Rate-limit AFTER auth to avoid leaking "user exists" via timing on the
  // limiter, but BEFORE the deletion work to stop replay floods.
  const guard = await enforceLimits(`u:${session.user.id}:erase`, [
    LIMITS.brand_writes,
  ]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  const result = await eraseUser(session.user.id);

  if (result.ok) {
    // Note: we can't sign the user out from the server in JWT mode — the
    // client must clear its NextAuth session. Front-end handles redirect.
    return ok({
      deleted: true,
      photosRemoved: result.deletedPhotos,
      profilesRemoved: result.deletedProfiles,
    });
  }

  if (result.reason === "sole-owner") {
    return err(
      "BRAND_OWNER",
      `You are the sole owner of the brand(s): ${result.brands.join(", ")}. ` +
        `Transfer ownership or delete the brand(s) before deleting your account.`,
      409,
    );
  }

  // result.reason === "not-found" — shouldn't happen post-auth, but defensive.
  return notFound("User");
}
