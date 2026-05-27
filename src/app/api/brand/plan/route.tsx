import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, unauthorized, forbidden } from "@/lib/api";
import { parseJsonBody } from "@/lib/validate";
import { LIMITS, enforceLimits, tooManyRequests } from "@/lib/rateLimit-upstash";

const schema = z
  .object({
    plan: z.enum(["free", "pro", "enterprise"]),
  })
  .strict();

/**
 * PATCH /api/brand/plan
 * Updates the Brand.plan field. Auth required, owner/admin only.
 * No Stripe yet — billing will be wired later.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const guard = await enforceLimits(`u:${session.user.id}`, [LIMITS.brand_writes]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  const membership = await db.brandUser.findFirst({
    where: { userId: session.user.id, role: { in: ["owner", "admin"] } },
    include: { brand: true },
    orderBy: { brand: { createdAt: "asc" } },
  });
  if (!membership) return forbidden();

  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) return parsed.response;

  const updated = await db.brand.update({
    where: { id: membership.brand.id },
    data: { plan: parsed.data.plan },
  });

  return ok({ plan: updated.plan });
}
