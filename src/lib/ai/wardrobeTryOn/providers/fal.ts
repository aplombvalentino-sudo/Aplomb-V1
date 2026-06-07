import "server-only";

/**
 * fal.ai provider for the wardrobe-driven outfit try-on.
 *
 * Strategy: chain FASHN (`fashn/tryon/v1.x`) calls — one per garment.
 * FASHN only swaps a single garment per call; multi-item outfits are
 * built by feeding each call's output back in as the next call's model
 * image. Apply order matters for visual correctness:
 *
 *     1. bottom      (start with the trousers/skirt swap)
 *     2. top         (then the t-shirt/shirt/sweater)
 *     3. outerwear   (jacket overlays the top last)
 *
 * Shoes + accessories aren't categorised by FASHN — they show in the
 * items strip on the result page but the rendered body keeps the
 * shoes/accessories from the original selfie. Acceptable for v1; a
 * future multi-garment fal model (or an accessory pass) can extend this.
 *
 * fal.ai expects PUBLIC URLs for the model + garment images, not bytes.
 * The provider therefore uploads selfie + each garment to fal's own
 * storage (`fal.storage.upload`) before each FASHN call — this returns
 * short-lived URLs that fal can fetch on its own infra. No data leaves
 * our control any earlier than it would for the Gemini provider.
 *
 * Cost expectation: ~$0.05 per FASHN call × N garments (1 for one-piece,
 * 2 for top+bottom, 3 with outerwear). The existing rate limiter
 * (LIMITS.tryon_minute + LIMITS.tryon_daily) covers the per-user cap.
 */

import { getFalClient } from "@/lib/ai/fal/client";
import {
  generateTryOnImage,
  type TryOnCategory as FashnCategory,
} from "@/lib/ai/fal/tryon";
import type { TryOnInput, TryOnItem, TryOnProvider, TryOnResult } from "../types";

/** Apply garments bottom-up — outerwear last so it layers correctly. */
const APPLY_ORDER: string[] = [
  "bottom",
  "top",
  "outerwear",
  "shoes",
  "accessory",
];

/** Categories FASHN actually swaps. Anything else gets skipped (kept in
 *  the items strip but not rendered onto the body). */
const FASHN_GARMENT_POSITIONS = new Set([
  "top",
  "bottom",
  "outerwear",
  "fullbody",
  "dress",
]);

function positionToFashnCategory(position: string): FashnCategory {
  if (position === "top" || position === "outerwear") return "tops";
  if (position === "bottom") return "bottoms";
  // dress, fullbody, anything else → treated as one-piece.
  return "one-pieces";
}

/** Wrap a Buffer in a File so fal.storage.upload accepts it. */
function bufferToFile(buf: Buffer, mime: string, namePrefix: string): File {
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  return new File([new Uint8Array(buf)], `${namePrefix}.${ext}`, { type: mime });
}

async function uploadToFal(
  fal: ReturnType<typeof getFalClient>,
  buffer: Buffer,
  mime: string,
  namePrefix: string,
): Promise<string> {
  const file = bufferToFile(buffer, mime, namePrefix);
  return await fal.storage.upload(file);
}

export const falTryOnProvider: TryOnProvider = {
  name: "fal",

  async generate(input: TryOnInput): Promise<TryOnResult> {
    if (!process.env.FAL_KEY) {
      return {
        success: false,
        reason: "fal.ai provider not configured. Set FAL_KEY in env.",
      };
    }

    let fal: ReturnType<typeof getFalClient>;
    try {
      fal = getFalClient();
    } catch (e) {
      return {
        success: false,
        reason:
          e instanceof Error ? e.message : "Failed to initialise fal.ai client.",
      };
    }

    // Sort items into apply order so outerwear paints last.
    const sortedItems: TryOnItem[] = [...input.items].sort((a, b) => {
      const ai = APPLY_ORDER.indexOf(a.position);
      const bi = APPLY_ORDER.indexOf(b.position);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    // Filter to only the items FASHN can actually swap. Empty pass-through
    // means nothing to render onto the body — bail with a clear reason.
    const garments = sortedItems.filter((it) =>
      FASHN_GARMENT_POSITIONS.has(it.position),
    );
    if (garments.length === 0) {
      return {
        success: false,
        reason:
          "Pick at least one piece in a top, bottom, dress or outerwear slot — shoes and accessories alone can't be rendered onto the body yet.",
      };
    }

    try {
      // Stage 0: upload the selfie. The output URL becomes the starting
      // "model image" for the FASHN chain.
      let currentImageUrl = await uploadToFal(
        fal,
        input.selfieBuffer,
        input.selfieMime,
        "selfie",
      );

      // Stage 1..N: apply each garment in apply-order. Each FASHN call
      // returns a hosted URL — feed it back in as the next model_image.
      for (let i = 0; i < garments.length; i++) {
        const item = garments[i]!;
        const garmentUrl = await uploadToFal(
          fal,
          item.imageBuffer,
          item.imageMime,
          `garment-${item.position}-${i}`,
        );
        const result = await generateTryOnImage({
          modelImageUrl: currentImageUrl,
          garmentImageUrl: garmentUrl,
          category: positionToFashnCategory(item.position),
        });
        currentImageUrl = result.imageUrl;
      }

      // Stage N+1: download the final composed image into a Buffer so the
      // orchestrator can store it in our private bucket. fal-hosted URLs
      // are time-limited; we want a permanent copy on our side.
      const res = await fetch(currentImageUrl, { cache: "no-store" });
      if (!res.ok) {
        return {
          success: false,
          reason: `Failed to download final try-on image (HTTP ${res.status}).`,
        };
      }
      const imageBuffer = Buffer.from(await res.arrayBuffer());
      const imageMime = res.headers.get("content-type") ?? "image/png";

      return {
        success: true,
        imageBuffer,
        imageMime,
        providerMeta: {
          model: "fashn/tryon/v1.6",
          garmentCalls: garments.length,
          skipped: sortedItems.length - garments.length,
        },
      };
    } catch (e) {
      console.error("[wardrobeTryOn.fal] generate failed", e);
      // FAL surfaces useful detail in `e.message` — keep a short slice so
      // the user can act (e.g. "credits exhausted", "invalid image", etc.).
      const reason =
        e instanceof Error
          ? `fal.ai try-on failed: ${e.message.slice(0, 200)}`
          : "fal.ai try-on failed.";
      return { success: false, reason };
    }
  },
};
