"use client";

import { motion } from "motion/react";
import { UpgradePrompt } from "@/components/client/UpgradePrompt";
import type { ClientPlanLimits } from "@/lib/planLimits";
import { ease } from "../helpers";
import { NumField, PhotoField, Arrow } from "../ui";
import type { MeasurementMode } from "../types";

type Gender = "" | "male" | "female" | "other";
type Style = "" | "casual" | "formal" | "sport";

/**
 * Step 2 — The big form: numeric measurements (basic + advanced), gender,
 * front/side photos, style + occasion, scan-quota counter, error banner,
 * Back/Submit buttons.
 *
 * All values + setters are driven by the parent; this component owns no
 * state, just renders + dispatches changes upward.
 */
export function MeasurementsStep({
  mode,
  heightCm, setHeightCm,
  weightKg, setWeightKg,
  chestCm, setChestCm,
  waistCm, setWaistCm,
  hipsCm, setHipsCm,
  gender, setGender,
  frontPhoto, setFrontPhoto,
  sidePhoto, setSidePhoto,
  stylePreference, setStylePreference,
  occasion, setOccasion,
  planLimits,
  scanCount,
  scanLimitReached,
  error,
  loading,
  onBack,
  onSubmit,
}: {
  mode: MeasurementMode;
  heightCm: number;
  setHeightCm: (n: number) => void;
  weightKg: number;
  setWeightKg: (n: number) => void;
  chestCm: number | "";
  setChestCm: (v: number | "") => void;
  waistCm: number | "";
  setWaistCm: (v: number | "") => void;
  hipsCm: number | "";
  setHipsCm: (v: number | "") => void;
  gender: Gender;
  setGender: (g: Gender) => void;
  frontPhoto: File | null;
  setFrontPhoto: (f: File | null) => void;
  sidePhoto: File | null;
  setSidePhoto: (f: File | null) => void;
  stylePreference: Style;
  setStylePreference: (s: Style) => void;
  occasion: string;
  setOccasion: (s: string) => void;
  planLimits: ClientPlanLimits;
  scanCount: number;
  scanLimitReached: boolean;
  error: string;
  loading: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease }}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
        Step 3 of 6 · {mode === "easy" ? "Easy" : "Advanced"} mode
      </p>
      <h2 className="mt-3 font-serif text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] text-ink">
        Your measurements.
      </h2>
      <p className="mt-3 text-[14px] text-ink-muted">
        We&apos;ll combine your inputs with the photos to estimate your size.
      </p>

      {/* Basic fields */}
      <div className="mt-7 grid grid-cols-2 gap-3">
        <NumField label="Height (cm)" value={heightCm} onChange={setHeightCm} min={120} max={230} />
        <NumField label="Weight (kg)" value={weightKg} onChange={setWeightKg} min={30} max={250} />
      </div>

      {/* Gender (optional, improves heuristic) */}
      <div className="mt-3">
        <label className="block text-[11px] font-medium text-ink-muted mb-1.5">
          Gender (optional, improves accuracy)
        </label>
        <div className="flex gap-2">
          {(["female", "male", "other"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(gender === g ? "" : g)}
              className={`rounded-full px-4 py-2 text-[13px] font-medium capitalize border transition-all duration-200 ${
                gender === g
                  ? "bg-ink text-on-ink border-ink"
                  : "bg-surface text-ink-muted border-ink/[0.1] hover:border-ink/20"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced fields */}
      {mode === "advanced" && (
        <div className="mt-5 grid grid-cols-3 gap-3">
          <NumField label="Chest (cm)" value={chestCm} onChange={setChestCm} min={60} max={180}
            help="Around the fullest part of your chest." />
          <NumField label="Waist (cm)" value={waistCm} onChange={setWaistCm} min={45} max={180}
            help="Around the narrowest part." />
          <NumField label="Hips (cm)" value={hipsCm} onChange={setHipsCm} min={70} max={200}
            help="Around the fullest part of your hips." />
        </div>
      )}

      {/* Photos */}
      <div className="mt-7 grid grid-cols-2 gap-3">
        <PhotoField
          label="Front photo"
          file={frontPhoto}
          onChange={setFrontPhoto}
          guidance="Stand straight, arms slightly out, facing the camera."
        />
        <PhotoField
          label="Side photo"
          file={sidePhoto}
          onChange={setSidePhoto}
          guidance="Turn 90°. Same pose, side profile to camera."
        />
      </div>

      {/* Style / occasion (drives outfit step downstream) */}
      <div className="mt-7 space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-ink-muted mb-1.5">Style</label>
          <div className="flex gap-2">
            {(["casual", "formal", "sport"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStylePreference(stylePreference === s ? "" : s)}
                className={`rounded-full px-4 py-2 text-[13px] font-medium capitalize border transition-all duration-200 ${
                  stylePreference === s
                    ? "bg-ink text-on-ink border-ink"
                    : "bg-surface text-ink-muted border-ink/[0.1] hover:border-ink/20"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-ink-muted mb-1.5">
            Occasion (optional)
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {planLimits.occasionPresets.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOccasion(occasion === o ? "" : o)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium border transition-all duration-200 ${
                  occasion === o
                    ? "bg-ink text-on-ink border-ink"
                    : "bg-surface text-ink-muted border-ink/[0.1] hover:border-ink/20"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
          {planLimits.customOccasion && (
            <input
              type="text"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="Or type a custom occasion…"
              className="w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-sm
                         text-ink placeholder:text-ink-subtle
                         focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          )}
        </div>
      </div>

      {/* Quota counter */}
      {planLimits.maxScansPerMonth !== Infinity && (
        <div className="mt-6 rounded-xl bg-surface border border-hairline px-4 py-3
                         flex items-center justify-between">
          <span className="text-[12px] text-ink-muted">Scans used this month</span>
          <span className="text-[13px] font-semibold text-ink tabular-nums">
            {scanCount} / {planLimits.maxScansPerMonth}
          </span>
        </div>
      )}
      {scanLimitReached && (
        <div className="mt-3">
          <UpgradePrompt
            reason={`You've used all ${planLimits.maxScansPerMonth} scans this month.`}
            targetPlan={planLimits.nextPlan ?? "model"}
            variant="inline"
          />
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-full border border-hairline-strong bg-surface px-5 py-2.5 text-sm
                     font-medium text-ink-muted hover:bg-surface/80 transition-all duration-200"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={loading || scanLimitReached}
          className="inline-flex items-center gap-2.5 rounded-full bg-ink pl-6 pr-2.5 py-3
                     text-sm font-medium text-on-ink hover:bg-ink/90 transition-all duration-300
                     disabled:opacity-50 disabled:cursor-wait"
        >
          {loading ? "Sending…" : scanLimitReached ? "Limit reached" : "Get my fit"}
          <Arrow />
        </button>
      </div>
    </motion.section>
  );
}
