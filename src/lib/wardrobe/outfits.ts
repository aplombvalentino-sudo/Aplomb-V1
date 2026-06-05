import "server-only";

import { db } from "@/lib/db";

/**
 * Wardrobe-driven outfit storage. Each outfit belongs to the user, references
 * one-to-many WardrobeItems, and carries a free-form title + optional
 * occasion. Lives next to lib/wardrobe/items.ts so the new wardrobe-first
 * surface has one coherent home for its server logic.
 */

// ─── List helpers ────────────────────────────────────────────────────────────

export type WardrobeOutfitListEntry = {
  id: string;
  title: string;
  occasion: string | null;
  createdAt: Date;
  items: Array<{
    id: string;             // outfit-item row id
    position: string;
    wardrobeItemId: string;
    category: string;
    nickname: string | null;
    brand: string | null;
    sourceType: "certified" | "user_photo";
    thumbPath: string | null;
  }>;
};

export async function listWardrobeOutfits(
  userId: string,
): Promise<WardrobeOutfitListEntry[]> {
  const rows = await db.wardrobeOutfit.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          wardrobeItem: {
            select: {
              id: true,
              category: true,
              nickname: true,
              brand: true,
              sourceType: true,
              processedAssetPath: true,
              frontImagePath: true,
              product: { select: { imageUrl: true } },
            },
          },
        },
      },
    },
  });

  return rows.map((o) => ({
    id: o.id,
    title: o.title,
    occasion: o.occasion,
    createdAt: o.createdAt,
    items: o.items.map((oi) => ({
      id: oi.id,
      position: oi.position,
      wardrobeItemId: oi.wardrobeItemId,
      category: oi.wardrobeItem.category,
      nickname: oi.wardrobeItem.nickname,
      brand: oi.wardrobeItem.brand,
      sourceType: oi.wardrobeItem.sourceType,
      thumbPath:
        oi.wardrobeItem.processedAssetPath ??
        oi.wardrobeItem.frontImagePath ??
        oi.wardrobeItem.product?.imageUrl ??
        null,
    })),
  }));
}

// ─── Create input ────────────────────────────────────────────────────────────

export type CreateOutfitInput = {
  title: string;
  occasion?: string;
  items: Array<{ wardrobeItemId: string; position: string }>;
};

export type CreateOutfitResult =
  | { ok: true; id: string }
  | { ok: false; reason: "no_items" | "items_not_owned"; missingIds?: string[] };

/**
 * Create an outfit + its items in one transaction. Verifies every wardrobeItemId
 * actually belongs to the user — without this check, a hostile client could
 * stuff arbitrary item IDs into an outfit and the read endpoint would gladly
 * resolve them via the join.
 */
export async function createWardrobeOutfit(
  userId: string,
  input: CreateOutfitInput,
): Promise<CreateOutfitResult> {
  if (input.items.length === 0) {
    return { ok: false, reason: "no_items" };
  }

  // Ownership check — pull the user's actual wardrobe item IDs and compare.
  const userItemIds = await db.wardrobeItem.findMany({
    where: {
      userId,
      id: { in: input.items.map((i) => i.wardrobeItemId) },
    },
    select: { id: true },
  });
  const owned = new Set(userItemIds.map((r) => r.id));
  const missing = input.items
    .map((i) => i.wardrobeItemId)
    .filter((id) => !owned.has(id));
  if (missing.length > 0) {
    return { ok: false, reason: "items_not_owned", missingIds: missing };
  }

  const outfit = await db.$transaction(async (tx) => {
    const o = await tx.wardrobeOutfit.create({
      data: {
        userId,
        title: input.title,
        occasion: input.occasion,
      },
      select: { id: true },
    });
    await tx.wardrobeOutfitItem.createMany({
      data: input.items.map((i) => ({
        outfitId: o.id,
        wardrobeItemId: i.wardrobeItemId,
        position: i.position,
      })),
    });
    return o;
  });

  return { ok: true, id: outfit.id };
}
