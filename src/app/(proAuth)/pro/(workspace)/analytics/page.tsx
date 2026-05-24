import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";

import { getProfessionalPlanLimits, type ProPlan } from "@/lib/plans/proPlans";
import {
  getBrandMonthlyExposure,
  getBrandEngagement30d,
  getBrandScanSeries,
} from "@/lib/analytics/brandMetrics";
import { OverviewCharts } from "@/components/dashboard/OverviewCharts";

export const metadata: Metadata = { title: "Analytics" };

export default async function ProAnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.brandUser.findFirst({
    where: { userId: session.user.id },
    include: { brand: true },
  });
  if (!membership) redirect("/pro/onboarding");
  const { brand } = membership;

  const plan = getProfessionalPlanLimits(brand.plan as ProPlan);
  const hasAdvanced = plan.advancedAnalytics;

  const [exposure, engagement, scanSeries30d] = await Promise.all([
    getBrandMonthlyExposure(brand.id, plan.monthlyExposureQuota),
    getBrandEngagement30d(brand.id),
    getBrandScanSeries(brand.id, 30),
  ]);

  // Top products by appearance in recommendation sessions (proxy until events exist)
  const topProducts = await db.outfitItem
    .groupBy({
      by: ["productId"],
      where: {
        outfit: {
          createdAt: { gte: thirtyDaysAgo() },
          recommendationSession: { brandId: brand.id },
        },
      },
      _count: { productId: true },
      orderBy: { _count: { productId: "desc" } },
      take: 5,
    })
    .catch(() => [] as Array<{ productId: string; _count: { productId: number } }>);

  const topProductDetails =
    topProducts.length > 0
      ? await db.product.findMany({
          where: { id: { in: topProducts.map((t) => t.productId) } },
          select: { id: true, name: true, category: true, imageUrl: true },
        })
      : [];

  const topProductsWithCounts = topProducts.map((t) => ({
    ...t,
    product: topProductDetails.find((p) => p.id === t.productId),
  }));

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#9C9894]">
            Analytics
          </p>
          <h1 className="mt-1 font-serif text-[1.8rem] font-semibold leading-tight
                         tracking-[-0.025em] text-[#111010]">
            Shopper engagement
          </h1>
          <p className="mt-1 text-sm text-[#6B6965]">
            Track how customers interact with your brand.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-black/10 bg-white
                         px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#111010]">
          {plan.displayName}
        </span>
      </div>

      {/* ── Headline metrics ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricTile label="Scans this month" value={exposure.used} />
        <MetricTile label="Scans (30d)" value={engagement.scans30d} />
        <MetricTile label="Outfits (30d)" value={engagement.outfits30d} />
        <MetricTile
          label="Quota remaining"
          value={plan.monthlyExposureQuota === Infinity ? "∞" : exposure.remaining}
        />
      </div>

      {/* ── Scan trend chart ───────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-black/[0.06]
                      shadow-[0_2px_16px_rgba(0,0,0,0.04)] px-6 py-5 mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9C9894] mb-4">
          Shopper scans — last 30 days
        </p>
        <OverviewCharts
          sessions={scanSeries30d.flatMap((p) =>
            Array.from({ length: p.count }, () => ({ date: `${p.date}T12:00:00.000Z` })),
          )}
        />
      </div>

      {/* ── Advanced section: locked or revealed ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdvancedCard title="Top performing products" locked={!hasAdvanced}>
          {hasAdvanced ? (
            topProductsWithCounts.length === 0 ? (
              <p className="text-[13px] text-[#9C9894]">
                No outfit data yet for this period.
              </p>
            ) : (
              <ul className="space-y-2">
                {topProductsWithCounts.map((t, i) => (
                  <li key={t.productId} className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-[#C9C5C0] w-4 tabular-nums">
                      {(i + 1).toString().padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#111010]">
                        {t.product?.name ?? "Unknown product"}
                      </p>
                      {t.product?.category && (
                        <p className="text-[11px] text-[#9C9894]">{t.product.category}</p>
                      )}
                    </div>
                    <span className="font-mono text-[12px] tabular-nums text-[#6B6965]">
                      {t._count.productId}
                    </span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <LockedHint />
          )}
        </AdvancedCard>

        <AdvancedCard title="Save-to-wardrobe activity" locked={!hasAdvanced}>
          {hasAdvanced ? (
            <div>
              <p className="font-serif text-[2rem] font-semibold leading-none text-[#111010] tabular-nums">
                {engagement.saves30d.toLocaleString()}
              </p>
              <p className="mt-2 text-[12px] text-[#9C9894]">
                Saves in the last 30 days. Detailed save events arrive with the
                event tracking release.
              </p>
            </div>
          ) : (
            <LockedHint />
          )}
        </AdvancedCard>

        <AdvancedCard title="Product page clicks" locked={!hasAdvanced}>
          {hasAdvanced ? (
            <div>
              <p className="font-serif text-[2rem] font-semibold leading-none text-[#111010] tabular-nums">
                {engagement.productClicks30d.toLocaleString()}
              </p>
              <p className="mt-2 text-[12px] text-[#9C9894]">
                Click-through events from outfit recommendations.
              </p>
            </div>
          ) : (
            <LockedHint />
          )}
        </AdvancedCard>

        <AdvancedCard title="Conversion signals" locked={!hasAdvanced}>
          {hasAdvanced ? (
            <p className="text-[13px] text-[#9C9894]">
              Conversion proxy events surface here once your widget reports
              add-to-cart and checkout events.
            </p>
          ) : (
            <LockedHint />
          )}
        </AdvancedCard>
      </div>

      {!hasAdvanced && (
        <div className="mt-6 rounded-2xl bg-[#111010] px-6 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-white">Unlock advanced analytics</p>
            <p className="mt-0.5 text-[12px] text-white/60">
              Featured brings product performance, save tracking, and conversion insights.
            </p>
          </div>
          <Link
            href="/pro/billing"
            className="rounded-full bg-white px-5 py-2 text-[12px] font-medium text-[#111010]
                       hover:bg-[#F7F6F3] transition-colors duration-200"
          >
            See plans →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function thirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
}

function MetricTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-white border border-black/[0.06]
                    shadow-[0_2px_8px_rgba(0,0,0,0.03)] px-5 py-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#9C9894]">
        {label}
      </p>
      <p className="mt-1.5 font-serif text-[1.8rem] font-semibold leading-none tabular-nums text-[#111010]">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function AdvancedCard({
  title,
  locked,
  children,
}: {
  title: string;
  locked: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative rounded-2xl bg-white border px-6 py-5
                    ${locked
                      ? "border-black/[0.06] overflow-hidden"
                      : "border-black/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.04)]"
                    }`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9C9894]">
          {title}
        </p>
        {locked && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF8F3]
                           border border-[#C9A882]/30 px-2 py-0.5 text-[9px]
                           font-medium uppercase tracking-[0.12em] text-[#C9A882]">
            Featured
          </span>
        )}
      </div>
      <div className={locked ? "opacity-40 pointer-events-none select-none" : ""}>
        {children}
      </div>
    </div>
  );
}

function LockedHint() {
  return (
    <div className="space-y-2">
      <div className="h-7 w-24 rounded-md bg-black/[0.06]" />
      <div className="h-3 w-full rounded bg-black/[0.05]" />
      <div className="h-3 w-3/4 rounded bg-black/[0.05]" />
    </div>
  );
}
