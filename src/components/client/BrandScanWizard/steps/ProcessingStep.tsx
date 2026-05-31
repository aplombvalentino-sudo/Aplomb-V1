"use client";

import { motion } from "motion/react";
import { ease } from "../helpers";

/**
 * Step 3 — Skeleton placeholder while the backend pipeline runs.
 * processingStage walks 0→1→2 (every 1.2s) and the dots colour-shift
 * accordingly: champagne pulsing = current, green = done.
 */
export function ProcessingStep({ processingStage }: { processingStage: number }) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease }}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
        Step 4 of 6
      </p>
      <h2 className="mt-3 font-serif text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] text-ink">
        Reading your shape.
      </h2>

      <ul className="mt-7 space-y-3.5">
        {[
          "Analysing your photos",
          "Matching the size charts",
          "Building outfit ideas",
        ].map((label, i) => (
          <li key={label} className="flex items-center gap-3">
            <span
              className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                i < processingStage
                  ? "bg-[#346538]"
                  : i === processingStage
                    ? "bg-[#C9A882] animate-pulse"
                    : "bg-black/10"
              }`}
            />
            <span
              className={`text-[14px] ${
                i <= processingStage ? "text-ink" : "text-ink-subtle"
              }`}
            >
              {label}
            </span>
          </li>
        ))}
      </ul>

      {/* Subtle skeleton */}
      <div className="mt-10 space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[60px] rounded-2xl bg-ink/5 animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </motion.section>
  );
}
