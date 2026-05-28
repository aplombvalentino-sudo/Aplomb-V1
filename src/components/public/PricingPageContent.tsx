"use client";

import { motion } from "motion/react";
import { PricingCards } from "@/components/public/PricingCards";

const ease = [0.16, 1, 0.3, 1] as const;

export function PricingPageContent() {
  return (
    <div className="min-h-[100dvh] bg-[#F7F6F3] pt-32 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease }}
          className="max-w-2xl"
        >
          <span className="inline-flex items-center rounded-full border border-black/10 bg-white/60
                           px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#7A7773]">
            Pricing
          </span>
          <h1 className="mt-5 font-serif text-[clamp(2.4rem,4vw,3.5rem)] font-semibold
                         leading-[1.08] tracking-[-0.03em] text-[#111010]">
            Plans for brands and shoppers.
          </h1>
          <p className="mt-4 text-[17px] leading-[1.65] text-[#6B6965]">
            Brands integrate Aplomb to reduce returns.
            Shoppers find their perfect fit across the catalogue.
          </p>
        </motion.div>

        <PricingCards />

        {/* FAQ footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6, ease }}
          className="mt-12 text-center text-sm text-[#7A7773]"
        >
          No credit card required to start. Cancel anytime.
        </motion.p>
      </div>
    </div>
  );
}
