/**
 * Anonymous session-token helpers.
 *
 * Shoppers can complete a measurement scan without logging in. To prove
 * downstream API calls (/api/outfits, /api/tryon) belong to the same caller,
 * we issue a one-time random token at /api/measurements:
 *
 *   1. Generate 32 random bytes → base64url token (~43 chars).
 *   2. Store the SHA-256 hash of the token on RecommendationSession.ownerTokenHash.
 *   3. Set the plaintext token as an httpOnly cookie scoped to /api.
 *   4. Subsequent calls hash the cookie value and compare against the stored
 *      hash for the referenced session.
 *
 * Authenticated users skip the token entirely — their ownership is proven
 * by RecommendationSession.userId === auth().user.id.
 */

import { createHash, randomBytes } from "crypto";
import type { NextRequest } from "next/server";

export const SESSION_TOKEN_COOKIE = "aplomb_session_token";
/** Token cookie lifetime — long enough for the full scan→outfit→try-on flow. */
const SESSION_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** Generates a fresh anonymous session token (plaintext) + its hash for storage. */
export function newSessionToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

/** SHA-256 hex of the plaintext token. Constant-time-comparable. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Constant-time string compare. Returns false on length mismatch. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Header used to carry the session token when cookies are unavailable. */
export const SESSION_TOKEN_HEADER = "x-aplomb-session";

/**
 * Read the session token from the request.
 *
 * Checks the header FIRST, then the cookie. The header path exists because
 * Safari's Intelligent Tracking Prevention blocks cookie writes from
 * third-party iframes (the embedded widget). In that context the client holds
 * the token in memory and echoes it back via the X-Aplomb-Session header.
 */
export function readSessionToken(req: NextRequest): string | undefined {
  const header = req.headers.get(SESSION_TOKEN_HEADER);
  if (header) return header;
  return req.cookies.get(SESSION_TOKEN_COOKIE)?.value;
}

/** @deprecated use readSessionToken — kept for backward compatibility. */
export function readSessionTokenCookie(req: NextRequest): string | undefined {
  return readSessionToken(req);
}

/** Cookie settings for the session token. */
export function sessionTokenCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TOKEN_MAX_AGE_SECONDS,
  };
}
