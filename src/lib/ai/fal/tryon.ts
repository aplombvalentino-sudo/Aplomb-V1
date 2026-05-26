/**
 * Virtual try-on via fal.ai FASHN.
 *
 * Reference: https://fal.ai/models/fashn/tryon (v1.5 / v1.6)
 *
 * Inputs require publicly-fetchable URLs for the model image (user's front
 * photo) and garment image (product). We sign short-lived URLs from Supabase
 * Storage and pass them through.
 */

import { getFalClient } from "./client";

export type TryOnCategory = "tops" | "bottoms" | "one-pieces";
export type TryOnQualityMode = "fast" | "balanced" | "quality";

const MODEL_ENDPOINT = process.env.FAL_FASHN_MODEL ?? "fashn/tryon/v1.6";

export type TryOnInput = {
  modelImageUrl: string;
  garmentImageUrl: string;
  category: TryOnCategory;
  qualityMode?: TryOnQualityMode;
};

export type TryOnOutput = {
  imageUrl: string;
  /** Raw provider payload — never returned to clients. */
  raw: unknown;
};

export async function generateTryOnImage(input: TryOnInput): Promise<TryOnOutput> {
  const fal = getFalClient();
  const mode = input.qualityMode ?? "balanced";

  // FASHN's input shape — see fal.ai docs. Keys may vary slightly per version;
  // these are accepted by v1.5/v1.6.
  const subscribePayload: Record<string, unknown> = {
    model_image: input.modelImageUrl,
    garment_image: input.garmentImageUrl,
    category: input.category,
    mode,
  };

  const result = await fal.subscribe(MODEL_ENDPOINT, {
    input: subscribePayload,
    logs: false,
  });

  const data = (result as { data?: unknown }).data ?? result;
  const imageUrl = extractImageUrl(data);

  if (!imageUrl) {
    throw new Error("FASHN response did not include an image URL.");
  }

  return { imageUrl, raw: data };
}

// FASHN sometimes returns `{ images: [{ url }] }`, sometimes `{ output: { image: { url } } }`.
// Probe the common shapes defensively.
function extractImageUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;

  const images = obj.images as Array<{ url?: string }> | undefined;
  if (Array.isArray(images) && images[0]?.url) return images[0].url;

  const output = obj.output as Record<string, unknown> | undefined;
  if (output) {
    const oImage = output.image as { url?: string } | string | undefined;
    if (typeof oImage === "string") return oImage;
    if (oImage?.url) return oImage.url;
    const oImages = output.images as Array<{ url?: string }> | undefined;
    if (Array.isArray(oImages) && oImages[0]?.url) return oImages[0].url;
  }

  const image = obj.image as { url?: string } | string | undefined;
  if (typeof image === "string") return image;
  if (image?.url) return image.url;

  return null;
}
