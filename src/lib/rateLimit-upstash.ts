/**
 * Distributed rate limiting via Upstash Redis.
 *
 * Required env vars:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * If either is missing, this module gracefully falls back to the legacy
 * in-memory limiter (src/lib/rateLimit.ts). That keeps local dev and any
 * preview deploy without the vars set working — at the cost of per-instance
 * accuracy. Production must set both vars.
 *
 * Identity policy:
 *   - Prefer the authenticated user id (auth().user.id).
 *   - For anonymous shoppers, key on the resource owner-token cookie hash
 *     (see lib/sessionToken.ts) — already validated by the ownership layer.
 *   - Last resort: client IP from x-forwarded-for.
 *
 * Always pair a per-minute limiter with a per-day cap on cost-bearing routes.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { rateLimit as legacyInMemory } from "@/lib/rateLimit";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ─── Redis client (lazy) ────────────────────────────────────────────────────

let _redis: Redis | null = null;
let _checkedEnv = false;
let _hasUpstash = false;

function getRedis(): Redis | null {
  if (_checkedEnv) return _redis;
  _checkedEnv = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[ratelimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — falling back to in-memory limiter (single-instance, less safe).",
      );
    }
    return null;
  }
  _redis = new Redis({ url, token });
  _hasUpstash = true;
  return _redis;
}

// ─── Limiter factory ────────────────────────────────────────────────────────

type Window = `${number} ${"s" | "m" | "h" | "d"}`;

const _limiterCache = new Map<string, Ratelimit>();

function buildLimiter(prefix: string, max: number, window: Window): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const cacheKey = `${prefix}:${max}:${window}`;
  const cached = _limiterCache.get(cacheKey);
  if (cached) return cached;
  const lim = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, window),
    analytics: true,
    prefix,
  });
  _limiterCache.set(cacheKey, lim);
  return lim;
}

// ─── Public limiter definitions (the source of truth for every limit) ─────

/**
 * Each constant returns a function that lazily resolves the Ratelimit
 * instance. We do this because top-level instantiation would call getRedis()
 * at module load, which would log noise during the Next build phase.
 */
export const LIMITS = {
  /** AI generation (Gemini) — strict. Per-minute + per-day cap. */
  ai_minute:        () => buildLimiter("rl:ai:m",     8,   "1 m"),
  ai_daily:         () => buildLimiter("rl:ai:d",     50,  "1 d"),

  /** Virtual try-on (fal FASHN) — the most expensive endpoint. */
  tryon_minute:     () => buildLimiter("rl:try:m",    5,   "1 m"),
  tryon_daily:      () => buildLimiter("rl:try:d",    30,  "1 d"),

  /** Body-scan upload + measurement. */
  measurements_min: () => buildLimiter("rl:meas:m",   3,   "1 m"),
  measurements_day: () => buildLimiter("rl:meas:d",   10,  "1 d"),

  /** Account creation — IP-keyed. */
  signup_window:    () => buildLimiter("rl:signup:w", 3,   "5 m"),
  signup_daily:     () => buildLimiter("rl:signup:d", 10,  "1 d"),

  /** Login attempts — IP + email keyed, to thwart credential stuffing. */
  login_window:     () => buildLimiter("rl:login:w",  5,   "5 m"),

  /** Brand-scoped writes (PATCH brand, plan switches, etc.). */
  brand_writes:     () => buildLimiter("rl:brand:m",  30,  "1 m"),

  /** Product / size-chart writes — slightly more lenient. */
  product_writes:   () => buildLimiter("rl:prod:m",   60,  "1 m"),

  /** Public marketplace reads. */
  public_read:      () => buildLimiter("rl:pub:m",    300, "1 m"),
} as const;

// ─── Enforcement helpers ────────────────────────────────────────────────────

export type LimiterFactory = () => Ratelimit | null;

export type EnforceResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Enforce one-or-many limiters against `identity`. The first one to deny
 * stops the chain. Falls back to the legacy in-memory limiter if Upstash
 * is not configured (per-instance, but better than nothing).
 *
 * Pass the strictest limiter first so we deny early when daily caps trip.
 */
export async function enforceLimits(
  identity: string,
  factories: LimiterFactory[],
): Promise<EnforceResult> {
  for (const f of factories) {
    const lim = f();
    if (lim) {
      const res = await lim.limit(identity);
      if (!res.success) {
        const retryAfter = Math.max(1, Math.ceil((res.reset - Date.now()) / 1000));
        return { allowed: false, retryAfterSeconds: retryAfter };
      }
    } else {
      // Fallback: derive a (max, windowMs) from the factory signature is not
      // possible cleanly, so we apply a generic 30/min legacy guard. This
      // only runs if UPSTASH env vars are missing — production must set them.
      const fb = legacyInMemory(`fallback:${identity}`, 30, 60_000);
      if (!fb.allowed) {
        return { allowed: false, retryAfterSeconds: 60 };
      }
    }
  }
  return { allowed: true };
}

/** True if Upstash is configured and active. Useful for diagnostics. */
export function isUpstashActive(): boolean {
  if (!_checkedEnv) getRedis();
  return _hasUpstash;
}

// ─── Response helpers ───────────────────────────────────────────────────────

/** Build the standardised 429 response with Retry-After + structured body. */
export function tooManyRequests(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: `Too many requests. Try again in ${retryAfterSeconds} seconds.`,
        retryAfterSeconds,
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Reset": new Date(Date.now() + retryAfterSeconds * 1000).toISOString(),
      },
    },
  );
}

// ─── Identity helpers ───────────────────────────────────────────────────────

/** Read the client IP from common Vercel / proxy headers. */
export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
