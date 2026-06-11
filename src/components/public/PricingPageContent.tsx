"use client";

import { motion } from "motion/react";
import { PricingCards } from "@/components/public/PricingCards";
import { ease } from "@/lib/motion";

export function PricingPageContent() {
  return (
    <div className="min-h-[100dvh] bg-canvas pt-32 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease }}
          className="max-w-2xl"
        >
          <span className="inline-flex items-center rounded-full border border-hairline bg-surface/60
                           px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
            Pricing
          </span>
          <h1 className="mt-5 font-serif text-[clamp(2.4rem,4vw,3.5rem)] font-medium
                         leading-[1.08] tracking-[-0.02em] text-ink">
            A wardrobe plan for every <em className="italic">shopper</em><span className="text-accent">.</span>
          </h1>
          <p className="mt-4 text-[17px] leading-[1.65] text-ink-muted">
            Start free and build your digital wardrobe. Upgrade when you want
            more slots, more personal uploads, or the full outfit-building
            toolkit. Plans for brands integrating Aplomb are below.
          </p>
        </motion.div>

        <PricingCards />

        {/* FAQ footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6, ease }}
          className="mt-12 text-center text-sm text-ink-subtle"
        >
          No credit card required to start. Cancel anytime.
        </motion.p>
      </div>
    </div>
  );
}
