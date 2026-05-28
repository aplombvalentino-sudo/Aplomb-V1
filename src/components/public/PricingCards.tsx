"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

// ─── Plan data ────────────────────────────────────────────────────────────────

type Plan = {
  name: string;
  price: string;
  /** Optional strikethrough price (promotional display) */
  originalPrice?: string;
  /** Optional label that replaces the numeric price, e.g. "FREE" */
  priceBadge?: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlight?: boolean;
};

const brandPlans: Plan[] = [
  {
    name: "Listed",
    price: "45",
    period: "/mo",
    description: "Be present on the platform with a basic listing.",
    features: [
      "Up to 2 active collections",
      "1,000 shopper scans / month",
      "Brand profile page",
      "Catalog & size chart upload",
      "Standard search visibility",
      "Basic analytics",
    ],
    cta: "Get Listed",
    href: "/signup?audience=brand&plan=listed",
  },
  {
    name: "Featured",
    price: "200",
    period: "/mo",
    description: "Strong visibility and marketplace growth.",
    features: [
      "Unlimited collections",
      "10,000 shopper scans / month",
      "Eligible for Top Brands placement",
      "Enhanced analytics dashboard",
      "Product & outfit insights",
      "Priority ranking & featured badge",
    ],
    cta: "Get Featured",
    href: "/signup?audience=brand&plan=featured",
    highlight: true,
  },
  {
    name: "Premier",
    price: "Custom",
    period: "",
    description: "Custom exposure and dedicated growth support.",
    features: [
      "Everything in Featured",
      "Custom monthly exposure quota",
      "Custom placement opportunities",
      "Dedicated onboarding & support",
      "Custom integrations",
      "Optional merchandising support",
    ],
    cta: "Contact team",
    href: "/signup?audience=brand&plan=premier",
  },
];

const clientPlans: Plan[] = [
  {
    name: "Essential",
    price: "0",
    originalPrice: "9.99",
    priceBadge: "FREE",
    period: "/mo",
    description: "Free during launch — try Aplomb across your favourite brands.",
    features: [
      "5 body scans / month",
      "Save up to 4 looks",
      "Preset occasions",
      "Per-brand sizing",
      "No payment required",
    ],
    cta: "Get Essential — free",
    href: "/signup?audience=client&plan=essential",
  },
  {
    name: "Fashion",
    price: "25.99",
    period: "/mo",
    description: "For active shoppers who care about fit.",
    features: [
      "15 body scans / month",
      "Save up to 10 looks",
      "Custom occasions",
      "Extended preset library",
    ],
    cta: "Get Fashion",
    href: "/signup?audience=client&plan=fashion",
  },
  {
    name: "Model",
    price: "29.99",
    period: "/mo",
    description: "Unlimited scans and full digital wardrobe.",
    features: [
      "Unlimited body scans",
      "Unlimited wardrobe",
      "Cross-brand outfit composer",
      "Mobile wardrobe sync",
      "Custom colour picker",
    ],
    cta: "Get Model",
    href: "/signup?audience=client&plan=model",
    highlight: true,
  },
];

// ─── Card ─────────────────────────────────────────────────────────────────────

const cardEase = [0.16, 1, 0.3, 1] as const;

function PlanCard({ plan, i }: { plan: Plan; i: number }) {
  return (
    <motion.div
      custom={i}
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: i * 0.08, ease: cardEase }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <div
        className={`h-full rounded-[2rem] p-2 ring-1 transition-shadow duration-500
                    group-hover:shadow-[0_18px_56px_-20px_rgba(17,16,16,0.20)]
                    ${plan.highlight
                      ? "bg-[var(--accent-tint)] ring-accent/30"
                      : "bg-ink/[0.02] ring-hairline"
                    }`}
      >
        <div className="h-full rounded-[calc(2rem-0.5rem)] p-7 flex flex-col bg-surface">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
              {plan.name}
            </span>
            {plan.highlight && (
              <span className="font-serif text-[12px] italic tracking-[0.02em] text-accent">
                most chosen
              </span>
            )}
          </div>

          <div className="mt-5 flex items-baseline gap-2 flex-wrap">
            {plan.price === "Custom" ? (
              <span className="font-serif text-4xl font-medium tracking-[-0.02em] text-ink">
                Custom
              </span>
            ) : plan.priceBadge ? (
              <>
                {plan.originalPrice && (
                  <span className="font-serif text-[1.8rem] font-medium tracking-tight nums
                                   line-through decoration-[1.5px] text-ink-subtle/60 decoration-ink-subtle/50">
                    €{plan.originalPrice}
                  </span>
                )}
                <span className="font-serif text-[3.2rem] font-medium leading-none tracking-[-0.03em] text-[#346538]">
                  {plan.priceBadge}
                </span>
              </>
            ) : (
              <>
                <span className="self-start mt-2 text-[1.1rem] font-medium nums text-ink-subtle">
                  €
                </span>
                <span className="font-serif text-[3.5rem] font-medium leading-none tracking-[-0.03em] nums text-ink">
                  {plan.price}
                </span>
                <span className="mb-1 self-end text-sm text-ink-subtle">
                  {plan.period}
                </span>
              </>
            )}
          </div>

          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            {plan.description}
          </p>

          <div className="my-6 h-px bg-hairline" />

          <ul className="flex-1 space-y-3">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm">
                <svg
                  className={`mt-0.5 h-4 w-4 flex-shrink-0 ${plan.highlight ? "text-accent" : "text-ink-subtle"}`}
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M3 8l3.5 3.5L13 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-ink-muted">{f}</span>
              </li>
            ))}
          </ul>

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="mt-8">
            <Link
              href={plan.href}
              className={`group/btn inline-flex w-full items-center justify-between
                          rounded-full px-5 py-3 text-sm font-medium text-white
                          transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]
                          ${plan.highlight
                            ? "bg-accent hover:bg-accent-bright"
                            : "bg-ink hover:bg-[#2a2622]"
                          }`}
            >
              {plan.cta}
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full
                            transition-all duration-400
                            group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5
                            ${plan.highlight ? "bg-white/20" : "bg-accent aplomb-glow"}`}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                  <path
                    d="M2 8L8 2M8 2H3M8 2V7"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function PricingCards() {
  const [audience, setAudience] = useState<"brand" | "client">("brand");
  const plans = audience === "brand" ? brandPlans : clientPlans;

  return (
    <div className="mt-12">
      {/* Toggle */}
      <div className="mx-auto mb-12 flex w-fit items-center gap-1 rounded-full bg-ink/5
                      p-1 ring-1 ring-hairline">
        {(["brand", "client"] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => setAudience(opt)}
            className="relative rounded-full px-5 py-2 text-[13px] font-medium
                       transition-colors duration-200"
          >
            {audience === opt && (
              <motion.span
                layoutId="audience-pill"
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: "spring", stiffness: 420, damping: 40 }}
              />
            )}
            <span className={`relative z-10 ${audience === opt ? "text-white" : "text-ink-muted"}`}>
              {opt === "brand" ? "For brands" : "For shoppers"}
            </span>
          </button>
        ))}
      </div>

      {/* Cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={audience}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: cardEase }}
          className="grid gap-4 lg:grid-cols-3"
        >
          {plans.map((plan, i) => (
            <PlanCard key={plan.name} plan={plan} i={i} />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
