import "server-only";

/**
 * Brand catalog snapshot for the AI Outfit Assistant — the Model plan's
 * cross-brand recommendation source.
 *
 * Returns a compact, prompt-friendly array of active brand products across
 * the platform. Sampled across brands so a single dominant catalog can't
 * crowd everything else out (the model would otherwise only ever
 * recommend pieces from the largest brand). 5 products per brand × all
 * active brands, capped at 120 total so the prompt stays under Gemini's
 * input limit even at scale.
 *
 * Fashion + Essential plans NEVER reach this helper — the chat route
 * gates it behind `limits.crossBrandRecommendations`.
 */

import { db } from "@/lib/db";

export type BrandCatalogEntry = {
  id: string;
  name: string;
  brand: string;
  brandSlug: string;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  imageUrl: string | null;
};

const MAX_TOTAL = 120;
const MAX_PER_BRAND = 5;

export async function listBrandCatalogForChat(): Promise<BrandCatalogEntry[]> {
  // One query per brand keeps the per-brand cap clean. With small N
  // (active brands typically dozens at platform scale, hundreds tops)
  // this is fine — we cache nothing today because the catalog mutates.
  // Brand model has no isActive flag — listing all brands is fine, the
  // per-brand product query below filters to `isActive: true` products
  // so an empty / dormant brand contributes zero entries.
  const brands = await db.brand.findMany({
    select: { id: true, name: true, slug: true },
  });
  if (brands.length === 0) return [];

  const productsByBrand = await Promise.all(
    brands.map(async (b) => {
      const products = await db.product.findMany({
        where: { brandId: b.id, isActive: true },
        orderBy: { updatedAt: "desc" },
        take: MAX_PER_BRAND,
        select: {
          id: true,
          name: true,
          category: true,
          subcategory: true,
          description: true,
          imageUrl: true,
        },
      });
      return products.map((p) => ({
        id: p.id,
        name: p.name,
        brand: b.name,
        brandSlug: b.slug,
        category: p.category,
        subcategory: p.subcategory,
        description: p.description,
        imageUrl: p.imageUrl,
      }));
    }),
  );

  // Interleave by brand so the prompt is balanced even after truncation
  // — round-robin pop one from each brand list until empty or capped.
  const queues = productsByBrand.map((p) => [...p]);
  const out: BrandCatalogEntry[] = [];
  let cursor = 0;
  let safetyCounter = MAX_TOTAL * 4;
  while (out.length < MAX_TOTAL && safetyCounter-- > 0) {
    let dequeued = 0;
    for (let i = 0; i < queues.length && out.length < MAX_TOTAL; i++) {
      const q = queues[(cursor + i) % queues.length]!;
      const next = q.shift();
      if (next) {
        out.push(next);
        dequeued++;
      }
    }
    if (dequeued === 0) break; // all queues drained
    cursor = (cursor + 1) % queues.length;
  }
  return out;
}
