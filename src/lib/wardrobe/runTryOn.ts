import "server-only";

/**
 * Server-side orchestration for the wardrobe-driven try-on:
 *   1. Verifies item ownership + extracts each item's reference image.
 *   2. Uploads the selfie to the private outfit-tryons bucket.
 *   3. Calls the active try-on provider with the selfie + item bytes.
 *   4. Uploads the generated image back to the bucket.
 *   5. Updates the WardrobeOutfit row in place.
 *
 * Pure server module — never imported from client. Called by the two routes:
 *   - POST /api/outfits/wardrobe/try-on        (create+generate atomic)
 *   - POST /api/outfits/wardrobe/[id]/regenerate (regenerate existing)
 *
 * Failure handling: any error inside the AI step flips the outfit row to
 * `generation_status = 'failed'` with a scrubbed reason on `generationError`.
 * The caller can then read the row and surface a clean UI message.
 */

import { db } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { WARDROBE_BUCKET } from "@/lib/wardrobe/storage";
import {
  uploadOutfitTryonObject,
  buildSelfiePath,
  buildGeneratedPath,
} from "@/lib/wardrobe/tryonStorage";
import { getActiveTryOnProvider, type TryOnItem } from "@/lib/ai/wardrobeTryOn";

/** Truncate / sanitise the provider's reason before persisting.
 *
 *  Previously the path-scrubbing regex was aggressive enough to swallow
 *  model ids and URL fragments that are actually useful for diagnosis
 *  (e.g. "gemini-2.0-flash-exp:generateContent" was being replaced with
 *  "<path>"). The provider already returns a short user-readable message
 *  in most cases — we just strip credential-shaped tokens here, not URL
 *  paths. */
function sanitiseReason(input: string): string {
  const cleaned = input
    // OpenAI-style keys (sk-xxx, paranoia even though we don't use OpenAI)
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "<redacted>")
    // JWTs / Supabase service-role tokens
    .replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "<redacted>")
    // Google API keys in query strings ("?key=AIzaSy...")
    .replace(/([?&]key=)[A-Za-z0-9_-]+/gi, "$1<redacted>")
    // Authorization Bearer tokens
    .replace(/(Bearer\s+)[A-Za-z0-9._-]{12,}/gi, "$1<redacted>");
  return cleaned.slice(0, 480);
}

