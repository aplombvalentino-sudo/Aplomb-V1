import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/api";
import { parseJsonBody, zCuid } from "@/lib/validate";
import { LIMITS, enforceLimits, tooManyRequests } from "@/lib/rateLimit-upstash";
import {
  listWardrobeItems,
  canAddWardrobeItem,
  getWardrobeQuota,
} from "@/lib/wardrobe/items";
import { isValidClientPlan } from "@/lib/planLimits";

/**
 * GET    /api/wardrobe/items   →  list the signed-in user's wardrobe + quota
 * POST   /api/wardrobe/items   →  add a CERTIFIED item from a brand catalog
 *                                 (user_photo items are created by the
 *                                 dedicated /api/wardrobe/items/upload route)
 *
 * Wardrobe is now the primary product surface, so these endpoints sit at
 * /api/wardrobe rather than buried under /api/user.
 */

const createCertifiedSchema = z
  .object({
    productId: zCuid,
    productVariantId: zCuid.optional(),
    nickname: z.string().min(1).max(80).optional(),
  })
  .strict();

// ─────────────────────────────────────────────────────────────────────────────
// GET — list + quota
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  // Read the plan off the User row (durable source of truth — maintained by
  // the Stripe webhook). The cookie is just a UX fast-path.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { clientPlan: true },
  });
  const plan = isValidClientPlan(user?.clientPlan) ? user!.clientPlan : "essential";

  const [items, quota] = await Promise.all([
    listWardrobeItems(session.user.id),
    getWardrobeQuota(session.user.id, plan),
  ]);

  return ok({ items, quota, plan });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — add a certified item (linked to a brand catalog Product)
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  // Anti-spam: writes are cheap individually but a malicious client could
  // exhaust the slot count to deny upgrade prompts. Per-user limiter.
  const guard = await enforceLimits(`u:${session.user.id}:wardrobe`, [
    LIMITS.brand_writes,
  ]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  const parsed = await parseJsonBody(req, createCertifiedSchema);
  if (!parsed.ok) return parsed.response;

  // Read the plan
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { clientPlan: true },
  });
  const plan = isValidClientPlan(user?.clientPlan) ? user!.clientPlan : "essential";

  // Quota check — refuse with a friendly code so the UI can surface
  // UpgradePrompt without parsing free-text error messages.
  const allowed = await canAddWardrobeItem(session.user.id, plan, "certified");
  if (!allowed.ok) {
    return err(
      "WARDROBE_FULL",
      `Wardrobe is full (${allowed.quota.itemsUsed}/${allowed.quota.maxItems} slots used).`,
      409,
    );
  }

  // Resolve the catalog product so we can copy its metadata onto the
  // wardrobe row (so wardrobe display works even if the brand later
  // hides/renames the product).
  const product = await db.product.findUnique({
    where: { id: parsed.data.productId },
    include: { brand: { select: { name: true } } },
  });
  if (!product || !product.isActive) {
    return err("PRODUCT_NOT_AVAILABLE", "That product is no longer available.", 404);
  }

  const item = await db.wardrobeItem.create({
    data: {
      userId: session.user.id,
      sourceType: "certified",
      productId: product.id,
      productVariantId: parsed.data.productVariantId,
      category: product.category ?? "other",
      subcategory: product.subcategory,
      brand: product.brand.name,
      nickname: parsed.data.nickname,
      // Certified items skip the processing pipeline — we already have the
      // catalog image as the canonical asset.
      processingStatus: "ready",
    },
  });

  return ok({ item: { id: item.id } }, 201);
}
