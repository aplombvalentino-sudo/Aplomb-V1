import "server-only";

/**
 * Cloudflare Turnstile — server-side verification.
 *
 * The secret key (TURNSTILE_SECRET_KEY) is read here and must NEVER reach the
 * client. This module is `server-only` so importing it from a client component
 * is a build error.
 *
 * Behaviour:
 *  - Secret configured → verify against Cloudflare; reject on failure (fail-closed).
 *  - Secret NOT configured → skip verification and log a warning, so local dev
 *    and preview work without keys. Production sets the key, so it's enforced.
 *
 * We never log the secret or the raw token — only Cloudflare's diagnostic codes.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Whether login (in addition to signup) should require Turnstile. Flip to
 *  `false` to disable login protection without touching the rest of the code. */
export const TURNSTILE_PROTECT_LOGIN = true;

export type TurnstileResult =
  | { success: true; skipped?: boolean }
  | { success: false; errorCodes: string[] };

/** True when a secret key is present, i.e. verification is actually enforced. */
export function isTurnstileConfigured(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.warn(
      "[turnstile] TURNSTILE_SECRET_KEY not set — skipping bot verification. " +
        "Set it in production to enforce.",
    );
    return { success: true, skipped: true };
  }

  if (!token) return { success: false, errorCodes: ["missing-input-response"] };

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };

    if (!data.success) {
      // Diagnostic codes only — no secret, no token.
      console.warn("[turnstile] verification rejected", {
        errorCodes: data["error-codes"] ?? [],
      });
      return { success: false, errorCodes: data["error-codes"] ?? [] };
    }
    return { success: true };
  } catch (e) {
    console.error("[turnstile] siteverify request failed", e);
    return { success: false, errorCodes: ["internal-error"] };
  }
}
