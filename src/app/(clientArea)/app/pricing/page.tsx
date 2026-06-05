import { cookies } from "next/headers";
import { ClientPricingCards } from "@/components/pricing/ClientPricingCards";
import { isValidClientPlan, CLIENT_PLAN_COOKIE, getClientPlanLimits } from "@/lib/planLimits";
import Link from "next/link";
import { Metadata } from "next";
import { ClientSignOutLink } from "@/components/client/ClientSignOutLink";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = { title: "Wardrobe plans — Aplomb" };

/**
 * In-app pricing for signed-in shoppers. Reframed wardrobe-first to match
 * the public /pricing positioning: plans differ by wardrobe size + personal-
 * photo allowance + outfit experimentation depth. Sizing limits stay but
 * appear as a quieter trailing line.
 */
export default async function ClientPricingPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CLIENT_PLAN_COOKIE)?.value;
  const plan = isValidClientPlan(raw) ? raw : "essential";
  const limits = getClientPlanLimits(plan);

  return (
    <div className="min-h-[100dvh] bg-canvas">
      {/* Header — same wardrobe-first nav as every other client-area page. */}
      <header className="border-b border-hairline bg-canvas/90 backdrop-blur-md
                          sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <Link href="/app/wardrobe" aria-label="Aplomb — wardrobe" className="text-ink hover:opacity-60 transition-opacity duration-200">
          <Logo className="text-[17px]" />
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/app/wardrobe" className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200">Wardrobe</Link>
          <Link href="/app/outfits" className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200">Outfits</Link>
          <Link href="/app/discover" className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200">Discover</Link>
          <Link href="/app/account" className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200">Profile</Link>
          <span aria-hidden className="h-3 w-px bg-hairline-strong" />
          <ClientSignOutLink />
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-14">
        {/* Hero text */}
        <div className="mb-12 text-center">
          <span className="inline-flex items-center rounded-full border border-hairline-strong
                           bg-surface-raised px-3 py-1 text-[10px] font-medium uppercase
                           tracking-[0.18em] text-ink-muted">
            Rotation plans
          </span>
          <h1 className="mt-5 font-serif text-[clamp(1.9rem,4vw,2.8rem)] font-semibold
                         leading-[1.08] tracking-[-0.03em] text-ink">
            More <em className="italic">rotation</em>, more fits
            <span className="text-accent">.</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-muted max-w-[50ch] mx-auto">
            Start free with 10 rotation slots and 3 pieces from your real
            closet. Upgrade when you want a bigger rotation, more personal
            uploads, or full fit experimentation.
          </p>
        </div>

        {/* Current plan summary — reframed around rotation capacity */}
        <div className="mb-8 flex items-center justify-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface
                           border border-hairline px-4 py-2 text-[13px]
                           text-ink-muted shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
            <span className="text-ink-subtle">Current plan:</span>
            <span className="font-medium text-ink capitalize">{plan}</span>
            <span className="text-ink-subtle">·</span>
            <span className="text-ink-subtle nums">
              {limits.maxWardrobeItems === Infinity
                ? "Unlimited pieces"
                : `${limits.maxWardrobeItems} pieces`}
            </span>
            <span className="text-ink-subtle">·</span>
            <span className="text-ink-subtle nums">
              {limits.maxPersonalPhotos === Infinity
                ? "∞ from your closet"
                : `${limits.maxPersonalPhotos} from your closet`}
            </span>
          </span>
        </div>

        <ClientPricingCards currentPlan={plan} />

        <p className="mt-8 text-center text-[12px] text-ink-subtle">
          Plan selection is instant — no payment required for Essential.{" "}
          <Link href="/app/wardrobe" className="text-ink-muted hover:text-ink underline
                                       underline-offset-2 transition-colors">
            Back to my rotation
          </Link>
        </p>
      </main>
    </div>
  );
}
