/**
 * Outfit recommendation via Gemini.
 *
 * The prompt is the contract:
 *   - the model may only pick items from the supplied catalog (by id),
 *   - the output must be valid JSON matching `OutfitResponse`,
 *   - the model is told to write a short, fashion-literate rationale.
 *
 * We use Gemini's JSON mode (`responseMimeType: "application/json"`) so the
 * raw string is parseable without regex scrubbing.
 */

import { getGeminiClient, GEMINI_MODEL } from "./client";
import type { NormalizedMeasurements } from "@/lib/ai/measurementProvider";

// ─── Types ──────────────────────────────────────────────────────────────────

export type CatalogProductInput = {
  id: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  tags: string[];
  variants: Array<{ id: string; sizeLabel: string | null; color: string | null }>;
};

export type OutfitRequest = {
  brandName: string;
  catalog: CatalogProductInput[];
  measurements: NormalizedMeasurements;
  bodyShapeSummary: string | null;
  occasion?: string;
  stylePreference?: string;
  colorPalette?: string;
  maxOutfits?: number;
};

export type GeneratedOutfitItem = {
  productId: string;
  productVariantId?: string;
  position: "top" | "bottom" | "outerwear" | "shoes" | "accessory" | "fullbody";
  isRequired?: boolean;
};

export type GeneratedOutfit = {
  title: string;
  description?: string;
  rationale: string;
  items: GeneratedOutfitItem[];
};

export type OutfitResponse = {
  outfits: GeneratedOutfit[];
};

// ─── Prompt builder ─────────────────────────────────────────────────────────

function buildPrompt(req: OutfitRequest): string {
  const styleLine = req.stylePreference ? `Style: ${req.stylePreference}.` : "";
  const occasionLine = req.occasion ? `Occasion: ${req.occasion}.` : "";
  const colorLine = req.colorPalette ? `Preferred colour palette: ${req.colorPalette}.` : "";
  const max = Math.min(3, Math.max(1, req.maxOutfits ?? 3));

  const measurementLine = req.bodyShapeSummary
    ? `Shopper measurements: ${req.bodyShapeSummary}.`
    : "Shopper measurements: not disclosed.";

  // Compact catalog representation
  const catalogLines = req.catalog
    .map((p) => {
      const variantsStr = p.variants
        .filter((v) => v.sizeLabel)
        .slice(0, 8)
        .map((v) => `${v.id}:${v.sizeLabel}${v.color ? `/${v.color}` : ""}`)
        .join(", ");
      return `- id=${p.id} | category=${p.category ?? "?"} | "${p.name}" | variants=[${variantsStr}]`;
    })
    .join("\n");

  return `You are a senior stylist building looks for ${req.brandName}.

${measurementLine}
${styleLine} ${occasionLine} ${colorLine}

Catalog (you may ONLY use these productId values):
${catalogLines}

Build between 1 and ${max} complete outfits. Each outfit must:
- combine 2 to 5 items
- include at least one top and one bottom OR one full-body piece
- only reference productId values from the catalog above
- pick reasonable productVariantId values when available
- use precise positions: top | bottom | outerwear | shoes | accessory | fullbody
- carry a short stylist rationale (1–2 sentences, fashion-literate, no fluff)

Return STRICT JSON exactly matching this TypeScript type, nothing else:

type Response = {
  outfits: Array<{
    title: string;            // 2–5 words
    description?: string;     // optional one-line tagline
    rationale: string;        // 1–2 sentences, why this works for the shopper
    items: Array<{
      productId: string;
      productVariantId?: string;
      position: "top" | "bottom" | "outerwear" | "shoes" | "accessory" | "fullbody";
      isRequired?: boolean;
    }>;
  }>;
};`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function generateOutfitsWithGemini(req: OutfitRequest): Promise<OutfitResponse> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
    },
  });

  const prompt = buildPrompt(req);
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let parsed: OutfitResponse;
  try {
    parsed = JSON.parse(text) as OutfitResponse;
  } catch {
    throw new Error("Gemini returned non-JSON content; outfit generation failed.");
  }

  if (!parsed.outfits || !Array.isArray(parsed.outfits)) {
    throw new Error("Gemini response missing 'outfits' array.");
  }

  // Guard against hallucinated productIds — drop any item not in the catalog.
  const validIds = new Set(req.catalog.map((p) => p.id));
  const validVariantIds = new Set(req.catalog.flatMap((p) => p.variants.map((v) => v.id)));

  for (const o of parsed.outfits) {
    o.items = (o.items ?? []).filter((it) => validIds.has(it.productId));
    o.items = o.items.map((it) => ({
      ...it,
      productVariantId:
        it.productVariantId && validVariantIds.has(it.productVariantId)
          ? it.productVariantId
          : undefined,
    }));
  }

  parsed.outfits = parsed.outfits.filter((o) => o.items.length >= 2);
  return parsed;
}
