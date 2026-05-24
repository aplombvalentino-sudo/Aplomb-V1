/**
 * Brand analytics metric helpers.
 *
 * NOTE: There is no dedicated BrandAnalyticsDaily / Event table yet — all
 * metrics here are derived live from RecommendationSession + Outfit data.
 * When a dedicated events table is added, swap the body of these functions.
 *
 * Each function returns a small typed shape so callers (dashboard, analytics
 * page, discovery console) can assemble cards without re-querying.
 */

import { db } from "@/lib/db";

// ─── Time helpers ───────────────────────────────────────────────────────────

function firstOfThisMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Monthly exposure ───────────────────────────────────────────────────────

export type MonthlyExposure = {
  used: number;
  quota: number;
  remaining: number;
  pctUsed: number;          // 0–100
  isExhausted: boolean;
  resetsAt: Date;           // next 1st of month
};

/**
 * How many shopper scans this brand has received in the current calendar
 * month, vs. its plan's monthly quota.
 */
export async function getBrandMonthlyExposure(
  brandId: string,
  monthlyQuota: number,
): Promise<MonthlyExposure> {
  const since = firstOfThisMonth();
  const used = await db.recommendationSession.count({
    where: { brandId, createdAt: { gte: since } },
  });

  const resetsAt = new Date(since.getFullYear(), since.getMonth() + 1, 1);
  const isInfinite = monthlyQuota === Infinity;
  const remaining = isInfinite ? Infinity : Math.max(0, monthlyQuota - used);
  const pctUsed = isInfinite ? 0 : Math.min(100, Math.round((used / monthlyQuota) * 100));

  return {
    used,
    quota: monthlyQuota,
    remaining,
    pctUsed,
    isExhausted: !isInfinite && used >= monthlyQuota,
    resetsAt,
  };
}

// ─── Engagement totals (30-day window) ──────────────────────────────────────

export type BrandEngagement = {
  scans30d: number;
  outfits30d: number;
  // Save/click counts will come from the future event table — 0 for now.
  saves30d: number;
  productClicks30d: number;
};

export async function getBrandEngagement30d(brandId: string): Promise<BrandEngagement> {
  const since = daysAgo(30);
  const [scans30d, outfits30d] = await Promise.all([
    db.recommendationSession.count({ where: { brandId, createdAt: { gte: since } } }),
    db.outfit
      .count({
        where: {
          createdAt: { gte: since },
          recommendationSession: { brandId },
        },
      })
      .catch(() => 0),
  ]);

  return { scans30d, outfits30d, saves30d: 0, productClicks30d: 0 };
}

// ─── Catalog inventory snapshot ─────────────────────────────────────────────

export type CatalogSnapshot = {
  activeProductCount: number;
  productsWithImagesCount: number;
  variantsCount: number;
  sizeChartCount: number;
  /** Placeholder — no Collection table yet. */
  activeCollectionCount: number;
};

export async function getCatalogSnapshot(brandId: string): Promise<CatalogSnapshot> {
  const [activeProductCount, productsWithImagesCount, variantsCount, sizeChartCount] =
    await Promise.all([
      db.product.count({ where: { brandId, isActive: true } }),
      db.product.count({
        where: { brandId, isActive: true, imageUrl: { not: null } },
      }),
      db.productVariant.count({ where: { product: { brandId, isActive: true } } }),
      db.sizeChart.count({ where: { brandId } }),
    ]);

  return {
    activeProductCount,
    productsWithImagesCount,
    variantsCount,
    sizeChartCount,
    activeCollectionCount: 0, // TODO: when Collection table lands
  };
}

// ─── Daily scan series (for charts) ─────────────────────────────────────────

export type DailySeriesPoint = { date: string; count: number };

/**
 * Returns `days`-long series of daily scan counts, most-recent date last.
 * Days with zero scans are included as `count: 0`.
 */
export async function getBrandScanSeries(
  brandId: string,
  days: number = 14,
): Promise<DailySeriesPoint[]> {
  const since = daysAgo(days);
  const sessions = await db.recommendationSession.findMany({
    where: { brandId, createdAt: { gte: since } },
    select: { createdAt: true },
  });

  // Bucket into YYYY-MM-DD keys
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const s of sessions) {
    const key = s.createdAt.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}
