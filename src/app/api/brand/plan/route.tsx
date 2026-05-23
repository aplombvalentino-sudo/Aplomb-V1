import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/api";

const schema = z.object({
  plan: z.enum(["free", "pro", "enterprise"]),
});

/**
 * PATCH /api/brand/plan
 * Updates the Brand.plan field. Auth required, owner/admin only.
 * No Stripe yet — billing will be wired later.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const membership = await db.brandUser.findFirst({
    where: { userId: session.user.id, role: { in: ["owner", "admin"] } },
    include: { brand: true },
    orderBy: { brand: { createdAt: "asc" } },
  });
  if (!membership) return forbidden();

  const body = await req.json().catch(() => null);
  if (!body) return err("INVALID_JSON", "Invalid request body");

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err("INVALID_PLAN", "Plan must be free, pro, or enterprise");
  }

  const updated = await db.brand.update({
    where: { id: membership.brand.id },
    data: { plan: parsed.data.plan },
  });

  return ok({ plan: updated.plan });
}
