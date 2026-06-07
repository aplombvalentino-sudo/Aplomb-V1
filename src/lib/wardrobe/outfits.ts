import "server-only";

import { db } from "@/lib/db";
import { getSignedWardrobeUrls } from "@/lib/wardrobe/storage";
import { getSignedTryonUrls, getSignedTryonUrl } from "@/lib/wardrobe/tryonStorage";

/**
 * Wardrobe-driven outfit storage. Each outfit belongs to the user, references
 * one-to-many WardrobeItems, and carries a free-form title + optional
 * occasion. Lives next to lib/wardrobe/items.ts so the new wardrobe-first
 * surface has one coherent home for its server logic.
 */

// ─── List helpers ────────────────────────────────────────────────────────────

export type WardrobeOutfitGenerationStatus =
  | "none" | "pending" | "generating" | "ready" | "failed";

export type WardrobeOutfitListEntry = {
  id: string;
  title: string;
  occasion: string | null;
  createdAt: Date;
  /** Pre-signed URL of the AI-generated image (null until status === ready). */
  generatedImageUrl: string | null;
  generationStatus: WardrobeOutfitGenerationStatus;
  items: Array<{
    id: string;             // outfit-item row id
    position: string;
    wardrobeItemId: string;
    category: string;
    nickname: string | null;
    brand: string | null;
    sourceType: "certified" | "user_photo";
    /** Pre-signed URL (user_photo) or public product CDN URL (certified). */
    thumbUrl: string | null;
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

  // Batch-sign every user_photo path referenced anywhere in the outfit list,
  // so /app/outfits doesn't fire one Supabase round-trip per outfit-item
  // thumbnail. Paths are de-duped inside getSignedWardrobeUrls.
  const pathsToSign: string[] = [];
  for (const o of rows) {
    for (const oi of o.items) {
      if (oi.wardrobeItem.sourceType !== "user_photo") continue;
      const p =
        oi.wardrobeItem.processedAssetPath ?? oi.wardrobeItem.frontImagePath;
      if (p) pathsToSign.push(p);
    }
  }
  const signed = await getSignedWardrobeUrls(pathsToSign);

  // Same batch-sign trick for the AI-generated outfit hero images — one
  // Supabase call covers the whole list page.
  const tryonPaths = rows
    .map((o) => o.generatedImagePath)
    .filter((p): p is string => Boolean(p));
  const signedTryon = await getSignedTryonUrls(tryonPaths);

  return rows.map((o) => ({
    id: o.id,
    title: o.title,
    occasion: o.occasion,
    createdAt: o.createdAt,
    generatedImageUrl: o.generatedImagePath
      ? signedTryon.get(o.generatedImagePath) ?? null
      : null,
    generationStatus: o.generationStatus as WardrobeOutfitGenerationStatus,
    items: o.items.map((oi) => {
      const wi = oi.wardrobeItem;
      let thumbUrl: string | null = null;
      if (wi.sourceType === "user_photo") {
        const path = wi.processedAssetPath ?? wi.frontImagePath ?? null;
        thumbUrl = path ? signed.get(path) ?? null : null;
      } else {
        thumbUrl = wi.product?.imageUrl ?? null;
      }
      return {
        id: oi.id,
        position: oi.position,
        wardrobeItemId: oi.wardrobeItemId,
        category: wi.category,
        nickname: wi.nickname,
        brand: wi.brand,
        sourceType: wi.sourceType,
        thumbUrl,
      };
    }),
  }));
}

// ─── Single outfit (detail view) ─────────────────────────────────────────────

export type WardrobeOutfitDetail = WardrobeOutfitListEntry & {
  /** Pre-signed URL of the user's selfie, used for "remix this with a
   *  new selfie" UI. Null when the outfit was created without a selfie
   *  (legacy outfits saved before AI try-on shipped). */
  selfieImageUrl: string | null;
  generationError: string | null;
  generationProvider: string | null;
};

/** Fetch one outfit and sign all its display URLs. Returns null when the
 *  outfit doesn't exist OR isn't owned by this user (single check for both
 *  so we don't leak existence). */
export async function getWardrobeOutfit(
  userId: string,
  outfitId: string,
): Promise<WardrobeOutfitDetail | null> {
  const o = await db.wardrobeOutfit.findFirst({
    where: { id: outfitId, userId },
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
  if (!o) return null;

  // Sign item thumbs (user_photo only).
  const itemPathsToSign = o.items
    .map((oi) => {
      if (oi.wardrobeItem.sourceType !== "user_photo") return null;
      return oi.wardrobeItem.processedAssetPath ?? oi.wardrobeItem.frontImagePath ?? null;
    })
    .filter((p): p is string => Boolean(p));
  const signedItems = await getSignedWardrobeUrls(itemPathsToSign);

  // Sign selfie + generated independently — each is one round-trip, and
  // they're small, so we don't bother with batching here.
  const [selfieUrl, generatedUrl] = await Promise.all([
    o.selfieImagePath ? safeSignTryon(o.selfieImagePath) : Promise.resolve(null),
    o.generatedImagePath ? safeSignTryon(o.generatedImagePath) : Promise.resolve(null),
  ]);

  return {
    id: o.id,
    title: o.title,
    occasion: o.occasion,
    createdAt: o.createdAt,
    generatedImageUrl: generatedUrl,
    generationStatus: o.generationStatus as WardrobeOutfitGenerationStatus,
    generationError: o.generationError,
    generationProvider: o.generationProvider,
    selfieImageUrl: selfieUrl,
    items: o.items.map((oi) => {
      const wi = oi.wardrobeItem;
      let thumbUrl: string | null = null;
      if (wi.sourceType === "user_photo") {
        const path = wi.processedAssetPath ?? wi.frontImagePath ?? null;
        thumbUrl = path ? signedItems.get(path) ?? null : null;
      } else {
        thumbUrl = wi.product?.imageUrl ?? null;
      }
      return {
        id: oi.id,
        position: oi.position,
        wardrobeItemId: oi.wardrobeItemId,
        category: wi.category,
        nickname: wi.nickname,
        brand: wi.brand,
        sourceType: wi.sourceType,
        thumbUrl,
      };
    }),
  };
}

async function safeSignTryon(path: string): Promise<string | null> {
  try {
    return await getSignedTryonUrl(path);
  } catch (e) {
    console.warn("[outfits] selfie/generated sign failed:", e instanceof Error ? e.message : e);
    return null;
  }
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
