import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProPricingCards } from "@/components/pricing/ProPricingCards";
import { getProPlanLimits } from "@/lib/planLimits";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Pricing" };

export default async function ProPricingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.brandUser.findFirst({
    where: { userId: session.user.id },
    include: { brand: true },
  });
  if (!membership) redirect("/pro/onboarding");

  const { brand } = membership;
  const limits = getProPlanLimits(brand.plan);

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#9C9894]">
          Pricing
        </p>
        <h1 className="mt-1 font-serif text-[1.8rem] font-semibold leading-tight
                       tracking-[-0.025em] text-[#111010]">
          Your plan
        </h1>
        <p className="mt-1 text-sm text-[#6B6965]">
          You are currently on the{" "}
          <span className="font-medium text-[#111010]">{limits.displayName}</span> plan.
          {" "}Changes take effect immediately.
        </p>
      </div>

      {/* Current plan callout */}
      <div className="mb-8 rounded-2xl bg-[#F7F6F3] border border-black/[0.06] p-5
                       flex flex-wrap items-center gap-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9C9894]">
            Active collections limit
          </p>
          <p className="mt-0.5 font-serif text-[1.6rem] font-semibold text-[#111010] tabular-nums">
            {limits.maxActiveCollections === Infinity ? "∞" : limits.maxActiveCollections}
          </p>
        </div>
        <div className="h-8 w-px bg-black/[0.07]" />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9C9894]">
            Scans per month
          </p>
          <p className="mt-0.5 font-serif text-[1.6rem] font-semibold text-[#111010] tabular-nums">
            {limits.maxScansPerMonth === Infinity ? "∞" : limits.maxScansPerMonth}
          </p>
        </div>
        <div className="h-8 w-px bg-black/[0.07]" />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9C9894]">
            Custom widget branding
          </p>
          <p className="mt-0.5 text-[13px] font-medium text-[#111010]">
            {limits.customWidgetBranding ? "Included" : "Not included"}
          </p>
        </div>
        <div className="h-8 w-px bg-black/[0.07]" />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9C9894]">
            Webhooks
          </p>
          <p className="mt-0.5 text-[13px] font-medium text-[#111010]">
            {limits.webhooks ? "Included" : "Not included"}
          </p>
        </div>
      </div>

      <ProPricingCards currentPlan={brand.plan} />

      <p className="mt-6 text-center text-[12px] text-[#9C9894]">
        No Stripe yet — plan selection is instant. Billing will be enabled in a future release.
      </p>
    </div>
  );
}
