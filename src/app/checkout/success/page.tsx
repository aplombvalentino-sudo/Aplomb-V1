import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const metadata: Metadata = { title: "Subscription confirmed — Aplomb" };

const PLAN_LABEL: Record<string, string> = {
  listed: "Listed",
  featured: "Featured",
  fashion: "Fashion",
  model: "Model",
};

type Props = { searchParams: Promise<{ session_id?: string }> };

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { session_id } = await searchParams;

  let side: "brand" | "client" = "client";
  let planLabel = "your plan";

  if (session_id && isStripeConfigured()) {
    try {
      const cs = await getStripe().checkout.sessions.retrieve(session_id);
      const meta = cs.metadata ?? {};
      if (meta.side === "brand") side = "brand";
      if (typeof meta.plan === "string" && PLAN_LABEL[meta.plan]) {
        planLabel = PLAN_LABEL[meta.plan];
      }
    } catch {
      /* fall back to generic copy */
    }
  }

  const continueHref = side === "brand" ? "/pro/dashboard" : "/app";

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <header className="sticky top-0 z-10 border-b border-hairline bg-canvas/90 backdrop-blur-md
                          px-6 py-4 flex items-center justify-between">
        <Link href="/" aria-label="Aplomb — home" className="text-[17px] text-ink hover:opacity-60 transition-opacity">
          <Logo />
        </Link>
        <span className="text-[12px] text-ink-subtle">Confirmed</span>
      </header>

      <main className="mx-auto max-w-md px-6 py-20 text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-tint)] text-accent">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="font-serif text-[2rem] font-medium leading-[1.1] tracking-[-0.02em] text-ink">
          You&apos;re on <em className="italic">{planLabel}</em>
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted max-w-[34ch] mx-auto">
          Your subscription is active and a receipt is on its way by email.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3">
          <Link
            href={continueHref}
            className="group inline-flex items-center gap-2.5 rounded-full bg-ink pl-6 pr-2.5 py-3
                       text-sm font-medium text-white hover:bg-[#2a2622] transition-all duration-300"
          >
            {side === "brand" ? "Go to dashboard" : "Start fitting"}
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent aplomb-glow
                             transition-transform duration-300 group-hover:translate-x-0.5">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
                <path d="M2.5 8.5L8.5 2.5M8.5 2.5H3.5M8.5 2.5V7.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
        </div>
      </main>
    </div>
  );
}
