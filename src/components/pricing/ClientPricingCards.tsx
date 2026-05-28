"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import type { ClientPlan } from "@/lib/planLimits";

const ease = [0.16, 1, 0.3, 1] as const;

function Check({ dark }: { dark?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
      <circle cx="7" cy="7" r="6.5" stroke="currentColor"
              strokeOpacity={dark ? 0.3 : 0.2}/>
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

const TIERS: ClientTier[] = [
  {
    id: "essential",
    name: "Essential",
    price: "0",
    originalPrice: "9.99",
    priceBadge: "FREE",
    period: "/month",
    tagline: "Free during launch — start finding your perfect fit.",
    features: [
      "5 scans per month",
      "3 preset occasion styles",
      "Save up to 4 looks",
      "Single-brand outfits",
      "Standard color palettes",
      "No payment required",
    ],
    cta: "Get Essential — free",
  },
  {
    id: "fashion",
    name: "Fashion",
    price: "25.99",
    period: "/month",
    tagline: "More outfits, more style choices.",
    features: [
      "15 scans per month",
      "6 occasion presets + custom input",
      "Save up to 10 looks",
      "Single-brand outfits",
      "Extended color palettes",
    ],
    cta: "Choose Fashion",
  },
  {
    id: "model",
    name: "Model",
    price: "29.99",
    period: "/month",
    tagline: "Unlimited. Cross-brand. Your wardrobe.",
    features: [
      "Unlimited scans",
      "Custom occasions (free text)",
      "Full color picker",
      "Cross-brand outfit creation",
      "Unlimited digital wardrobe",
      "Mobile wardrobe access",
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {TIERS.map((tier, i) => {
        const isActive = activePlan === tier.id;
        return (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.07, ease }}
            className={cn(
              "relative flex flex-col rounded-2xl p-6 transition-shadow duration-300",
              tier.dark
                ? "bg-[#111010] text-white ring-1 ring-white/10 shadow-[0_8px_48px_-8px_rgba(0,0,0,0.35)]"
                : "bg-white border border-black/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.04)]",
              tier.recommended && !tier.dark && "ring-2 ring-[#C9A882]"
            )}
          >
            {tier.recommended && (
              <span className={cn(
                "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1",
                "text-[10px] font-semibold uppercase tracking-[0.16em] whitespace-nowrap",
                tier.dark
                  ? "bg-[#C9A882] text-[#2a1f14]"
                  : "bg-[#111010] text-white"
              )}>
                Most popular
              </span>
            )}

            {isActive && (
              <span className={cn(
                "absolute top-4 right-4 rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                tier.dark ? "bg-white/10 text-white/60" : "bg-[#F7F6F3] text-[#7A7773]"
              )}>
                Your plan
              </span>
            )}

            <div>
              <p className={cn(
                "text-[11px] font-medium uppercase tracking-[0.16em]",
                tier.dark ? "text-white/40" : "text-[#7A7773]"
              )}>
                {tier.name}
              </p>

              <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                {tier.priceBadge ? (
                  <>
                    {/* Crossed-out original price */}
                    {tier.originalPrice && (
                      <span className={cn(
                        "font-serif text-[1.6rem] font-medium tracking-tight tabular-nums line-through decoration-[1.5px]",
                        tier.dark ? "text-white/30 decoration-white/40" : "text-[#C9C5C0] decoration-[#C9C5C0]"
                      )}>
                        €{tier.originalPrice}
                      </span>
                    )}
                    {/* Promo "FREE" badge */}
                    <span className={cn(
                      "font-serif text-[2.6rem] font-semibold leading-none tracking-tight",
                      tier.dark ? "text-white" : "text-[#346538]"
                    )}>
                      {tier.priceBadge}
                    </span>
                  </>
                ) : (
                  <>
                    <span className={cn(
                      "text-[0.9rem] font-medium",
                      tier.dark ? "text-white/50" : "text-[#7A7773]"
                    )}>€</span>
                    <span className={cn(
                      "font-serif text-[2.8rem] font-semibold leading-none tracking-tight tabular-nums",
                      tier.dark ? "text-white" : "text-[#111010]"
                    )}>
                      {tier.price}
                    </span>
                    <span className={cn(
                      "ml-1 self-end text-sm",
                      tier.dark ? "text-white/40" : "text-[#7A7773]"
                    )}>
                      {tier.period}
                    </span>
                  </>
                )}
              </div>

              <p className={cn(
                "mt-3 text-[13px] leading-relaxed",
                tier.dark ? "text-white/50" : "text-[#6B6965]"
              )}>
                {tier.tagline}
              </p>
            </div>

            <ul className="mt-6 mb-8 space-y-2.5 flex-1">
              {tier.features.map((f) => (
                <li key={f} className={cn(
                  "flex items-start gap-2 text-[13px]",
                  tier.dark ? "text-white/70" : "text-[#6B6965]"
                )}>
                  <Check dark={tier.dark} />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => choosePlan(tier.id)}
              disabled={loadingPlan === tier.id || isActive}
              className={cn(
                "w-full rounded-xl py-3 text-sm font-medium transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                tier.dark
                  ? "bg-[#C9A882] text-[#111010] hover:bg-[#d4b48e]"
                  : "bg-[#111010] text-white hover:bg-[#2a2a2a]"
              )}
            >
              {loadingPlan === tier.id ? "Updating…" : isActive ? "Your plan" : tier.cta}
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
