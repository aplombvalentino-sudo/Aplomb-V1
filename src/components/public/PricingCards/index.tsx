"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PlanCard } from "./PlanCard";
import { brandPlans, clientPlans } from "./plans";
import { ease, duration } from "@/lib/motion";

/**
 * Public marketing pricing block. Renders an audience pill toggle
 * (brand ↔ shopper) above a 3-column grid of {@link PlanCard}s.
 *
 * Plan data + the cross-stripe invariant live in {@link ./plans};
 * the per-card visual lives in {@link ./PlanCard}.
 */
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
            <span className={`relative z-10 ${audience === opt ? "text-on-ink" : "text-ink-muted"}`}>
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
          transition={{ duration: duration.slow, ease }}
          className="perspective-stage grid gap-4 lg:grid-cols-3"
        >
          {plans.map((plan, i) => (
            <PlanCard key={plan.name} plan={plan} i={i} />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
