"use client";

import { motion } from "motion/react";
import { ease } from "../helpers";
import { ModeCard, Arrow } from "../ui";
import type { MeasurementMode } from "../types";

/**
 * Step 1 — Easy vs Advanced mode picker. Drives whether the form on
 * Step 2 asks for chest/waist/hips.
 */
export function ModeStep({
  mode,
  setMode,
  onBack,
  onNext,
}: {
  mode: MeasurementMode;
  setMode: (m: MeasurementMode) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease }}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
        Step 2 of 6
      </p>
      <h2 className="mt-3 font-serif text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] text-ink">
        Choose your measurement mode.
      </h2>
      <p className="mt-3 text-[14px] text-ink-muted">
        You can switch later in your wardrobe.
      </p>

      <div className="mt-7 grid gap-3">
        <ModeCard
          active={mode === "easy"}
          onClick={() => setMode("easy")}
          title="Easy"
          body="Fast estimate using your height, weight, and 2 photos."
          tags={["Faster", "Recommended for most users"]}
        />
        <ModeCard
          active={mode === "advanced"}
          onClick={() => setMode("advanced")}
          title="Advanced"
          body="More precise result using your height, weight, 2 photos, plus chest/waist/hips."
          tags={["More precise", "Best fit accuracy"]}
        />
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-full border border-hairline-strong bg-white px-5 py-2.5
                     text-sm font-medium text-ink-muted hover:bg-white/80 transition-all duration-200"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2.5 rounded-full bg-[#111010] pl-6 pr-2.5 py-3
                     text-sm font-medium text-white hover:bg-[#2a2622] transition-all duration-300"
        >
          Continue with {mode === "easy" ? "Easy" : "Advanced"}
          <Arrow />
        </button>
      </div>
    </motion.section>
  );
}
