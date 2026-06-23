/**
 * Distributed rate limiting via Upstash Redis.
 *
 * Required env vars:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * If either is missing, this module gracefully falls back to an in-memory
 * limiter (inlined at the bottom of this file). That keeps local dev and any
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
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ─── In-memory fallback ─────────────────────────────────────────────────────
// Single-instance only — unsafe for production. Active only when Upstash env
// vars are missing (local dev, preview deploys without Redis). Inlined here
// rather than living in its own module so the entire rate-limit story is
// readable in one file.

type LegacyWindow = { count: number; resetAt: number };
const legacyStore = new Map<string, LegacyWindow>();

function legacyInMemory(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean } {
  const now = Date.now();
  const existing = legacyStore.get(key);
  if (!existing || now > existing.resetAt) {
    legacyStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (existing.count >= limit) return { allowed: false };
  existing.count++;
  return { allowed: true };
}

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

function parseWindowMs(window: Window): number {
  const [numStr, unit] = window.split(" ") as [string, "s" | "m" | "h" | "d"];
  const n = Number(numStr);
  const mult = unit === "s" ? 1_000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return n * mult;
}

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
 * A limiter factory: call it to lazily resolve the Upstash Ratelimit (or
 * null if Upstash isn't configured). It also carries `.meta` so the
 * in-memory fallback can apply the SAME (max, window) the Redis limiter
 * would — and so cost-bearing limiters can fail closed in production
 * instead of silently degrading to a generic guard. See enforceLimits().
 */
export type LimiterFactory = (() => Ratelimit | null) & {
  meta: { prefix: string; max: number; windowMs: number; costBearing: boolean };
};

/**
 * Define a limiter. The returned function is lazy — it does NOT touch
 * getRedis() until called — so module load stays side-effect-free (no Redis
 * client, no build-phase log noise). `.meta` is computed eagerly (pure, no
 * env reads) so the fallback path has the real numbers.
 *
 * `costBearing` marks limiters that gate genuinely expensive work (AI image
 * generation, virtual try-on, body-scan measurement). For these, a
 * per-instance in-memory counter cannot bound spend across a multi-instance
 * deploy, so when Upstash is missing in production we deny rather than leak
 * effectively-unlimited capacity.
 */
function defineLimiter(
  prefix: string,
  max: number,
  window: Window,
  costBearing = false,
): LimiterFactory {
  return Object.assign(() => buildLimiter(prefix, max, window), {
    meta: { prefix, max, windowMs: parseWindowMs(window), costBearing },
  });
}

export const LIMITS = {
  /** AI generation (Gemini) — strict. Per-minute + per-day cap. */
  ai_minute:        defineLimiter("rl:ai:m",     8,   "1 m", true),
  ai_daily:         defineLimiter("rl:ai:d",     50,  "1 d", true),

  /** Virtual try-on (fal FASHN) — the most expensive endpoint. */
  tryon_minute:     defineLimiter("rl:try:m",    5,   "1 m", true),
  tryon_daily:      defineLimiter("rl:try:d",    30,  "1 d", true),

  /** Body-scan upload + measurement (compute-heavy). */
  measurements_min: defineLimiter("rl:meas:m",   3,   "1 m", true),
  measurements_day: defineLimiter("rl:meas:d",   10,  "1 d", true),

  /** Account creation — IP-keyed. */
  signup_window:    defineLimiter("rl:signup:w", 3,   "5 m"),
  signup_daily:     defineLimiter("rl:signup:d", 10,  "1 d"),

  /** Login attempts — IP + email keyed, to thwart credential stuffing. */
  login_window:     defineLimiter("rl:login:w",  5,   "5 m"),

  /** Brand-scoped writes (PATCH brand, plan switches, etc.). */
  brand_writes:     defineLimiter("rl:brand:m",  30,  "1 m"),

  /** Product / size-chart writes — slightly more lenient. */
  product_writes:   defineLimiter("rl:prod:m",   60,  "1 m"),

  /** Public marketplace reads. */
  public_read:      defineLimiter("rl:pub:m",    300, "1 m"),
} as const;

// ─── Enforcement helpers ────────────────────────────────────────────────────

export type EnforceResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Enforce one-or-many limiters against `identity`. The first one to deny
 * stops the chain. Pass the strictest limiter first so we deny early when
 * daily caps trip.
 *
 * When Upstash is configured, each limiter runs against Redis (accurate
 * across instances). When it is NOT configured:
 *   - cost-bearing limiters FAIL CLOSED in production — a per-instance
 *     in-memory counter can't bound spend across a multi-instance deploy,
 *     so denying is safer than leaking unbounded AI/try-on capacity. (This
 *     should never happen: prod must set UPSTASH_REDIS_REST_URL/TOKEN. The
 *     denial is a loud, visible failure rather than a silent cost leak.)
 *   - every other limiter falls back to an in-memory window using its OWN
 *     real (max, window) — keyed per-limiter, not a shared generic guard —
 *     so local dev / preview behave like production, just per-instance.
 */
export async function enforceLimits(
  identity: string,
  factories: LimiterFactory[],
): Promise<EnforceResult> {
  const isProd = process.env.NODE_ENV === "production";
  for (const f of factories) {
    const lim = f();
    if (lim) {
      const res = await lim.limit(identity);
      if (!res.success) {
        const retryAfter = Math.max(1, Math.ceil((res.reset - Date.now()) / 1000));
        return { allowed: false, retryAfterSeconds: retryAfter };
      }
      continue;
    }

    // Upstash not configured → in-memory fallback, driven by the limiter's
    // own metadata rather than a one-size-fits-all guard.
    const { prefix, max, windowMs, costBearing } = f.meta;
    const retryAfterSeconds = Math.max(1, Math.ceil(windowMs / 1000));

    if (isProd && costBearing) {
      console.error(
        `[ratelimit] FAIL-CLOSED: '${prefix}' denied — Upstash is not configured in production for a cost-bearing limiter. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.`,
      );
      return { allowed: false, retryAfterSeconds };
    }

    const fb = legacyInMemory(`${prefix}:${identity}`, max, windowMs);
    if (!fb.allowed) {
      return { allowed: false, retryAfterSeconds };
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