/** Pull the reference image bytes for one wardrobe item. */
async function fetchItemImage(item: {
  sourceType: "certified" | "user_photo";
  processedAssetPath: string | null;
  frontImagePath: string | null;
  product: { imageUrl: string | null } | null;
}): Promise<{ buffer: Buffer; mime: string }> {
  if (item.sourceType === "certified") {
    const url = item.product?.imageUrl;
    if (!url) throw new Error("Certified item missing product image URL.");
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch certified item image (${res.status}).`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    return { buffer, mime };
  }

  const path = item.processedAssetPath ?? item.frontImagePath;
  if (!path) throw new Error("user_photo item missing a stored image path.");
  const svc = getSupabaseServiceClient();
  const { data, error } = await svc.storage.from(WARDROBE_BUCKET).download(path);
  if (error || !data) {
    throw new Error(`Failed to download user_photo item: ${error?.message ?? "unknown"}`);
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  const mime = data.type || "image/jpeg";
  return { buffer, mime };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export type RunTryOnArgs = {
  userId: string;
  outfitId: string;
  selfie: {
    buffer: Buffer;
    mime: string;
  };
};

export type RunTryOnResult =
  | { ok: true; selfiePath: string; generatedPath: string; provider: string }
  | { ok: false; reason: string };

/**
 * Run the try-on pipeline against an existing WardrobeOutfit row. Caller is
 * responsible for creating the row + verifying ownership BEFORE calling
 * this function — we trust the (userId, outfitId) pair to be authorised.
 *
 * On success: row.generationStatus → 'ready'; paths set; provider stamped.
 * On failure: row.generationStatus → 'failed'; reason captured.
 */
export async function runWardrobeTryOn(
  args: RunTryOnArgs,
): Promise<RunTryOnResult> {
  const { userId, outfitId, selfie } = args;

  // Mark the row as generating BEFORE any heavy work, so a concurrent
  // dashboard view sees the spinner.
  await db.wardrobeOutfit.update({
    where: { id: outfitId },
    data: { generationStatus: "generating", generationError: null },
  });

  // Pull the items + the outfit's snapshotted height in one query each.
  const [outfitItems, outfitMeta] = await Promise.all([
    db.wardrobeOutfitItem.findMany({
      where: { outfitId, outfit: { userId } },
      orderBy: { createdAt: "asc" },
      include: {
        wardrobeItem: {
          select: {
            sourceType: true,
            processedAssetPath: true,
            frontImagePath: true,
            category: true,
            nickname: true,
            brand: true,
            product: { select: { imageUrl: true } },
          },
        },
      },
    }),
    db.wardrobeOutfit.findUnique({
      where: { id: outfitId },
      select: { userHeightCm: true },
    }),
  ]);
  if (outfitItems.length === 0) {
    await markFailed(outfitId, "Outfit has no items to try on.");
    return { ok: false, reason: "Outfit has no items to try on." };
  }

  // Fetch every item image in parallel. One failure aborts the run.
  // `size` is taken from the OUTFIT-ITEM row (a snapshot at build time),
  // NOT the live wardrobe item, so re-rendering an old outfit uses the
  // historical size even if the user has since edited the piece.
  let itemPayloads: TryOnItem[];
  try {
    const fetched = await Promise.all(
      outfitItems.map(async (oi) => {
        const wi = oi.wardrobeItem;
        const { buffer, mime } = await fetchItemImage(wi);
        return {
          imageBuffer: buffer,
          imageMime: mime,
          position: oi.position,
          category: wi.category ?? undefined,
          label: wi.nickname ?? wi.brand ?? undefined,
          size: oi.size,
        } satisfies TryOnItem;
      }),
    );
    itemPayloads = fetched;
  } catch (e) {
    const reason = sanitiseReason(e instanceof Error ? e.message : "Item fetch failed.");
    await markFailed(outfitId, reason);
    return { ok: false, reason };
  }

  // Upload the selfie BEFORE calling the AI — this way even if the AI call
  // dies the user's input photo is preserved on the row.
  const selfiePath = buildSelfiePath(userId, outfitId, selfie.mime);
  try {
    await uploadOutfitTryonObject(selfie.buffer, selfiePath, selfie.mime);
  } catch (e) {
    const reason = sanitiseReason(e instanceof Error ? e.message : "Selfie upload failed.");
    await markFailed(outfitId, reason);
    return { ok: false, reason };
  }
  await db.wardrobeOutfit.update({
    where: { id: outfitId },
    data: { selfieImagePath: selfiePath },
  });

  // Hand off to the active provider. userHeightCm is read off the
  // outfit row (snapshotted at create time) — see WardrobeOutfit docstring.
  const provider = getActiveTryOnProvider();
  const result = await provider.generate({
    selfieBuffer: selfie.buffer,
    selfieMime: selfie.mime,
    items: itemPayloads,
    userHeightCm: outfitMeta?.userHeightCm ?? null,
  });

  if (!result.success) {
    const reason = sanitiseReason(result.reason);
    await markFailed(outfitId, reason, provider.name);
    return { ok: false, reason };
  }

  // Upload the generated image, then flip status to ready.
  const generatedPath = buildGeneratedPath(userId, outfitId, result.imageMime);
  try {
    await uploadOutfitTryonObject(
      result.imageBuffer,
      generatedPath,
      result.imageMime,
    );
  } catch (e) {
    const reason = sanitiseReason(e instanceof Error ? e.message : "Generated image upload failed.");
    await markFailed(outfitId, reason, provider.name);
    return { ok: false, reason };
  }

  await db.wardrobeOutfit.update({
    where: { id: outfitId },
    data: {
      generatedImagePath: generatedPath,
      generationStatus: "ready",
      generationProvider: provider.name,
      generatedAt: new Date(),
      generationError: null,
    },
  });

  return { ok: true, selfiePath, generatedPath, provider: provider.name };
}

async function markFailed(
  outfitId: string,
  reason: string,
  provider?: string,
): Promise<void> {
  await db.wardrobeOutfit
    .update({
      where: { id: outfitId },
      data: {
        generationStatus: "failed",
        generationError: reason,
        ...(provider ? { generationProvider: provider } : {}),
      },
    })
    .catch(() => null);
}
