"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

// ─── Plan data ────────────────────────────────────────────────────────────────

type Plan = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlight?: boolean;
};

const brandPlans: Plan[] = [
  {
    name: "Starter",
    price: "45",
    period: "/mo",
    description: "For independent designers and small ateliers.",
    features: [
      "Up to 50 client scans / month",
      "2 active collections",
      "Web widget",
      "Basic size charts",
      "Email support",
    ],
    cta: "Start free",
    href: "/signup",
  },
  {
    name: "Pro",
    price: "200",
    period: "/mo",
    description: "For growing brands that need full integration.",
    features: [
      "Unlimited client scans",
      "Unlimited collections",
      "Custom widget branding",
      "Outgoing webhooks",
      "Analytics dashboard",
      "Priority support",
    ],
    cta: "Choose Pro",
    href: "/signup?plan=pro",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Dedicated infrastructure and custom integrations.",
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "Custom 3D measurement provider",
      "Custom LLM stylist",
      "SLA & SSO",
    ],
    cta: "Contact sales",
    href: "mailto:sales@aplomb.ai",
  },
];

const clientPlans: Plan[] = [
  {
    name: "Essential",
    price: "9.99",
    period: "/mo",
    description: "Try Aplomb across your favourite brands.",
    features: [
      "5 body scans / month",
      "Save up to 4 looks",
      "Preset occasions",
      "Per-brand sizing",
    ],
    cta: "Start free",
    href: "/app",
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
    cta: "Browse brands",
    href: "/app",
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
    href: "/app",
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
                    group-hover:shadow-[0_16px_64px_-16px_rgba(0,0,0,0.18)]
                    ${plan.highlight
                      ? "bg-[#111010] ring-black/20"
                      : "bg-black/[0.03] ring-black/[0.06]"
                    }`}
      >
        <div
          className={`h-full rounded-[calc(2rem-0.5rem)] p-7 flex flex-col
                      shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]
                      ${plan.highlight ? "bg-[#1a1a1a]" : "bg-white"}`}
        >
          <div className="flex items-center justify-between gap-3">
            <span
              className={`text-[10px] font-medium uppercase tracking-[0.18em]
                          ${plan.highlight ? "text-white/50" : "text-[#9C9894]"}`}
            >
              {plan.name}
            </span>
            {plan.highlight && (
              <span className="text-[10px] text-white/30 tracking-[0.1em] italic">
                ← most chosen
              </span>
            )}
          </div>

          <div className="mt-5 flex items-baseline gap-1">
            {plan.price === "Custom" ? (
              <span
                className={`font-serif text-4xl font-semibold tracking-[-0.03em]
                            ${plan.highlight ? "text-white" : "text-[#111010]"}`}
              >
                Custom
              </span>
            ) : (
              <>
                <span
                  className={`self-start mt-2 text-[1.1rem] font-medium tabular-nums
                              ${plan.highlight ? "text-white/40" : "text-[#9C9894]"}`}
                >
                  €
                </span>
                <span
                  className={`font-serif text-[3.5rem] font-semibold leading-none tracking-[-0.04em] tabular-nums
                              ${plan.highlight ? "text-white" : "text-[#111010]"}`}
                >
                  {plan.price}
                </span>
                <span
                  className={`mb-1 self-end text-sm ${plan.highlight ? "text-white/40" : "text-[#9C9894]"}`}
                >
                  {plan.period}
                </span>
              </>
            )}
          </div>

          <p
            className={`mt-3 text-sm leading-relaxed
                       ${plan.highlight ? "text-white/50" : "text-[#6B6965]"}`}
          >
            {plan.description}
          </p>

          <div className={`my-6 h-px ${plan.highlight ? "bg-white/[0.08]" : "bg-black/[0.06]"}`} />

          <ul className="flex-1 space-y-3">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm">
                <svg
                  className={`mt-0.5 h-4 w-4 flex-shrink-0 ${plan.highlight ? "text-white/50" : "text-[#9C9894]"}`}
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
                <span className={plan.highlight ? "text-white/80" : "text-[#6B6965]"}>{f}</span>
              </li>
            ))}
          </ul>

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="mt-8">
            <Link
              href={plan.href}
              className={`group/btn inline-flex w-full items-center justify-between
                          rounded-full px-5 py-3 text-sm font-medium
                          transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]
                          ${plan.highlight
                            ? "bg-white text-[#111010] hover:bg-[#F7F6F3]"
                            : "bg-[#111010] text-white hover:bg-[#2a2a2a]"
                          }`}
            >
              {plan.cta}
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full
                            transition-all duration-400
                            group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5
                            ${plan.highlight ? "bg-black/[0.06]" : "bg-white/[0.1]"}`}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                  <path
                    d="M2 8L8 2M8 2H3M8 2V7"
                    stroke={plan.highlight ? "#111010" : "white"}
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
      <div className="mx-auto mb-12 flex w-fit items-center gap-1 rounded-full bg-black/[0.04]
                      p-1 ring-1 ring-black/[0.06]">
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
                className="absolute inset-0 rounded-full bg-[#111010]"
                transition={{ type: "spring", stiffness: 420, damping: 40 }}
              />
            )}
            <span className={`relative z-10 ${audience === opt ? "text-white" : "text-[#6B6965]"}`}>
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
