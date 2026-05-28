import { cookies } from "next/headers";
import { ClientPricingCards } from "@/components/pricing/ClientPricingCards";
import { isValidClientPlan, CLIENT_PLAN_COOKIE, getClientPlanLimits } from "@/lib/planLimits";
import Link from "next/link";
import { Metadata } from "next";
import { ClientSignOutLink } from "@/components/client/ClientSignOutLink";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = { title: "Fit plans — Aplomb" };

export default async function ClientPricingPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CLIENT_PLAN_COOKIE)?.value;
  const plan = isValidClientPlan(raw) ? raw : "essential";
  const limits = getClientPlanLimits(plan);

  return (
    <div className="min-h-[100dvh] bg-canvas">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-hairline bg-canvas/90
                          backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link href="/" aria-label="Aplomb — home"
          className="text-[17px] text-ink hover:opacity-60 transition-opacity duration-200">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/app" className="text-[12px] text-ink-subtle hover:text-ink
                                        transition-colors duration-200">
            ← Browse brands
          </Link>
          <span aria-hidden className="h-3 w-px bg-hairline-strong" />
          <ClientSignOutLink />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-14">

        {/* Hero text */}
        <div className="mb-12 text-center">
          <span className="inline-flex items-center rounded-full border border-hairline-strong
                           bg-surface-raised px-3 py-1 text-[10px] font-medium uppercase
                           tracking-[0.18em] text-ink-muted">
            Fit plans
          </span>
          <h1 className="mt-5 font-serif text-[clamp(1.9rem,4vw,2.8rem)] font-semibold
                         leading-[1.08] tracking-[-0.03em] text-ink">
            Your body. Your wardrobe. Your <em className="italic">plan</em>
            <span className="text-accent">.</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-muted max-w-[46ch] mx-auto">
            Start free and upgrade when you need more scans, more style options,
            or a cross-brand wardrobe.
          </p>
        </div>

        {/* Current plan summary */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface
                           border border-hairline px-4 py-2 text-[13px]
                           text-ink-muted shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
            <span className="text-ink-subtle">Current plan:</span>
            <span className="font-medium text-ink capitalize">{plan}</span>
            <span className="text-ink-subtle">·</span>
            <span className="text-ink-subtle nums">
              {limits.maxScansPerMonth === Infinity
                ? "Unlimited scans"
                : `${limits.maxScansPerMonth} scans/month`}
            </span>
          </span>
        </div>

        <ClientPricingCards currentPlan={plan} />

        <p className="mt-8 text-center text-[12px] text-ink-subtle">
          No payment required yet — plan selection is instant.{" "}
          <Link href="/app" className="text-ink-muted hover:text-ink underline
                                       underline-offset-2 transition-colors">
            Start scanning
          </Link>
        </p>
      </main>
    </div>
  );
}
