import "server-only";

/**
 * Wardrobe items — CRUD + quota enforcement.
 *
 * The wardrobe is now the primary product surface (sizing is secondary).
 * Every shopper has a wardrobe; the plan determines how many slots they get
 * and how many of those can be personal user-uploaded photos.
 */

import { db } from "@/lib/db";
import { getClientPlanLimits, type ClientPlan } from "@/lib/planLimits";

// ─── Quota types ─────────────────────────────────────────────────────────────

export type WardrobeQuota = {
  /** Total wardrobe slots for the plan (certified + user_photo). Infinity = unlimited. */
  maxItems: number;
  /** Subset cap on user_photo items. Infinity = unlimited. */
  maxPersonalPhotos: number;
  /** Current count of all wardrobe items the user has. */
  itemsUsed: number;
  /** Current count of user_photo items the user has. */
  personalPhotosUsed: number;
};

export type WardrobeQuotaCheck =
  | { ok: true }
  | { ok: false; reason: "items_full" | "personal_full"; quota: WardrobeQuota };

// ─── Read helpers ────────────────────────────────────────────────────────────

/**
 * Returns the user's current wardrobe usage vs their plan's caps. Used by:
 *   - UI to show "X of Y slots used"
 *   - API guards before insert to refuse with a friendly upgrade prompt
 */
export async function getWardrobeQuota(
  userId: string,
  plan: ClientPlan,
): Promise<WardrobeQuota> {
  const limits = getClientPlanLimits(plan);

  // Two count queries can be served from the same composite index
  // (userId, sourceType) so the round-trip is fast.
  const [itemsUsed, personalPhotosUsed] = await Promise.all([
    db.wardrobeItem.count({ where: { userId } }),
    db.wardrobeItem.count({ where: { userId, sourceType: "user_photo" } }),
  ]);

  return {
    maxItems: limits.maxWardrobeItems,
    maxPersonalPhotos: limits.maxPersonalPhotos,
    itemsUsed,
    personalPhotosUsed,
  };
}

/**
 * Pre-flight check before creating a wardrobe item. Returns {ok: true} when
 * adding ONE item of the given sourceType is allowed under the plan.
 * Caller is responsible for handling the "ok: false" branch (typically by
 * surfacing UpgradePrompt + refusing the insert).
 */
export async function canAddWardrobeItem(
  userId: string,
  plan: ClientPlan,
  sourceType: "certified" | "user_photo",
): Promise<WardrobeQuotaCheck> {
  const quota = await getWardrobeQuota(userId, plan);

  if (quota.itemsUsed >= quota.maxItems) {
    return { ok: false, reason: "items_full", quota };
  }
  if (sourceType === "user_photo" && quota.personalPhotosUsed >= quota.maxPersonalPhotos) {
    return { ok: false, reason: "personal_full", quota };
  }
  return { ok: true };
}

// ─── List for UI ─────────────────────────────────────────────────────────────

/**
 * The fields needed by the wardrobe grid + outfit-picker. Excludes raw image
 * paths — those are turned into signed URLs at read time (see /api/wardrobe/items).
 */
export type WardrobeItemListEntry = {
  id: string;
  sourceType: "certified" | "user_photo";
  category: string;
  subcategory: string | null;
  color: string | null;
  brand: string | null;
  nickname: string | null;
  processingStatus:
    | "pending_upload" | "processing" | "needs_review" | "ready" | "failed";
  usableInOutfit: boolean;
  thumbPath: string | null;
  createdAt: Date;
};

export async function listWardrobeItems(
  userId: string,
): Promise<WardrobeItemListEntry[]> {
  const rows = await db.wardrobeItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      sourceType: true,
      category: true,
      subcategory: true,
      color: true,
      brand: true,
      nickname: true,
      processingStatus: true,
      processedAssetPath: true,
      frontImagePath: true,
      createdAt: true,
      product: { select: { imageUrl: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    sourceType: r.sourceType,
    category: r.category,
    subcategory: r.subcategory,
    color: r.color,
    brand: r.brand,
    nickname: r.nickname,
    processingStatus: r.processingStatus,
    usableInOutfit: r.processingStatus === "ready",
    // Pick the best available thumbnail path:
    //   1. processed asset (background-removed, prettiest)
    //   2. raw front photo (user_photo fallback)
    //   3. product image URL (certified items linked to brand catalog)
    thumbPath: r.processedAssetPath ?? r.frontImagePath ?? r.product?.imageUrl ?? null,
    createdAt: r.createdAt,
  }));
}
