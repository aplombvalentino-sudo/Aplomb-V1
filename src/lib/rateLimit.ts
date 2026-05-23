/**
 * Simple in-memory rate limiter for public API routes.
 * For production, replace with Redis (e.g. Upstash) to work across instances.
 */

type Window = { count: number; resetAt: number };
const store = new Map<string, Window>();

export function rateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now > existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  existing.count++;
  return { allowed: true, remaining: limit - existing.count };
}
