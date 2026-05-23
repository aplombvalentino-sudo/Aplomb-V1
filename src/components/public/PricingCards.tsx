"use client";

import Link from "next/link";
import { motion } from "motion/react";

const plans = [
  {
    name: "Free",
    price: "0",
    period: "/month",
    description: "For trying Aplomb on a small store.",
    features: [
      "100 fit sessions / month",
      "1 brand",
      "Web widget",
      "Basic size recommendations",
      "Email support",
    ],
    cta: "Start for free",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Pro",
    price: "99",
    period: "/month",
    description: "For growing brands that need outfit generation and analytics.",
    features: [
      "5,000 fit sessions / month",
      "3 brands",
      "Web widget + Shopify sync",
      "AI outfit recommendations",
      "Analytics dashboard",
      "Priority email support",
    ],
    cta: "Start Pro trial",
    href: "/signup?plan=pro",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Unlimited scale, custom integrations, and SLA.",
    features: [
      "Unlimited fit sessions",
      "Unlimited brands",
      "Custom 3D measurement provider",
      "Custom LLM stylist",
      "Dedicated CSM",
      "SLA & SSO",
    ],
    cta: "Contact sales",
    href: "mailto:sales@aplomb.ai",
    highlight: false,
  },
];

const ease = [0.16, 1, 0.3, 1] as const;

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.11, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export function PricingCards() {
  return (
    <div className="mt-16 grid gap-4 lg:grid-cols-3">
      {plans.map((plan, i) => (
        <motion.div
          key={plan.name}
          custom={i}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{
            y: -4,
            transition: { duration: 0.3, ease: "easeOut" },
          }}
          className="group"
        >
          {/* Outer shell — double-bezel */}
          <div
            className={`h-full rounded-[2rem] p-2 ring-1 transition-shadow duration-500
                        group-hover:shadow-[0_16px_64px_-16px_rgba(0,0,0,0.18)]
                        ${plan.highlight
                          ? "bg-[#111010] ring-black/20"
                          : "bg-black/[0.03] ring-black/[0.06]"
                        }`}
          >
            {/* Inner core */}
            <div
              className={`h-full rounded-[calc(2rem-0.5rem)] p-7 flex flex-col
                          shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]
                          ${plan.highlight
                            ? "bg-[#1a1a1a]"
                            : "bg-white"
                          }`}
            >
              {/* Plan name */}
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

              {/* Price */}
              <div className="mt-5 flex items-baseline gap-1">
                {plan.price === "Custom" ? (
                  <span className={`font-serif text-4xl font-semibold tracking-[-0.03em]
                                    ${plan.highlight ? "text-white" : "text-[#111010]"}`}>
                    Custom
                  </span>
                ) : (
                  <>
                    <span className={`self-start mt-2 text-[1.1rem] font-medium tabular-nums
                                      ${plan.highlight ? "text-white/40" : "text-[#9C9894]"}`}>$</span>
                    <span className={`font-serif text-[3.5rem] font-semibold leading-none tracking-[-0.04em] tabular-nums
                                      ${plan.highlight ? "text-white" : "text-[#111010]"}`}>
                      {plan.price}
                    </span>
                    <span className={`mb-1 self-end text-sm ${plan.highlight ? "text-white/40" : "text-[#9C9894]"}`}>
                      {plan.period}
                    </span>
                  </>
                )}
              </div>

              <p className={`mt-3 text-sm leading-relaxed
                             ${plan.highlight ? "text-white/50" : "text-[#6B6965]"}`}>
                {plan.description}
              </p>

              {/* Divider */}
              <div className={`my-6 h-px ${plan.highlight ? "bg-white/[0.08]" : "bg-black/[0.06]"}`} />

              {/* Features */}
              <ul className="flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <svg
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 ${plan.highlight ? "text-white/50" : "text-[#9C9894]"}`}
                      viewBox="0 0 16 16" fill="none"
                    >
                      <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className={plan.highlight ? "text-white/80" : "text-[#6B6965]"}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA — button-in-button */}
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
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full
                                    transition-all duration-400
                                    group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5
                                    ${plan.highlight ? "bg-black/[0.06]" : "bg-white/[0.1]"}`}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 8L8 2M8 2H3M8 2V7"
                        stroke={plan.highlight ? "#111010" : "white"}
                        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
