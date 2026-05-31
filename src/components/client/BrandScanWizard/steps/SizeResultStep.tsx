"use client";

import { motion } from "motion/react";
import { ease, confidenceDot, confidenceLabel } from "../helpers";
import { Arrow } from "../ui";
import type { MeasurementResponse } from "../types";

/**
 * Step 4 — The "Here's your fit" payoff screen. Renders body measurements
 * (only fields the backend returned a numeric value for) and the per-category
 * size recommendations with honest confidence dots.
 */
export function SizeResultStep({
  result,
  error,
  loading,
  onGenerate,
}: {
  result: MeasurementResponse;
  error: string;
  loading: boolean;
  onGenerate: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.5, ease }}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
        Step 5 of 6
      </p>
      <h2 className="mt-3 font-serif text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] text-ink">
        Here&apos;s your fit.
      </h2>
      <p className="mt-2 text-[13px] text-ink-subtle">
        Estimated with{" "}
        <span className="font-medium text-ink-muted">
          {result.measurements.measurementMode === "advanced" ? "Advanced" : "Easy"}
        </span>{" "}
        mode.
      </p>

      {/* Body measurements */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          ["height", result.measurements.heightCm],
          ["chest", result.measurements.chestCm],
          ["waist", result.measurements.waistCm],
          ["hips", result.measurements.hipsCm],
          ["shoulders", result.measurements.shouldersCm],
          ["inseam", result.measurements.inseamCm],
        ]
          .filter(([, v]) => typeof v === "number")
          .map(([k, v]) => {
            const source = result.measurements.sourceConfidence[k as string] ?? "ai";
            return (
              <div
                key={k as string}
                className="rounded-xl bg-white border border-hairline px-4 py-3.5"
              >
                <p className="text-[10px] uppercase tracking-[0.1em] text-ink-subtle capitalize mb-0.5">
                  {k as string}
                </p>
                <p className="font-serif text-[1.4rem] font-semibold text-ink leading-none tabular-nums">
                  {Math.round(v as number)}
                  <span className="text-[12px] font-normal text-ink-subtle ml-1">cm</span>
                </p>
                <p className="mt-1 text-[10px] text-ink-subtle">
                  {source === "manual" ? "you provided" : "estimated"}
                </p>
              </div>
            );
          })}
      </div>

      {/* Sizes per category */}
      {result.sizeRecommendations.length > 0 && (
        <div className="mt-6 rounded-2xl border border-hairline bg-stone-deep px-6 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-subtle mb-4">
            Recommended sizes
          </p>
          <ul className="divide-y divide-hairline">
            {result.sizeRecommendations.map((r) => (
              <li key={r.category} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-[13px] text-ink capitalize">{r.category}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: confidenceDot(r.confidence) }}
                    />
                    <span className="text-[10px] uppercase tracking-[0.12em] text-ink-subtle">
                      {confidenceLabel(r.confidence)}
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] text-ink-muted leading-[1.5]">{r.explanation}</p>
                </div>
                <span className="shrink-0 font-serif text-[1.6rem] font-medium text-ink leading-none nums">
                  {r.recommendedSize}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={onGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2.5 rounded-full bg-[#111010] pl-6 pr-2.5 py-3
                     text-sm font-medium text-white hover:bg-[#2a2622] transition-all duration-300
                     disabled:opacity-50 disabled:cursor-wait"
        >
          {loading ? "Building outfits…" : "See outfit ideas"}
          <Arrow />
        </button>
      </div>
    </motion.section>
  );
}
