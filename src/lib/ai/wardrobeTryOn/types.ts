/**
 * Provider-agnostic types for the wardrobe-driven outfit try-on.
 *
 * This is the contract every try-on provider implements. Today we ship a
 * Gemini provider; tomorrow fal.ai's FASHN model (or anything else with the
 * same shape) drops in by adding a file in ./providers and flipping the
 * TRYON_PROVIDER env var.
 *
 * The function takes a selfie + N clothing item images and returns one
 * generated image of the user wearing them. No streaming, no partials —
 * one call, one image, OR a structured failure.
 *
 * It is deliberately distinct from `src/lib/ai/fal/tryon.ts`, which is the
 * single-garment brand-widget flow (one product onto a body-scan photo).
 * The wardrobe flow is multi-item and composed by the shopper, not by a
 * brand.
 */

export type TryOnItem = {
  /** Image bytes of the clothing piece (reference photo). */
  imageBuffer: Buffer;
  /** MIME type of imageBuffer, e.g. "image/jpeg". */
  imageMime: string;
  /** Logical slot the item occupies in the outfit: top, bottom, etc. */
  position: string;
  /** Free-form category label (hoodie, denim, sneakers, …). Helps the
   *  prompt; not enforced. */
  category?: string;
  /** Short human label for the item (e.g. nickname or product name). */
  label?: string;
};

export type TryOnInput = {
  /** Image bytes of the user's selfie / base photo. */
  selfieBuffer: Buffer;
  /** MIME type of selfieBuffer. */
  selfieMime: string;
  /** The clothing pieces to put on the user. Ordered top-down by convention
   *  (outerwear / top / bottom / shoes / accessory) — providers may use the
   *  order as a hint but mustn't depend on it for correctness. */
  items: TryOnItem[];
};

export type TryOnResult =
  | {
      success: true;
      /** Image bytes of the generated try-on. */
      imageBuffer: Buffer;
      /** MIME type the provider returned for the image. */
      imageMime: string;
      /** Provider-specific metadata kept server-side. NEVER returned to
       *  the client (could carry quota counters, request IDs, etc.). */
      providerMeta?: Record<string, unknown>;
    }
  | {
      success: false;
      /** Short, sanitised reason — safe to log + persist on the row. We
       *  never put a raw provider error here without scrubbing. */
      reason: string;
    };

export interface TryOnProvider {
  /** Stable name persisted on the WardrobeOutfit row for analytics + the
   *  ability to compare provider quality over time. */
  name: "gemini" | "fal";
  generate(input: TryOnInput): Promise<TryOnResult>;
}
