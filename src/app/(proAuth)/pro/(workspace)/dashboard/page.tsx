import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";

import { getProfessionalPlanLimits, type ProPlan } from "@/lib/plans/proPlans";
import {
  computeBrandCompletenessScore,
  computeBrandDiscoveryScore,
  getBrandVisibilityStatus,
} from "@/lib/discovery/brandRanking";
import {
  getBrandMonthlyExposure,
  getBrandEngagement30d,
  getCatalogSnapshot,
  getBrandScanSeries,
} from "@/lib/analytics/brandMetrics";
import { OverviewCharts } from "@/components/dashboard/OverviewCharts";

export const metadata: Metadata = { title: "Brand Overview" };

export default async function ProDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.brandUser.findFirst({
    where: { userId: session.user.id },
    include: { brand: true },
  });
  if (!membership) redirect("/pro/onboarding");
  const { brand } = membership;

  const plan = getProfessionalPlanLimits(brand.plan as ProPlan);
  const config = (brand.configuration ?? {}) as Record<string, unknown>;

  // Fetch in parallel
  const [exposure, engagement, catalog, scanSeries] = await Promise.all([
    getBrandMonthlyExposure(brand.id, plan.monthlyExposureQuota),
    getBrandEngagement30d(brand.id),
    getCatalogSnapshot(brand.id),
    getBrandScanSeries(brand.id, 14),
  ]);

  const completeness = computeBrandCompletenessScore({
    logoUrl: brand.logoUrl,
    bannerUrl: (config.bannerUrl as string) ?? null,
    description: (config.description as string) ?? null,
    longDescription: (config.longDescription as string) ?? null,
    activeProductCount: catalog.activeProductCount,
    productsWithImagesCount: catalog.productsWithImagesCount,
    variantsCount: catalog.variantsCount,
    sizeChartCount: catalog.sizeChartCount,
    activeCollectionCount: catalog.activeCollectionCount,
  });

  const isPublished = catalog.activeProductCount > 0;
  const visibilityStatus = getBrandVisibilityStatus(plan, completeness.score, exposure.used, isPublished);
  const discoveryScore = computeBrandDiscoveryScore({
    plan,
    completenessScore: completeness.score,
    activeProductCount: catalog.activeProductCount,
    activeCollectionCount: catalog.activeCollectionCount,
    recentScans30d: engagement.scans30d,
    monthlyExposureUsed: exposure.used,
    isPublished,
  });

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#9C9894]">
            Brand overview
          </p>
          <h1 className="mt-1 font-serif text-[1.8rem] font-semibold leading-tight
                         tracking-[-0.025em] text-[#111010]">
            {brand.name}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <PlanBadge label={plan.displayName} />
            <VisibilityBadge status={visibilityStatus} />
          </div>
        </div>
        <Link
          href="/pro/discovery"
          className="rounded-full border border-black/[0.12] bg-white px-4 py-2 text-[12px]
                     font-medium text-[#6B6965] hover:text-[#111010] hover:border-black/20
                     transition-all duration-200"
        >
          View discovery console →
        </Link>
      </div>

      {/* ── Top cards: Exposure quota + Completeness + Discovery score ─────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Exposure quota */}
        <Card>
          <CardLabel>Monthly shopper scans</CardLabel>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-serif text-[2.2rem] font-semibold tabular-nums text-[#111010] leading-none">
              {exposure.used.toLocaleString()}
            </span>
            {exposure.quota !== Infinity && (
              <span className="text-[13px] text-[#9C9894] tabular-nums">
                / {exposure.quota.toLocaleString()}
              </span>
            )}
          </div>
          {exposure.quota !== Infinity ? (
            <>
              <div className="mt-3 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500
                              ${exposure.isExhausted
                                ? "bg-[#C97A6A]"
                                : exposure.pctUsed > 80
                                ? "bg-[#C9A882]"
                                : "bg-[#111010]"}`}
                  style={{ width: `${Math.max(2, exposure.pctUsed)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-[#9C9894]">
                {exposure.isExhausted
                  ? "Quota reached — brand stays live, featured boost paused."
                  : `${exposure.remaining.toLocaleString()} scans left this month`}
              </p>
            </>
          ) : (
            <p className="mt-3 text-[11px] text-[#9C9894]">Unlimited exposure on {plan.displayName}.</p>
          )}
        </Card>

        {/* Completeness */}
        <Card>
          <CardLabel>Brand completeness</CardLabel>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-serif text-[2.2rem] font-semibold tabular-nums text-[#111010] leading-none">
              {completeness.score}
            </span>
            <span className="text-[14px] text-[#9C9894]">/ 100</span>
            <span className="ml-auto rounded-full bg-[#F7F6F3] border border-black/[0.06]
                             px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]
                             text-[#6B6965]">
              {completeness.level}
            </span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#C9A882] transition-all duration-500"
              style={{ width: `${Math.max(2, completeness.score)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-[#9C9894]">
            {completeness.missing.length === 0
              ? "Profile fully optimized."
              : `${completeness.missing.length} improvement${completeness.missing.length === 1 ? "" : "s"} suggested`}
          </p>
        </Card>

        {/* Discovery score */}
        <Card>
          <CardLabel>Discovery score</CardLabel>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-serif text-[2.2rem] font-semibold tabular-nums text-[#111010] leading-none">
              {discoveryScore}
            </span>
            <span className="text-[14px] text-[#9C9894]">/ 100</span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#111010] transition-all duration-500"
              style={{ width: `${Math.max(2, discoveryScore)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-[#9C9894]">
            How prominently you rank in marketplace listings.
          </p>
        </Card>
      </div>

      {/* ── Catalog snapshot ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatTile label="Active products" value={catalog.activeProductCount} />
        <StatTile label="Collections" value={catalog.activeCollectionCount} note="Coming soon" />
        <StatTile label="Outfits (30d)" value={engagement.outfits30d} />
        <StatTile label="Saves (30d)" value={engagement.saves30d} note="Tracking soon" />
      </div>

      {/* ── Scan trend ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-black/[0.06]
                      shadow-[0_2px_16px_rgba(0,0,0,0.04)] px-6 py-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9C9894]">
            Shopper scans — last 14 days
          </p>
          <Link
            href="/pro/analytics"
            className="text-[11px] text-[#6B6965] hover:text-[#111010] transition-colors"
          >
            Full analytics →
          </Link>
        </div>
        <OverviewCharts
          sessions={scanSeries.flatMap((p) =>
            Array.from({ length: p.count }, () => ({ date: `${p.date}T12:00:00.000Z` })),
          )}
        />
      </div>

      {/* ── Suggestions ────────────────────────────────────────────────────── */}
      {completeness.missing.length > 0 && (
        <div className="rounded-2xl bg-[#FDF8F3] border border-[#C9A882]/30 px-6 py-5">
          <div className="flex items-start gap-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 mt-0.5">
              <path d="M10 2l2.5 6.5H19l-5 4 2 6L10 14l-6 4.5 2-6L1 8.5h6.5L10 2z"
                    stroke="#C9A882" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-[#4a3f35]">
                Improve your marketplace presence
              </p>
              <p className="mt-0.5 text-[12px] text-[#6B6965]">
                Completing these steps boosts your discovery score and featured eligibility.
              </p>
              <ul className="mt-3 space-y-1.5">
                {completeness.missing.slice(0, 4).map((m) => (
                  <li key={m} className="flex items-center gap-2 text-[13px] text-[#3a3632]">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <circle cx="5" cy="5" r="3" stroke="#C9A882" strokeWidth="1.3" />
                    </svg>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-black/[0.06]
                    shadow-[0_2px_16px_rgba(0,0,0,0.04)] px-5 py-4.5">
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9C9894]">
      {children}
    </p>
  );
}

function StatTile({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-2xl bg-white border border-black/[0.06]
                    shadow-[0_2px_8px_rgba(0,0,0,0.03)] px-4 py-3.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#9C9894]">
        {label}
      </p>
      <p className="mt-1.5 font-serif text-[1.6rem] font-semibold leading-none tabular-nums text-[#111010]">
        {value.toLocaleString()}
      </p>
      {note && <p className="mt-1 text-[10px] text-[#C9C5C0]">{note}</p>}
    </div>
  );
}

function PlanBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/10 bg-white
                     px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[#111010]">
      {label}
    </span>
  );
}

function VisibilityBadge({ status }: { status: "Featured" | "Standard" | "Dormant" }) {
  const styles =
    status === "Featured"
      ? "bg-[#111010] text-white border-black"
      : status === "Standard"
      ? "bg-[#F7F6F3] text-[#6B6965] border-black/10"
      : "bg-white text-[#C9C5C0] border-black/10";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5
                      text-[10px] font-medium uppercase tracking-[0.14em] ${styles}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        status === "Featured" ? "bg-[#C9A882]" :
        status === "Standard" ? "bg-[#9C9894]" : "bg-[#C9C5C0]"
      }`} />
      {status}
    </span>
  );
}
