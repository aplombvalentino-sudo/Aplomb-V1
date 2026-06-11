"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { TiltCard } from "@/components/fx/TiltCard";
import { staggerContainer, depthItem } from "@/lib/motion";
import type { ClientPlan } from "@/lib/planLimits";

function Check({ accent }: { accent?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
         className={cn("shrink-0 mt-0.5", accent ? "text-accent" : "text-ink-subtle")}>
      <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeOpacity={0.3}/>
      <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

type ClientTier = {
  id: ClientPlan;
  name: string;
  price: string;
  /** Optional strikethrough price (promotional display) */
  originalPrice?: string;
  /** Optional small label shown next to the price, e.g. "FREE" */
  priceBadge?: string;
  period: string;
  tagline: string;
  features: string[];
  cta: string;
  recommended?: boolean;
  dark?: boolean;
};

// In-app upgrade cards. Mirror the public /pricing framing: wardrobe slots
// + personal clothing items + outfit-building depth. Sizing limits are
// absent from the headline list (they live in /app/account → Fit insights).
const TIERS: ClientTier[] = [
  {
    id: "essential",
    name: "Essential",
    price: "0",
    originalPrice: "9.99",
    priceBadge: "FREE",
    period: "/month",
    tagline: "Start your digital wardrobe — free during launch.",
    features: [
      "10 wardrobe slots",
      "Up to 3 of your own clothing items",
      "5 AI outfit try-ons per month",
      "Build and save outfits from your wardrobe",
      "Mix your clothes with certified brand pieces",
      "No payment required",
    ],
    cta: "Start my wardrobe — free",
  },
  {
    id: "fashion",
    name: "Fashion",
    price: "25.99",
    period: "/month",
    tagline: "AI styling from your saved wardrobe.",
    features: [
      "50 wardrobe slots",
      "Up to 15 of your own clothing items",
      "50 AI outfit try-ons per month",
      "50 AI outfit recommendations per month",
      "Recommendations from your wardrobe only",
      "Custom occasions & moods",
    ],
    cta: "Choose Fashion",
  },
  {
    id: "model",
    name: "Model",
    price: "29.99",
    period: "/month",
    tagline: "Cross-brand AI styling across every Aplomb brand.",
    features: [
      "Unlimited wardrobe slots",
      "Unlimited personal clothing items",
      "200 AI outfit try-ons per month",
      "Unlimited AI outfit recommendations",
      "Cross-brand recommendations across all brands",
      "Best-match discovery from the full catalogue",
    ],
    cta: "Choose Model",
    recommended: true,
    dark: true,
  },
];

export function ClientPricingCards({
  currentPlan = "essential",
  redirectAfter,
}: {
  currentPlan?: ClientPlan;
  redirectAfter?: string;
}) {
  const reduce = useReducedMotion();
  const [loadingPlan, setLoadingPlan] = useState<ClientPlan | null>(null);
  const activePlan = currentPlan;
  void redirectAfter; // legacy prop; payment now handled by checkout route

  async function choosePlan(id: ClientPlan) {
    setLoadingPlan(id);
    // Essential is free — apply instantly, no checkout.
    if (id === "essential") {
      try {
        await fetch("/api/user/plan", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "essential" }),
        });
      } catch {}
      window.location.href = "/app";
      return;
    }
    // Paid plans go through Stripe-backed checkout.
    window.location.href = `/checkout?audience=client&plan=${id}`;
  }

  return (
    <motion.div
      variants={staggerContainer(0.07)}
      initial={reduce ? false : "hidden"}
      animate="show"
      className="perspective-stage grid grid-cols-1 md:grid-cols-3 gap-5"
    >
      {TIERS.map((tier) => {
        const isActive = activePlan === tier.id;
        return (
          <motion.div key={tier.id} variants={depthItem} className="flex preserve-3d">
            <TiltCard
              liftScale={tier.recommended ? 1.025 : undefined}
              className={cn(
                "flex w-full flex-col rounded-2xl p-6 bg-surface",
                tier.recommended
                  ? "ring-2 ring-accent/30 shadow-float"
                  : "border border-hairline shadow-card"
              )}
            >
            {tier.recommended && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1
                               text-[10px] font-semibold uppercase tracking-[0.16em] whitespace-nowrap
                               bg-accent text-white">
                Most popular
              </span>
            )}

            {isActive && (
              <span className="absolute top-4 right-4 rounded-full px-2.5 py-0.5 text-[10px] font-medium
                               bg-surface-raised text-ink-subtle">
                Your plan
              </span>
            )}

            {/* Fixed-height header on md+ so feature lists start at the same Y
                across all three columns regardless of price-row/tagline shape. */}
            <div className="md:min-h-[140px]">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-subtle">
                {tier.name}
              </p>

              <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                {tier.priceBadge ? (
                  <>
                    {/* Crossed-out original price */}
                    {tier.originalPrice && (
                      <span className="font-serif text-[1.6rem] font-medium tracking-tight nums line-through
                                       decoration-[1.5px] text-ink-subtle/60 decoration-ink-subtle/50">
                        €{tier.originalPrice}
                      </span>
                    )}
                    {/* Promo "FREE" badge — keeps its green, lifted for dark */}
                    <span className="font-serif text-[2.6rem] font-medium leading-none tracking-tight text-[#346538] dark:text-emerald-300">
                      {tier.priceBadge}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[0.9rem] font-medium text-ink-subtle">€</span>
                    <span className="font-serif text-[2.8rem] font-medium leading-none tracking-tight nums text-ink">
                      {tier.price}
                    </span>
                    <span className="ml-1 self-end text-sm text-ink-subtle">
                      {tier.period}
                    </span>
                  </>
                )}
              </div>

              <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
                {tier.tagline}
              </p>
            </div>

            <ul className="mt-6 mb-8 space-y-2.5 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13px] text-ink-muted">
                  <Check accent={tier.recommended} />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => choosePlan(tier.id)}
              disabled={loadingPlan === tier.id || isActive}
              className={cn(
                "mt-auto w-full rounded-full py-3 text-sm font-medium transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                tier.recommended
                  ? "bg-accent text-white hover:bg-accent-bright"
                  : "bg-ink text-on-ink hover:bg-ink/90"
              )}
            >
              {loadingPlan === tier.id ? "Updating…" : isActive ? "Your plan" : tier.cta}
            </button>
            </TiltCard>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
