import { NextRequest } from "next/server";
import { ok } from "@/lib/api";
import { listActiveBrands } from "@/lib/brands";
import {
  LIMITS,
  enforceLimits,
  tooManyRequests,
  clientIp,
} from "@/lib/rateLimit-upstash";

/** GET /api/brands — public list of brands that have at least one active product. */
export async function GET(req: NextRequest) {
  // Generous IP-based limit to deter scrapers without affecting normal browsing.
  const guard = await enforceLimits(`ip:${clientIp(req)}`, [LIMITS.public_read]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  const brands = await listActiveBrands();
  return ok({ brands });
}
