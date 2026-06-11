import { cookies } from "next/headers";
import { ClientPricingCards } from "@/components/pricing/ClientPricingCards";
import { isValidClientPlan, CLIENT_PLAN_COOKIE, getClientPlanLimits } from "@/lib/planLimits";
import Link from "next/link";
import { Metadata } from "next";
import { ClientNav } from "@/components/client/ClientNav";

export const metadata: Metadata = { title: "Wardrobe plans — Aplomb" };

/**
 * In-app pricing for signed-in shoppers. Wardrobe-first framing to match
 * the public /pricing positioning: plans differ by wardrobe size + personal-
 * item allowance + outfit experimentation depth. Sizing limits stay but
 * appear as a quieter trailing line.
 */
export default async function ClientPricingPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CLIENT_PLAN_COOKIE)?.value;
  const plan = isValidClientPlan(raw) ? raw : "essential";
  const limits = getClientPlanLimits(plan);

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <ClientNav active="none" />

      <main className="mx-auto max-w-4xl px-6 py-14">
        {/* Hero text */}
        <div className="mb-12 text-center">
          <span className="inline-flex items-center rounded-full border border-hairline-strong
                           bg-surface-raised px-3 py-1 text-[10px] font-medium uppercase
                           tracking-[0.18em] text-ink-muted">
            Wardrobe plans
          </span>
          <h1 className="mt-5 font-serif text-[clamp(1.9rem,4vw,2.8rem)] font-semibold
                         leading-[1.08] tracking-[-0.03em] text-ink">
            A bigger <em className="italic">wardrobe</em>, more outfits
            <span className="text-accent">.</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-muted max-w-[50ch] mx-auto">
            Start free with 10 wardrobe slots and 3 of your own clothing
            items. Upgrade when you want a bigger wardrobe, more personal
            uploads, or full outfit experimentation.
          </p>
        </div>

        {/* Current plan summary — wardrobe capacity at a glance */}
        <div className="mb-8 flex items-center justify-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface
                           border border-hairline px-4 py-2 text-[13px]
                           text-ink-muted shadow-card">
            <span className="text-ink-subtle">Current plan:</span>
            <span className="font-medium text-ink capitalize">{plan}</span>
            <span className="text-ink-subtle">·</span>
            <span className="text-ink-subtle nums">
              {limits.maxWardrobeItems === Infinity
                ? "Unlimited items"
                : `${limits.maxWardrobeItems} items`}
            </span>
            <span className="text-ink-subtle">·</span>
            <span className="text-ink-subtle nums">
              {limits.maxPersonalPhotos === Infinity
                ? "∞ personal photos"
                : `${limits.maxPersonalPhotos} personal photos`}
            </span>
          </span>
        </div>

        <ClientPricingCards currentPlan={plan} />

        <p className="mt-8 text-center text-[12px] text-ink-subtle">
          Plan selection is instant — no payment required for Essential.{" "}
          <Link href="/app/wardrobe" className="text-ink-muted hover:text-ink underline
                                       underline-offset-2 transition-colors">
            Back to my wardrobe
          </Link>
        </p>
      </main>
    </div>
  );
}
