"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { ClientPlan } from "@/lib/planLimits";

const PLAN_LABELS: Record<ClientPlan, string> = {
  essential: "Essential",
  fashion: "Fashion",
  model: "Model",
};

const PLAN_PRICES: Record<ClientPlan, string> = {
  essential: "€9.99/mo",
  fashion: "€25.99/mo",
  model: "€29.99/mo",
};

type UpgradePromptProps = {
  reason: string;
  targetPlan: ClientPlan;
  /** Inline variant = compact banner. Modal variant = centered overlay. */
  variant?: "inline" | "modal";
  onDismiss?: () => void;
};

export function UpgradePrompt({
  reason,
  targetPlan,
  variant = "inline",
  onDismiss,
}: UpgradePromptProps) {
  if (variant === "modal") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40
                   backdrop-blur-sm px-4"
        onClick={(e) => e.target === e.currentTarget && onDismiss?.()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm rounded-2xl bg-white border border-black/[0.06]
                     shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] p-7 text-center"
        >
          {/* Gold accent ring */}
          <div className="mx-auto mb-5 h-14 w-14 rounded-full flex items-center
                           justify-center ring-2 ring-[#C9A882]">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 2l2.5 6.5H20l-5.5 4 2 6.5L11 15l-5.5 4 2-6.5L2 8.5h6.5L11 2z"
                    stroke="#C9A882" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>

          <h3 className="font-serif text-[1.35rem] font-semibold text-[#111010] leading-tight">
            Upgrade to {PLAN_LABELS[targetPlan]}
          </h3>
          <p className="mt-2 text-sm text-[#6B6965] leading-relaxed">{reason}</p>

          <div className="mt-5 space-y-2">
            <Link
              href={`/app/pricing`}
              className="block w-full rounded-xl bg-[#111010] py-3 text-sm font-medium
                         text-white hover:bg-[#2a2a2a] transition-colors duration-200"
            >
              See plans — from {PLAN_PRICES[targetPlan]}
            </Link>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="block w-full rounded-xl py-3 text-sm font-medium text-[#9C9894]
                           hover:text-[#111010] transition-colors duration-200"
              >
                Maybe later
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Inline banner
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#C9A882]/40 bg-[#FDF8F3] px-4 py-3.5
                 flex items-start gap-3"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
        <path d="M8 1.5l1.8 4.7H14l-4 2.9 1.5 4.7L8 11l-3.5 2.8 1.5-4.7-4-2.9h4.2L8 1.5z"
              stroke="#C9A882" strokeWidth="1.3" strokeLinejoin="round"/>
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#4a3f35]">{reason}</p>
        <Link
          href="/app/pricing"
          className="mt-1 inline-block text-[12px] text-[#C9A882] hover:text-[#b8956e]
                     underline underline-offset-2 transition-colors"
        >
          Upgrade to {PLAN_LABELS[targetPlan]} — {PLAN_PRICES[targetPlan]}
        </Link>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-[#C9C5C0] hover:text-[#9C9894]
                                               transition-colors shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </motion.div>
  );
}
