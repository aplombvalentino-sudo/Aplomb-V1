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
import { getSignedWardrobeUrls } from "@/lib/wardrobe/storage";

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
 * The fields needed by the wardrobe grid + outfit-picker. Note the field
 * name: `thumbUrl`, not `thumbPath`. Raw Supabase bucket paths never cross
 * the server→client boundary; user_photo items get their signed URL
 * resolved here, and certified items get their public product CDN URL.
 *
 * Clients that previously had to fire one `GET /api/wardrobe/items/thumb`
 * per card (N+1) can now render straight from this field. The thumb
 * endpoint stays as a refresh affordance but the default render path
 * doesn't touch it.
 */
export type WardrobeItemListEntry = {
  id: string;
  sourceType: "certified" | "user_photo";
  category: string;
  subcategory: string | null;
  color: string | null;
  brand: string | null;
  nickname: string | null;
  /** The size the user owns the piece in (free-form: "M", "40", "L Tall"…).
   *  Null for pre-existing rows from before the column was added. */
  size: string | null;
  processingStatus:
    | "pending_upload" | "processing" | "needs_review" | "ready" | "failed";
  usableInOutfit: boolean;
  /** Pre-signed URL (user_photo) or public product CDN URL (certified). */
  thumbUrl: string | null;
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
      size: true,
      processingStatus: true,
      processedAssetPath: true,
      frontImagePath: true,
      createdAt: true,
      product: { select: { imageUrl: true } },
    },
  });

  // Collect every user_photo bucket path that needs a signed URL, then
  // batch-sign them all in ONE Supabase round-trip. Previously each
  // WardrobeCard fired its own /api/wardrobe/items/thumb fetch — N+1 from
  // the client AND N+1 from us calling Supabase, which is the actual
  // rate-limit risk. One bulk call replaces both.
  const pathsToSign: string[] = [];
  for (const r of rows) {
    if (r.sourceType !== "user_photo") continue;
    const p = r.processedAssetPath ?? r.frontImagePath;
    if (p) pathsToSign.push(p);
  }
  const signed = await getSignedWardrobeUrls(pathsToSign);

  return rows.map((r) => {
    // Pick the best available thumbnail source:
    //   1. processed asset (background-removed, prettiest)
    //   2. raw front photo (user_photo fallback while processing finishes)
    //   3. product image URL (certified items linked to brand catalog)
    let thumbUrl: string | null = null;
    if (r.sourceType === "user_photo") {
      const path = r.processedAssetPath ?? r.frontImagePath ?? null;
      thumbUrl = path ? signed.get(path) ?? null : null;
    } else {
      thumbUrl = r.product?.imageUrl ?? null;
    }

    return {
      id: r.id,
      sourceType: r.sourceType,
      category: r.category,
      subcategory: r.subcategory,
      color: r.color,
      brand: r.brand,
      nickname: r.nickname,
      size: r.size,
      processingStatus: r.processingStatus,
      usableInOutfit: r.processingStatus === "ready",
      thumbUrl,
      createdAt: r.createdAt,
    };
  });
}
