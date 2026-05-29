import "server-only";

/**
 * Cloudflare Turnstile — server-side verification.
 *
 * The secret key (TURNSTILE_SECRET_KEY) is read here and must NEVER reach the
 * client. This module is `server-only` so importing it from a client component
 * is a build error.
 *
 * Behaviour:
 *  - Secret configured → verify against Cloudflare; reject on failure.
 *  - Secret NOT configured → skip verification (logs a warning), so the app
 *    keeps working before keys are set. Set the key in production to enforce.
 *
 * We never log the secret or the raw token — only Cloudflare's diagnostic codes.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Whether login should require Turnstile. OFF: the post-signup auto-login is a
 *  programmatic signIn() that carries no token, so gating login would reject it
 *  and bounce brand-new users to /login. Signup stays protected; login keeps
 *  its rate-limiter (anti credential-stuffing). */
export const TURNSTILE_PROTECT_LOGIN = false;

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
      "[turnstile] TURNSTILE_SECRET_KEY not set — skipping bot verification.",
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
