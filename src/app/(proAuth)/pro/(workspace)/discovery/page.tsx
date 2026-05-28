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
} from "@/lib/analytics/brandMetrics";

export const metadata: Metadata = { title: "Discovery" };

export default async function ProDiscoveryPage() {
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

  const [exposure, engagement, catalog] = await Promise.all([
    getBrandMonthlyExposure(brand.id, plan.monthlyExposureQuota),
    getBrandEngagement30d(brand.id),
    getCatalogSnapshot(brand.id),
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

  // Signal breakdown for the explanation panel
  const signals = [
    {
      label: "Plan tier",
      value: plan.displayName,
      good: plan.id !== "free",
      hint: plan.id === "free"
        ? "Upgrade to Featured to unlock top placement"
        : "Eligible for featured placement",
    },
    {
      label: "Completeness",
      value: `${completeness.score}/100`,
      good: completeness.score >= 70,
      hint: completeness.score >= 70
        ? "Strong profile — keep it fresh"
        : "Complete your profile to qualify for featured placement",
    },
    {
      label: "Catalog depth",
      value: `${catalog.activeProductCount} active products`,
      good: catalog.activeProductCount >= 10,
      hint: catalog.activeProductCount >= 10
        ? "Healthy catalog size"
        : "Add more active products to climb the ranking",
    },
    {
      label: "Recent engagement",
      value: `${engagement.scans30d} shopper scans (30d)`,
      good: engagement.scans30d > 0,
      hint: engagement.scans30d > 0
        ? "Active demand — keep collections fresh"
        : "No scans yet this month — share your brand link",
    },
    {
      label: "Quota health",
      value: plan.monthlyExposureQuota === Infinity
        ? "Unlimited"
        : `${exposure.remaining.toLocaleString()} scans left`,
      good: !exposure.isExhausted,
      hint: exposure.isExhausted
        ? "Quota reached — featured boost paused until next cycle"
        : "Quota healthy",
    },
  ];

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-subtle">
          Marketplace
        </p>
        <h1 className="mt-1 font-serif text-[1.8rem] font-semibold leading-tight
                       tracking-[-0.025em] text-ink">
          Discovery <em className="italic">console</em><span className="text-accent">.</span>
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          How your brand surfaces in front of shoppers.
        </p>
      </div>

      {/* ── Visibility + scores summary ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className={`rounded-2xl px-5 py-5 text-ink ${
          visibilityStatus === "Featured"
            ? "bg-[var(--accent-tint)] ring-1 ring-accent/30"
            : "bg-surface border border-hairline"
        }`}>
          <p className={`text-[10px] font-medium uppercase tracking-[0.14em] ${
            visibilityStatus === "Featured" ? "text-accent-deep" : "text-ink-subtle"
          }`}>
            Current visibility
          </p>
          <p className="mt-2 font-serif text-[2rem] font-semibold leading-none">
            {visibilityStatus}
          </p>
          <p className={`mt-2 text-[12px] leading-relaxed ${
            visibilityStatus === "Featured" ? "text-ink-muted" : "text-ink-muted"
          }`}>
            {visibilityStatus === "Featured"
              ? "Your brand appears in Top Brands and featured carousels."
              : visibilityStatus === "Standard"
              ? "Searchable and accessible — currently outside featured placements."
              : "Your brand is unpublished. Add active products to go live."}
          </p>
        </div>

        <Card>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
            Discovery score
          </p>
          <p className="mt-2 font-serif text-[2rem] font-semibold nums leading-none text-ink">
            {discoveryScore}
            <span className="text-[14px] text-ink-subtle ml-1">/100</span>
          </p>
          <div className="mt-3 h-1.5 rounded-full bg-ink/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-ink transition-all duration-500"
              style={{ width: `${Math.max(2, discoveryScore)}%` }}
            />
          </div>
        </Card>

        <Card>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
            Exposure this month
          </p>
          <p className="mt-2 font-serif text-[2rem] font-semibold nums leading-none text-ink">
            {exposure.used.toLocaleString()}
            {plan.monthlyExposureQuota !== Infinity && (
              <span className="text-[14px] text-ink-subtle ml-1">
                / {plan.monthlyExposureQuota.toLocaleString()}
              </span>
            )}
          </p>
          <p className="mt-2 text-[12px] text-ink-muted">
            Resets {exposure.resetsAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </p>
        </Card>
      </div>

      {/* ── Signal breakdown ───────────────────────────────────────────────── */}
      <div className="mb-8 rounded-2xl bg-surface border border-hairline
                      shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
        <div className="px-6 py-5 border-b border-hairline">
          <p className="text-[13px] font-semibold text-ink">What drives your ranking</p>
          <p className="mt-0.5 text-[12px] text-ink-subtle">
            Each signal feeds into your discovery score with balanced weighting.
          </p>
        </div>
        <ul className="divide-y divide-hairline">
          {signals.map((s) => (
            <li key={s.label} className="flex items-center gap-4 px-6 py-4">
              <span className={`h-2 w-2 rounded-full shrink-0 ${
                s.good ? "bg-[#6B9F6B]" : "bg-champagne"
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink">{s.label}</p>
                <p className="mt-0.5 text-[12px] text-ink-muted">{s.hint}</p>
              </div>
              <span className="shrink-0 nums text-[12px] text-ink">
                {s.value}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Suggestions ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-[var(--champagne-tint)] border border-champagne/30 px-6 py-5">
        <p className="text-[13px] font-semibold text-ink">Boost your visibility</p>
        <p className="mt-0.5 text-[12px] text-ink-muted">
          High-impact actions you can take this week.
        </p>
        {completeness.missing.length === 0 ? (
          <p className="mt-4 text-[13px] text-ink">
            Your profile is fully optimized — nice work.
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {completeness.missing.map((m) => (
              <li key={m}
                  className="flex items-start gap-2 rounded-xl bg-surface px-3 py-2.5
                             border border-hairline text-[13px] text-ink">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="mt-1 shrink-0">
                  <path d="M2.5 5.5L4.5 7.5 8.5 3.5" stroke="#C9A882" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {m}
              </li>
            ))}
          </ul>
        )}
        {!plan.featuredEligibility && (
          <Link
            href="/pro/billing"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink pl-5 pr-2 py-2
                       text-[12px] font-medium text-white hover:bg-ink/90 transition-colors"
          >
            Upgrade to Featured for top placement
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent aplomb-glow">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 8L8 2M8 2H3M8 2V7" stroke="white" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface border border-hairline
                    shadow-[0_2px_16px_rgba(0,0,0,0.04)] px-5 py-5">
      {children}
    </div>
  );
}
