import { cookies } from "next/headers";
import { isValidClientPlan, CLIENT_PLAN_COOKIE } from "@/lib/planLimits";
import { WardrobeClient } from "@/components/client/WardrobeClient";
import { ClientSignOutLink } from "@/components/client/ClientSignOutLink";
import { Logo } from "@/components/brand/Logo";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Digital Wardrobe — Aplomb" };

export default async function WardrobePage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CLIENT_PLAN_COOKIE)?.value;
  const clientPlan = isValidClientPlan(raw) ? raw : "essential";

  // Wardrobe is a Model-plan feature
  const hasAccess = clientPlan === "model";

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
                                        transition-colors">
            ← Browse
          </Link>
          <Link href="/app/pricing" className="text-[12px] text-ink-subtle hover:text-ink
                                                transition-colors">
            Plans
          </Link>
          <span aria-hidden className="h-3 w-px bg-hairline-strong" />
          <ClientSignOutLink />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {hasAccess ? (
          <>
            <div className="mb-8">
              <span className="inline-flex items-center rounded-full border border-hairline-strong
                               bg-surface-raised px-3 py-1 text-[10px] font-medium uppercase
                               tracking-[0.18em] text-ink-muted">
                Model plan
              </span>
              <h1 className="mt-4 font-serif text-[2rem] font-semibold leading-[1.08]
                             tracking-[-0.025em] text-ink">
                Your digital <em className="italic">wardrobe</em>
                <span className="text-accent">.</span>
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                Outfits you&apos;ve saved across all brands.
              </p>
            </div>
            <WardrobeClient />
          </>
        ) : (
          /* ── Upgrade gate ── */
          <div className="flex flex-col items-center text-center py-16">
            {/* Champagne ring icon */}
            <div className="mb-6 h-20 w-20 rounded-full border-2 border-champagne/40
                             flex items-center justify-center">
              <div className="h-14 w-14 rounded-full border-2 border-champagne
                               flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M14 4l2.5 7H21l-6 4.5 2.5 7.5L14 19l-3.5 4 2.5-7.5L7 11h4.5L14 4z"
                        stroke="#C9A882" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <span className="inline-flex items-center rounded-full bg-[var(--champagne-tint)]
                             border border-champagne/30 px-3 py-1 text-[10px] font-medium
                             uppercase tracking-[0.18em] text-champagne mb-4">
              Model plan feature
            </span>

            <h2 className="font-serif text-[1.8rem] font-semibold leading-tight
                           tracking-[-0.025em] text-ink max-w-[30ch]">
              Save looks from <em className="italic">any</em> brand. Access from anywhere
              <span className="text-accent">.</span>
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-muted max-w-[40ch]">
              Your digital wardrobe lets you save outfits across all brands,
              combine items from different catalogues, and revisit your looks on mobile.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/app/pricing"
                className="inline-flex items-center gap-2.5 rounded-full bg-ink
                           pl-6 pr-2.5 py-3 text-sm font-medium text-white
                           hover:opacity-90 transition-all duration-300"
              >
                Upgrade to Model — €29.99/mo
                <span className="flex h-7 w-7 items-center justify-center rounded-full
                                 bg-accent aplomb-glow">
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M2.5 8.5L8.5 2.5M8.5 2.5H3.5M8.5 2.5V7.5"
                          stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </Link>
              <Link
                href="/app"
                className="rounded-full border border-hairline-strong bg-surface px-6 py-3
                           text-sm font-medium text-ink-muted hover:bg-surface-raised
                           transition-all duration-200"
              >
                Browse brands
              </Link>
            </div>

            <p className="mt-6 text-[12px] text-ink-subtle">
              Current plan: <span className="font-medium capitalize text-ink-muted">{clientPlan}</span>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
