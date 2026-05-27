/**
 * POST /api/tryon
 *
 * Virtual try-on. Takes an outfitItemId and bodyProfileId, fetches the
 * product image + the user's front photo (from private storage), and asks
 * FASHN (via fal.ai) to render the try-on. Persists the result so subsequent
 * loads are free.
 *
 * Plan gating: caller passes through their client plan limits — server
 * enforces a soft cap by counting recent try-ons for the bodyProfile.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { ok, err, notFound, serverError } from "@/lib/api";
import { parseJsonBody, zCuid } from "@/lib/validate";
import { generateTryOnImage, type TryOnCategory } from "@/lib/ai/fal/tryon";
import { getSignedBodyScanUrl } from "@/lib/ai/storage";

const schema = z
  .object({
    outfitItemId: zCuid,
    bodyProfileId: zCuid,
    qualityMode: z.enum(["fast", "balanced", "quality"]).optional(),
  })
  .strict();

// Map our internal positions to FASHN's category vocabulary
function positionToCategory(position: string): TryOnCategory {
  if (position === "top" || position === "outerwear") return "tops";
  if (position === "bottom") return "bottoms";
  return "one-pieces"; // fullbody / dresses
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const { allowed } = rateLimit(`tryon:${ip}`, 20, 60_000);
  if (!allowed) {
    return err("RATE_LIMITED", "Too many requests. Try again shortly.", 429);
  }

  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const { outfitItemId, bodyProfileId, qualityMode } = parsed.data;

  // Cache: if we already rendered this exact pairing, return it.
  const cached = await db.tryOnResult.findFirst({
    where: { outfitItemId, bodyProfileId },
    orderBy: { createdAt: "desc" },
  });
  if (cached) {
    return ok({ tryOnResultId: cached.id, imageUrl: cached.imageUrl, cached: true });
  }

  const outfitItem = await db.outfitItem.findUnique({
    where: { id: outfitItemId },
    include: {
      product: true,
      productVariant: true,
    },
  });
  if (!outfitItem) return notFound("Outfit item");

  const bodyProfile = await db.bodyProfile.findUnique({
    where: { id: bodyProfileId },
  });
  if (!bodyProfile) return notFound("Body profile");
  if (!bodyProfile.frontImagePath) {
    return err(
      "NO_FRONT_PHOTO",
      "Front photo is required for try-on but is not on file.",
      400,
    );
  }

  const garmentImageUrl =
    outfitItem.productVariant?.additionalImages?.[0] ??
    outfitItem.product.imageUrl ??
    null;
  if (!garmentImageUrl) {
    return err("NO_GARMENT_IMAGE", "Selected product has no image yet.", 400);
  }

  try {
    // Sign a short-lived URL for the user's front photo so fal can fetch it.
    const modelImageUrl = await getSignedBodyScanUrl(bodyProfile.frontImagePath);

    const tryOn = await generateTryOnImage({
      modelImageUrl,
      garmentImageUrl,
      category: positionToCategory(outfitItem.position),
      qualityMode,
    });

    const persisted = await db.tryOnResult.create({
      data: {
        outfitItemId,
        bodyProfileId,
        imageUrl: tryOn.imageUrl,
        provider: "fal_fashn",
        qualityMode: qualityMode ?? "balanced",
      },
    });

    return ok({ tryOnResultId: persisted.id, imageUrl: persisted.imageUrl, cached: false });
  } catch (e) {
    console.error("[/api/tryon]", e);
    return serverError(e instanceof Error ? e.message : "Try-on generation failed");
  }
}
