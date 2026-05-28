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
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#7A7773]">
          Billing
        </p>
        <h1 className="mt-1 font-serif text-[1.8rem] font-semibold leading-tight
                       tracking-[-0.025em] text-[#111010]">
          Plan & marketplace presence
        </h1>
        <p className="mt-1 text-sm text-[#6B6965]">
          You are currently on the{" "}
          <span className="font-medium text-[#111010]">{plan.displayName}</span> plan.
        </p>
      </div>

      {/* Current usage summary */}
      <div className="mb-8 rounded-2xl bg-[#F7F6F3] border border-black/[0.06] p-5
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
        <div className="rounded-2xl bg-[#111010] px-6 py-5 text-white">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/40">
            Returns
          </p>
          <p className="mt-2 font-serif text-[2rem] font-semibold leading-tight">
            Built to reduce
          </p>
          <p className="mt-2 text-[12px] text-white/60">
            accurate sizing means shoppers keep what they order
          </p>
        </div>

        {/* Explainer card spans two columns */}
        <div className="md:col-span-2 rounded-2xl bg-white border border-black/[0.06] px-6 py-5">
          <p className="text-[13px] font-semibold text-[#111010]">How professional plans work</p>
          <p className="mt-2 text-[13px] text-[#6B6965] leading-relaxed">
            Aplomb plans are about your brand&apos;s marketplace presence — catalog capacity,
            monthly shopper-scan exposure, featured eligibility, and analytics depth. Scans
            are performed by your customers, not by your team. When your monthly quota is
            reached, your brand stays fully live and searchable — only the featured boost is paused
            until the next cycle.
          </p>
        </div>
      </div>

      <p className="mt-6 text-center text-[12px] text-[#7A7773]">
        Payments handled by Shopify (wiring in progress) — your selected plan is reserved.
      </p>
    </div>
  );
}

function UsageStat({ label, value, subtle }: { label: string; value: string; subtle?: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#7A7773]">
        {label}
      </p>
      <p className="mt-0.5 font-serif text-[1.4rem] font-semibold text-[#111010] tabular-nums">
        {value}
      </p>
      {subtle && <p className="mt-0.5 text-[11px] text-[#7A7773]">{subtle}</p>}
    </div>
  );
}
