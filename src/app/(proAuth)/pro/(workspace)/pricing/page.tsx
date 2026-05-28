import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProPricingCards } from "@/components/pricing/ProPricingCards";
import { getProfessionalPlanLimits, type ProPlan } from "@/lib/plans/proPlans";
import { getBrandMonthlyExposure } from "@/lib/analytics/brandMetrics";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Billing" };

export default async function ProBillingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.brandUser.findFirst({
    where: { userId: session.user.id },
    include: { brand: true },
  });
  if (!membership) redirect("/pro/onboarding");

  const { brand } = membership;
  const plan = getProfessionalPlanLimits(brand.plan as ProPlan);
  const exposure = await getBrandMonthlyExposure(brand.id, plan.monthlyExposureQuota);

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-subtle">
          Billing
        </p>
        <h1 className="mt-1 font-serif text-[1.8rem] font-semibold leading-tight
                       tracking-[-0.025em] text-ink">
          Plan & marketplace <em className="italic">presence</em><span className="text-accent">.</span>
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          You are currently on the{" "}
          <span className="font-medium text-ink">{plan.displayName}</span> plan.
        </p>
      </div>

      {/* Current usage summary */}
      <div className="mb-8 rounded-2xl bg-surface-raised border border-hairline p-5
                       grid grid-cols-2 md:grid-cols-4 gap-5">
        <UsageStat
          label="Monthly scan quota"
          value={
            plan.monthlyExposureQuota === Infinity
              ? "Unlimited"
              : plan.monthlyExposureQuota.toLocaleString()
          }
        />
        <UsageStat
          label="Used this month"
          value={exposure.used.toLocaleString()}
          subtle={plan.monthlyExposureQuota !== Infinity ? `${exposure.pctUsed}% of quota` : undefined}
        />
        <UsageStat
          label="Active collections"
          value={plan.maxActiveCollections === Infinity ? "Unlimited" : String(plan.maxActiveCollections)}
        />
        <UsageStat
          label="Featured eligibility"
          value={plan.featuredEligibility ? "Eligible" : "Standard only"}
        />
      </div>

      <ProPricingCards currentPlan={brand.plan as ProPlan} />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Returns stat */}
        <div className="rounded-2xl bg-stone-deep px-6 py-5 text-ink">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-subtle">
            Returns
          </p>
          <p className="mt-2 font-serif text-[2rem] font-semibold leading-tight">
            Built to reduce
          </p>
          <p className="mt-2 text-[12px] text-ink-muted">
            accurate sizing means shoppers keep what they order
          </p>
        </div>

        {/* Explainer card spans two columns */}
        <div className="md:col-span-2 rounded-2xl bg-surface border border-hairline px-6 py-5">
          <p className="text-[13px] font-semibold text-ink">How professional plans work</p>
          <p className="mt-2 text-[13px] text-ink-muted leading-relaxed">
            Aplomb plans are about your brand&apos;s marketplace presence — catalog capacity,
            monthly shopper-scan exposure, featured eligibility, and analytics depth. Scans
            are performed by your customers, not by your team. When your monthly quota is
            reached, your brand stays fully live and searchable — only the featured boost is paused
            until the next cycle.
          </p>
        </div>
      </div>

      <p className="mt-6 text-center text-[12px] text-ink-subtle">
        Payments handled by Shopify (wiring in progress) — your selected plan is reserved.
      </p>
    </div>
  );
}

function UsageStat({ label, value, subtle }: { label: string; value: string; subtle?: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
        {label}
      </p>
      <p className="mt-0.5 font-serif text-[1.4rem] font-semibold text-ink nums">
        {value}
      </p>
      {subtle && <p className="mt-0.5 text-[11px] text-ink-subtle">{subtle}</p>}
    </div>
  );
}
