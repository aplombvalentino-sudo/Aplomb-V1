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
    <div className="min-h-[100dvh] bg-[#F7F6F3]">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 20%, rgba(201,168,130,0.14) 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-black/[0.07] bg-[#F7F6F3]/90
                          backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link href="/" aria-label="Aplomb — home"
          className="text-[17px] text-[#111010] hover:opacity-60 transition-opacity duration-200">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/app" className="text-[12px] text-[#7A7773] hover:text-[#111010]
                                        transition-colors">
            ← Browse
          </Link>
          <Link href="/app/pricing" className="text-[12px] text-[#7A7773] hover:text-[#111010]
                                                transition-colors">
            Plans
          </Link>
          <span aria-hidden className="h-3 w-px bg-black/10" />
          <ClientSignOutLink />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {hasAccess ? (
          <>
            <div className="mb-8">
              <span className="inline-flex items-center rounded-full border border-black/10
                               bg-white/60 px-3 py-1 text-[10px] font-medium uppercase
                               tracking-[0.18em] text-[#6B6965]">
                Model plan
              </span>
              <h1 className="mt-4 font-serif text-[2rem] font-semibold leading-[1.08]
                             tracking-[-0.025em] text-[#111010]">
                Your digital wardrobe.
              </h1>
              <p className="mt-2 text-sm text-[#6B6965]">
                Outfits you&apos;ve saved across all brands.
              </p>
            </div>
            <WardrobeClient />
          </>
        ) : (
          /* ── Upgrade gate ── */
          <div className="flex flex-col items-center text-center py-16">
            {/* Gold ring icon */}
            <div className="mb-6 h-20 w-20 rounded-full border-2 border-[#C9A882]/40
                             flex items-center justify-center">
              <div className="h-14 w-14 rounded-full border-2 border-[#C9A882]
                               flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M14 4l2.5 7H21l-6 4.5 2.5 7.5L14 19l-3.5 4 2.5-7.5L7 11h4.5L14 4z"
                        stroke="#C9A882" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <span className="inline-flex items-center rounded-full bg-[#FDF8F3]
                             border border-[#C9A882]/30 px-3 py-1 text-[10px] font-medium
                             uppercase tracking-[0.18em] text-[#C9A882] mb-4">
              Model plan feature
            </span>

            <h2 className="font-serif text-[1.8rem] font-semibold leading-tight
                           tracking-[-0.025em] text-[#111010] max-w-[30ch]">
              Save looks from any brand. Access from anywhere.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#6B6965] max-w-[40ch]">
              Your digital wardrobe lets you save outfits across all brands,
              combine items from different catalogues, and revisit your looks on mobile.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/app/pricing"
                className="inline-flex items-center gap-2.5 rounded-full bg-[#111010]
                           pl-6 pr-2.5 py-3 text-sm font-medium text-white
                           hover:bg-[#2a2a2a] transition-all duration-300"
              >
                Upgrade to Model — €29.99/mo
                <span className="flex h-7 w-7 items-center justify-center rounded-full
                                 bg-white/[0.12]">
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M2.5 8.5L8.5 2.5M8.5 2.5H3.5M8.5 2.5V7.5"
                          stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </Link>
              <Link
                href="/app"
                className="rounded-full border border-black/[0.12] bg-white px-6 py-3
                           text-sm font-medium text-[#6B6965] hover:bg-white/80
                           transition-all duration-200"
              >
                Browse brands
              </Link>
            </div>

            <p className="mt-6 text-[12px] text-[#7A7773]">
              Current plan: <span className="font-medium capitalize text-[#6B6965]">{clientPlan}</span>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
