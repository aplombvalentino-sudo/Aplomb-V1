/**
 * Brand visibility, completeness, and discovery scoring.
 *
 * These functions drive:
 *  - the marketplace "Top Brands" carousel ordering
 *  - the brand's visibility badge (Featured / Standard / Dormant)
 *  - the onboarding completeness checklist
 *  - the discovery console (/pro/discovery)
 *
 * IMPORTANT BEHAVIOURAL RULES:
 *  - A paying brand is NEVER hidden because its monthly quota is exhausted.
 *    Quota exhaustion only removes featured priority — the brand stays
 *    searchable and accessible.
 *  - Dormant means unpublished / inactive, not "out of scans".
 */

import type { ProPlanLimits } from "@/lib/plans/proPlans";

// ─── Types ──────────────────────────────────────────────────────────────────

export type VisibilityStatus = "Featured" | "Standard" | "Dormant";

export type BrandCompletenessInput = {
  logoUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  longDescription?: string | null;
  activeProductCount: number;
  productsWithImagesCount: number;
  variantsCount: number;
  sizeChartCount: number;
  activeCollectionCount: number;
};

export type BrandCompletenessResult = {
  score: number;       // 0–100
  level: "Incomplete" | "Basic" | "Strong" | "Optimized";
  missing: string[];   // human-readable suggestions
};

export type BrandDiscoveryInput = {
  plan: ProPlanLimits;
  completenessScore: number;       // 0–100
  activeProductCount: number;
  activeCollectionCount: number;
  recentScans30d: number;
  monthlyExposureUsed: number;
  isPublished: boolean;
};

// ─── Completeness ───────────────────────────────────────────────────────────

const COMPLETENESS_WEIGHTS = {
  logo: 12,
  banner: 8,
  description: 8,
  longDescription: 6,
  activeProducts: 14,    // having any active products
  productImages: 14,     // having images on most products
  variants: 10,
  sizeCharts: 14,
  collections: 14,
} as const;

export function computeBrandCompletenessScore(
  input: BrandCompletenessInput,
): BrandCompletenessResult {
  let score = 0;
  const missing: string[] = [];

  if (input.logoUrl) score += COMPLETENESS_WEIGHTS.logo;
  else missing.push("Upload your brand logo");

  if (input.bannerUrl) score += COMPLETENESS_WEIGHTS.banner;
  else missing.push("Add a hero/banner image");

  if (input.description && input.description.length >= 20) score += COMPLETENESS_WEIGHTS.description;
  else missing.push("Write a short brand description");

  if (input.longDescription && input.longDescription.length >= 80) {
    score += COMPLETENESS_WEIGHTS.longDescription;
  } else missing.push("Add a longer brand story");

  if (input.activeProductCount > 0) score += COMPLETENESS_WEIGHTS.activeProducts;
  else missing.push("Add at least one active product");

  // % of products with images, scaled
  if (input.activeProductCount > 0) {
    const ratio = input.productsWithImagesCount / input.activeProductCount;
    score += Math.round(COMPLETENESS_WEIGHTS.productImages * Math.min(1, ratio));
    if (ratio < 0.8) missing.push("Add images to all products");
  }

  if (input.variantsCount > 0) score += COMPLETENESS_WEIGHTS.variants;
  else missing.push("Add product variants and sizes");

  if (input.sizeChartCount > 0) score += COMPLETENESS_WEIGHTS.sizeCharts;
  else missing.push("Upload size charts for each category");

  if (input.activeCollectionCount > 0) score += COMPLETENESS_WEIGHTS.collections;
  else missing.push("Create your first collection");

  score = Math.max(0, Math.min(100, score));

  const level: BrandCompletenessResult["level"] =
    score >= 90 ? "Optimized" :
    score >= 70 ? "Strong" :
    score >= 40 ? "Basic" : "Incomplete";

  return { score, level, missing };
}

// ─── Visibility status ──────────────────────────────────────────────────────

/**
 * Determines the visible badge a brand carries in the marketplace.
 *
 *  - Dormant: brand is unpublished / fully inactive (no active products).
 *  - Featured: brand is on Featured/Premier plan, completeness ≥ 70, quota not blown.
 *  - Standard: every other live brand (including Listed, and Featured brands
 *              whose monthly quota is exhausted).
 *
 * Quota exhaustion does NOT make a brand Dormant — it only drops the badge.
 */
export function getBrandVisibilityStatus(
  plan: ProPlanLimits,
  completenessScore: number,
  monthlyExposureUsed: number,
  isPublished: boolean,
): VisibilityStatus {
  if (!isPublished) return "Dormant";

  if (!plan.featuredEligibility) return "Standard";
  if (completenessScore < 70) return "Standard";

  const quotaExhausted =
    plan.monthlyExposureQuota !== Infinity &&
    monthlyExposureUsed >= plan.monthlyExposureQuota;
  if (quotaExhausted) return "Standard";

  return "Featured";
}

// ─── Discovery score (marketplace ranking) ──────────────────────────────────

/**
 * Weighted discovery score used to rank brands in the marketplace.
 *
 * Avoids letting one signal dominate — no single component is worth more
 * than ~30% of the total. This prevents biggest-brand-takes-all dynamics.
 *
 *  Plan boost          ≤ 25 pts
 *  Completeness        ≤ 25 pts (mapped from 0–100 score)
 *  Catalog depth       ≤ 15 pts
 *  Collection freshness ≤ 10 pts
 *  Engagement (30d)    ≤ 15 pts
 *  Quota health         ≤ 10 pts
 *  ────────────────────────────
 *  Total max          = 100 pts
 */
export function computeBrandDiscoveryScore(input: BrandDiscoveryInput): number {
  if (!input.isPublished) return 0;

  // Plan boost (capped)
  const planBoost =
    input.plan.id === "enterprise" ? 25 :
    input.plan.id === "pro" ? 18 : 8;

  // Completeness → up to 25 pts
  const completenessPts = Math.round((input.completenessScore / 100) * 25);

  // Catalog depth — diminishing returns past 30 active products
  const catalogPts = Math.min(15, Math.round(Math.log10(input.activeProductCount + 1) * 12));

  // Collection freshness — having at least one active collection is the gate
  const collectionPts =
    input.activeCollectionCount === 0 ? 0 :
    Math.min(10, 4 + input.activeCollectionCount);

  // Recent shopper engagement — diminishing returns
  const engagementPts = Math.min(15, Math.round(Math.log10(input.recentScans30d + 1) * 9));

  // Quota health — full quota left = full pts. exhausted = 0.
  const quota = input.plan.monthlyExposureQuota;
  const quotaPts =
    quota === Infinity ? 10 :
    Math.max(0, Math.round(10 * (1 - input.monthlyExposureUsed / quota)));

  return Math.max(
    0,
    Math.min(100, planBoost + completenessPts + catalogPts + collectionPts + engagementPts + quotaPts),
  );
}
