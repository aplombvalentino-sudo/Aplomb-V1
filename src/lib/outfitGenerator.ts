/**
 * Pluggable outfit generation module.
 *
 * This module is the ONLY place that builds outfit recommendations.
 * callStylistLLM() is the seam for real LLM integration.
 *
 * Environment variables (add to .env):
 *   STYLIST_LLM_PROVIDER=stub|anthropic|openai
 *   STYLIST_LLM_API_KEY=<key>
 *   STYLIST_LLM_MODEL=<model-id>
 */

import { db } from "@/lib/db";
import type { MeasurementResponse } from "@/lib/measurementProvider";

export type OutfitGenerationInput = {
  brandId: string;
  bodyProfile: MeasurementResponse & { bodyShapeSummary?: string };
  context?: {
    occasion?: string;
    stylePreferences?: string[];
    maxItems?: number;
  };
};

export type OutfitItem = {
  productId: string;
  productVariantId?: string;
  position: "top" | "bottom" | "outerwear" | "shoes" | "accessory" | "fullbody";
};

export type GeneratedOutfit = {
  title: string;
  description: string;
  rationale: string;
  items: OutfitItem[];
};

export type OutfitGenerationOutput = {
  outfits: GeneratedOutfit[];
};

// ─── LLM seam ────────────────────────────────────────────────────────────────

type LLMInput = {
  bodyProfile: MeasurementResponse & { bodyShapeSummary?: string };
  candidateProducts: Array<{
    id: string;
    name: string;
    category: string | null;
    variantId?: string;
    sizeLabel?: string | null;
  }>;
  context?: OutfitGenerationInput["context"];
};

async function callStylistLLM(input: LLMInput): Promise<string> {
  const provider = process.env.STYLIST_LLM_PROVIDER ?? "stub";

  if (provider !== "stub") {
    // TODO: implement real LLM call
    // const apiKey = process.env.STYLIST_LLM_API_KEY;
    // const model = process.env.STYLIST_LLM_MODEL ?? 'claude-sonnet-4-6';
    // Call Anthropic/OpenAI with a fashion-stylist system prompt
    throw new Error(`LLM provider "${provider}" not yet implemented`);
  }

  // Stub: deterministic rationale text
  const occasion = input.context?.occasion ?? "everyday";
  const waist = input.bodyProfile.measurements.waist ?? 78;
  const chest = input.bodyProfile.measurements.chest ?? 94;

  return (
    `Based on your measurements (chest ${chest} cm, waist ${waist} cm), ` +
    `these pieces are carefully selected to fit your body proportions for a ${occasion} look. ` +
    `Each item is sized to complement your silhouette and provide comfort throughout the day.`
  );
}

// ─── Core generation logic ────────────────────────────────────────────────────

export async function generateOutfits(
  input: OutfitGenerationInput
): Promise<OutfitGenerationOutput> {
  const { brandId, bodyProfile, context } = input;
  const maxOutfits = 3;

  // Load active products for the brand
  const products = await db.product.findMany({
    where: { brandId, isActive: true },
    include: {
      variants: {
        where: { stockStatus: { not: "outOfStock" } },
        take: 1,
        orderBy: { sizeLabel: "asc" },
      },
    },
    take: 50,
  });

  if (products.length === 0) {
    return { outfits: [] };
  }

  // Categorise products
  const tops = products.filter((p) =>
    ["top", "shirt", "blouse", "tshirt", "sweater", "jacket"].some((k) =>
      p.category?.toLowerCase().includes(k)
    )
  );
  const bottoms = products.filter((p) =>
    ["bottom", "pant", "jean", "skirt", "short", "trouser"].some((k) =>
      p.category?.toLowerCase().includes(k)
    )
  );
  const shoes = products.filter((p) =>
    ["shoe", "sneaker", "boot", "sandal"].some((k) =>
      p.category?.toLowerCase().includes(k)
    )
  );
  const accessories = products.filter((p) =>
    ["accessory", "bag", "hat", "belt", "scarf"].some((k) =>
      p.category?.toLowerCase().includes(k)
    )
  );

  // Fallback: if no categorised items, use all products
  const fallback = products.slice(0, 3);
  const topPool = tops.length > 0 ? tops : fallback.slice(0, 1);
  const bottomPool = bottoms.length > 0 ? bottoms : fallback.slice(1, 2);
  const shoePool = shoes.length > 0 ? shoes : fallback.slice(2, 3);

  const outfits: GeneratedOutfit[] = [];

  for (let i = 0; i < Math.min(maxOutfits, topPool.length); i++) {
    const top = topPool[i % topPool.length];
    const bottom = bottomPool[i % Math.max(bottomPool.length, 1)];
    const shoe = shoePool[i % Math.max(shoePool.length, 1)];
    const accessory = accessories[i % Math.max(accessories.length, 1)];

    const candidateProducts = [top, bottom, shoe, accessory]
      .filter(Boolean)
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        variantId: p.variants[0]?.id,
        sizeLabel: p.variants[0]?.sizeLabel,
      }));

    const rationale = await callStylistLLM({
      bodyProfile,
      candidateProducts,
      context,
    });

    const items: OutfitItem[] = [];
    if (top) {
      items.push({
        productId: top.id,
        productVariantId: top.variants[0]?.id,
        position: "top",
      });
    }
    if (bottom) {
      items.push({
        productId: bottom.id,
        productVariantId: bottom.variants[0]?.id,
        position: "bottom",
      });
    }
    if (shoe) {
      items.push({
        productId: shoe.id,
        productVariantId: shoe.variants[0]?.id,
        position: "shoes",
      });
    }
    if (accessory && (context?.maxItems ?? 4) >= 4) {
      items.push({
        productId: accessory.id,
        productVariantId: accessory.variants[0]?.id,
        position: "accessory",
      });
    }

    outfits.push({
      title: `Look ${i + 1}${context?.occasion ? ` — ${context.occasion}` : ""}`,
      description: `A ${context?.occasion ?? "versatile"} outfit built from ${candidateProducts.map((p) => p.name).join(", ")}.`,
      rationale,
      items,
    });
  }

  return { outfits };
}
