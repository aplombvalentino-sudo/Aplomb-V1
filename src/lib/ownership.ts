/**
 * Ownership-check helpers.
 *
 * Centralises the "does this caller own this resource?" logic so API routes
 * stay short and consistent.
 *
 * Two ownership models in this app:
 *  - Authenticated user: NextAuth session + resource.userId match.
 *  - Anonymous shopper:  RecommendationSession.ownerTokenHash matches the
 *                        SHA-256 of the aplomb_session_token cookie.
 */

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  hashToken,
  readSessionTokenCookie,
  safeEqual,
} from "@/lib/sessionToken";

// ─── Recommendation session ownership ──────────────────────────────────────

export type SessionOwnershipResult =
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof db.recommendationSession.findUnique>>> }
  | { ok: false; status: 401 | 403 | 404; reason: string };

/**
 * Authorise a caller for a given RecommendationSession.
 *
 * Returns the session row on success — saves the caller from a second lookup.
 */
export async function authorizeSession(
  req: NextRequest,
  recommendationSessionId: string,
): Promise<SessionOwnershipResult> {
  const session = await db.recommendationSession.findUnique({
    where: { id: recommendationSessionId },
  });
  if (!session) return { ok: false, status: 404, reason: "Recommendation session not found." };

  // Case 1: session is tied to a logged-in user.
  if (session.userId) {
    const auth_ = await auth();
    if (!auth_?.user?.id) {
      return { ok: false, status: 401, reason: "Authentication required." };
    }
    if (auth_.user.id !== session.userId) {
      return { ok: false, status: 403, reason: "Not your session." };
    }
    return { ok: true, session };
  }

  // Case 2: anonymous session — compare hashed cookie.
  if (!session.ownerTokenHash) {
    // Session has no ownership marker at all — refuse.
    return { ok: false, status: 403, reason: "Session has no ownership token." };
  }
  const cookieToken = readSessionTokenCookie(req);
  if (!cookieToken) {
    return { ok: false, status: 401, reason: "Missing session token cookie." };
  }
  if (!safeEqual(hashToken(cookieToken), session.ownerTokenHash)) {
    return { ok: false, status: 403, reason: "Session token does not match." };
  }
  return { ok: true, session };
}

// ─── Body-profile ownership (for /api/tryon) ───────────────────────────────

export type BodyProfileOwnershipResult =
  | { ok: true; bodyProfile: NonNullable<Awaited<ReturnType<typeof db.bodyProfile.findUnique>>> }
  | { ok: false; status: 401 | 403 | 404; reason: string };

/**
 * Authorise a caller for a given BodyProfile.
 *
 * For authenticated users: bodyProfile.userId must match the session user.
 * For anonymous shoppers: there must exist a RecommendationSession referencing
 * this bodyProfile whose ownerTokenHash matches the cookie.
 */
export async function authorizeBodyProfile(
  req: NextRequest,
  bodyProfileId: string,
): Promise<BodyProfileOwnershipResult> {
  const bodyProfile = await db.bodyProfile.findUnique({ where: { id: bodyProfileId } });
  if (!bodyProfile) return { ok: false, status: 404, reason: "Body profile not found." };

  // Case 1: authenticated owner.
  if (bodyProfile.userId) {
    const auth_ = await auth();
    if (!auth_?.user?.id) {
      return { ok: false, status: 401, reason: "Authentication required." };
    }
    if (auth_.user.id !== bodyProfile.userId) {
      return { ok: false, status: 403, reason: "Not your body profile." };
    }
    return { ok: true, bodyProfile };
  }

  // Case 2: anonymous — find a sibling session whose token matches.
  const cookieToken = readSessionTokenCookie(req);
  if (!cookieToken) {
    return { ok: false, status: 401, reason: "Missing session token cookie." };
  }
  const expected = hashToken(cookieToken);
  const siblingSession = await db.recommendationSession.findFirst({
    where: { bodyProfileId, ownerTokenHash: expected },
  });
  if (!siblingSession) {
    return { ok: false, status: 403, reason: "Session token does not match." };
  }
  return { ok: true, bodyProfile };
}
