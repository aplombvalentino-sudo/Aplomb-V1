"use client";

/**
 * Brand-side AI fitting room wizard.
 *
 * Steps:
 *   0  Consent + privacy
 *   1  Mode select (Easy / Advanced)
 *   2  Measurement form + photo capture
 *   3  Processing (skeleton)
 *   4  Size recommendations
 *   5  Outfit suggestions + Try-on
 *
 * Design notes (anti-AI-slop):
 *   - No gradients, no glow blobs, no purple/cyan.
 *   - Honest confidence levels surfaced on every size suggestion.
 *   - Compact left-aligned forms; no centered-everywhere layouts.
 *   - Photos held only in private storage; never displayed back to the user.
 *
 * Module layout:
 *   index.tsx     — this file (state, handlers, step switch, modals)
 *   types.ts      — API DTOs
 *   helpers.ts    — pure rendering helpers (confidence dot/label)
 *   ui.tsx       — presentational primitives (StepDots, ModeCard, NumField,
 *                   PhotoField, Dot, Arrow)
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { UpgradePrompt } from "@/components/client/UpgradePrompt";
import { ClientSignOutLink } from "@/components/client/ClientSignOutLink";
import { type ClientPlan, getClientPlanLimits } from "@/lib/planLimits";
import type { WardrobeOutfit } from "@/components/client/WardrobeClient";

import type {
  Brand,
  Product,
  MeasurementResponse,
  OutfitDTO,
  MeasurementMode,
} from "./types";
import { confidenceDot, confidenceLabel } from "./helpers";
import { StepDots, ModeCard, NumField, PhotoField, Dot, Arrow } from "./ui";
import { postMeasurements, postOutfits, postTryOn } from "./wizardApi";
import {
  loadWardrobe,
  saveWardrobe,
  getScanCount as readScanCount,
  setScanCount as persistScanCount,
} from "./wardrobeStorage";

const ease = [0.16, 1, 0.3, 1] as const;

// ─────────────────────────────────────────────────────────────────────────────

export function BrandScanWizard({
  brand,
  productsByCategory,
  clientPlan = "essential",
  widgetMode = false,
}: {
  brand: Brand;
  productsByCategory: Record<string, Product[]>;
  clientPlan?: ClientPlan;
  /**
   * When true, hides every cross-brand link (← All brands, Browse more brands,
   * View wardrobe, Sign out). Use for embedded iframe widget renders so the
   * shopper stays on the host brand's experience.
   */
  widgetMode?: boolean;
}) {
  const planLimits = getClientPlanLimits(clientPlan);

  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [mode, setMode] = useState<MeasurementMode>("easy");
  const [scanCount, setScanCount] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Form state
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [heightCm, setHeightCm] = useState(170);
  const [weightKg, setWeightKg] = useState(65);
  const [chestCm, setChestCm] = useState<number | "">("");
  const [waistCm, setWaistCm] = useState<number | "">("");
  const [hipsCm, setHipsCm] = useState<number | "">("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [sidePhoto, setSidePhoto] = useState<File | null>(null);

  const [occasion, setOccasion] = useState("");
  const [stylePreference, setStylePreference] = useState<"" | "casual" | "formal" | "sport">("");

  const [result, setResult] = useState<MeasurementResponse | null>(null);
  const [outfits, setOutfits] = useState<OutfitDTO[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [tryOnByItem, setTryOnByItem] = useState<Record<string, { url?: string; loading?: boolean; error?: string }>>({});
  const [activeTryOn, setActiveTryOn] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [processingStage, setProcessingStage] = useState(0); // 0..2

  const totalProducts = useMemo(
    () => Object.values(productsByCategory).flat().length,
    [productsByCategory],
  );

  useEffect(() => {
    setScanCount(readScanCount());
  }, []);

  const scanLimitReached =
    planLimits.maxScansPerMonth !== Infinity && scanCount >= planLimits.maxScansPerMonth;

  // ── Submit measurements ──────────────────────────────────────────────────
  async function submitMeasurements() {
    if (!frontPhoto || !sidePhoto) {
      setError("Please add both your front and side photos.");
      return;
    }
    if (scanLimitReached) {
      setShowUpgrade(true);
      return;
    }
    if (mode === "advanced" && (!chestCm || !waistCm || !hipsCm)) {
      setError("Advanced mode needs your chest, waist, and hips measurements.");
      return;
    }

    setError("");
    setStep(3);
    setLoading(true);
    setProcessingStage(0);

    const stages = setInterval(() => setProcessingStage((s) => Math.min(s + 1, 2)), 1200);

    try {
      const json = await postMeasurements({
        brandSlug: brand.slug,
        mode,
        heightCm,
        weightKg,
        chestCm: typeof chestCm === "number" ? chestCm : undefined,
        waistCm: typeof waistCm === "number" ? waistCm : undefined,
        hipsCm: typeof hipsCm === "number" ? hipsCm : undefined,
        gender: gender || undefined,
        frontImage: frontPhoto,
        sideImage: sidePhoto,
      });

      if (!json.success) {
        setError(json.error?.message ?? "Measurement failed.");
        setLoading(false);
        setStep(2);
        clearInterval(stages);
        return;
      }

      setResult(json.data);
      const next = scanCount + 1;
      persistScanCount(next);
      setScanCount(next);
      clearInterval(stages);
      setStep(4);
    } catch {
      setError("Unexpected error. Please try again.");
      setStep(2);
      clearInterval(stages);
    }

    setLoading(false);
  }

  // ── Generate outfits ─────────────────────────────────────────────────────
  async function generateOutfits() {
    if (!result) return;
    setLoading(true);
    setError("");
    try {
      const json = await postOutfits({
        brandSlug: brand.slug,
        recommendationSessionId: result.recommendationSessionId,
        occasion: occasion || undefined,
        stylePreference: stylePreference || undefined,
        sessionToken: result.sessionToken,
      });
      if (!json.success) {
        setError(json.error?.message ?? "Could not generate outfits.");
        setLoading(false);
        return;
      }
      setOutfits(json.data?.outfits ?? []);
      setStep(5);
    } catch {
      setError("Unexpected error. Please try again.");
    }
    setLoading(false);
  }

  // ── Try-on ────────────────────────────────────────────────────────────────
  async function runTryOn(itemId: string) {
    if (!result) return;
    setTryOnByItem((s) => ({ ...s, [itemId]: { loading: true } }));
    try {
      const json = await postTryOn({
        outfitItemId: itemId,
        bodyProfileId: result.bodyProfileId,
        sessionToken: result.sessionToken,
      });
      if (!json.success) {
        setTryOnByItem((s) => ({ ...s, [itemId]: { error: json.error?.message ?? "Try-on failed." } }));
        return;
      }
      setTryOnByItem((s) => ({ ...s, [itemId]: { url: json.data.imageUrl } }));
      setActiveTryOn(json.data.imageUrl);
    } catch {
      setTryOnByItem((s) => ({ ...s, [itemId]: { error: "Try-on failed." } }));
    }
  }

  // ── Save outfit to wardrobe ──────────────────────────────────────────────
  function saveToWardrobe(outfit: OutfitDTO) {
    if (!result) return;
    const existing = loadWardrobe();
    if (
      planLimits.maxWardrobeSaves !== Infinity &&
      existing.length >= planLimits.maxWardrobeSaves
    ) {
      setShowUpgrade(true);
      return;
    }
    if (existing.some((o) => o.id === outfit.id)) {
      setSavedIds((s) => new Set([...s, outfit.id]));
      return;
    }
    const sizeFor = (cat: string | null) =>
      result.sizeRecommendations.find(
        (r) => cat && r.category.toLowerCase().includes(cat.toLowerCase()),
      )?.recommendedSize ??
      result.sizeRecommendations[0]?.recommendedSize ??
      "—";
    const entry: WardrobeOutfit = {
      id: outfit.id,
      brandName: brand.name,
      brandSlug: brand.slug,
      savedAt: new Date().toISOString(),
      items: outfit.items.map((it) => ({
        name: it.product.name,
        size: it.productVariant?.sizeLabel ?? sizeFor(it.product.category),
        category: it.position,
      })),
    };
    saveWardrobe([entry, ...existing]);
    setSavedIds((s) => new Set([...s, outfit.id]));
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[100dvh] bg-[#F6F3EE]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-black/[0.07] bg-[#F6F3EE]/90
                          backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center overflow-hidden ring-1 ring-black/10"
            style={{ background: brand.primaryColor + "22" }}
          >
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt={brand.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[11px] font-semibold" style={{ color: brand.primaryColor }}>
                {brand.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-[14px] font-semibold text-ink">{brand.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <StepDots total={6} current={step} />
          {!widgetMode && (
            <>
              <Link
                href="/app"
                className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200"
              >
                ← All brands
              </Link>
              <span aria-hidden className="h-3 w-px bg-black/10" />
              <ClientSignOutLink />
            </>
          )}
          {widgetMode && (
            <span className="text-[10px] uppercase tracking-[0.14em] text-ink-subtle">
              Powered by Aplomb
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <AnimatePresence mode="wait">
          {/* ── 0  Consent ─────────────────────────────────────────────── */}
          {step === 0 && (
            <motion.section
              key="s0"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease }}
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
                Step 1 of 6
              </p>
              <h1 className="mt-3 font-serif text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] text-ink">
                Before we start.
              </h1>
              <p className="mt-3 text-[14px] leading-[1.6] text-ink-muted max-w-[52ch]">
                We&apos;ll take two photos to estimate your body measurements. Photos are
                stored privately, used once for measurement and try-on, and never shared
                with third parties or shown publicly. You can delete your scan at any time.
              </p>

              <ul className="mt-6 space-y-2 text-[13px] text-ink">
                <li className="flex gap-2.5">
                  <Dot />
                  Photos go to a private storage bucket — never indexed or public.
                </li>
                <li className="flex gap-2.5">
                  <Dot />
                  We only keep derived measurements after the scan completes.
                </li>
                <li className="flex gap-2.5">
                  <Dot />
                  You control retention — delete from your wardrobe at any time.
                </li>
              </ul>

              <label className="mt-7 flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#111010]"
                />
                <span className="text-[13px] text-ink leading-[1.5]">
                  I agree to the body-scan privacy terms above.
                </span>
              </label>

              <div className="mt-8">
                <button
                  onClick={() => setStep(1)}
                  disabled={!consentAccepted || totalProducts === 0}
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#111010]
                             pl-6 pr-2.5 py-3 text-sm font-medium text-white
                             hover:bg-[#2a2622] transition-all duration-300
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Start
                  <Arrow />
                </button>
              </div>
            </motion.section>
          )}

          {/* ── 1  Mode select ─────────────────────────────────────────── */}
          {step === 1 && (
            <motion.section
              key="s1"
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
                  onClick={() => setStep(0)}
                  className="rounded-full border border-hairline-strong bg-white px-5 py-2.5
                             text-sm font-medium text-ink-muted hover:bg-white/80 transition-all duration-200"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#111010] pl-6 pr-2.5 py-3
                             text-sm font-medium text-white hover:bg-[#2a2622] transition-all duration-300"
                >
                  Continue with {mode === "easy" ? "Easy" : "Advanced"}
                  <Arrow />
                </button>
              </div>
            </motion.section>
          )}

          {/* ── 2  Form + photos ───────────────────────────────────────── */}
          {step === 2 && (
            <motion.section
              key="s2"
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
                          ? "bg-[#111010] text-white border-[#111010]"
                          : "bg-white text-ink-muted border-black/[0.1] hover:border-black/20"
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
                            ? "bg-[#111010] text-white border-[#111010]"
                            : "bg-white text-ink-muted border-black/[0.1] hover:border-black/20"
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
                            ? "bg-[#111010] text-white border-[#111010]"
                            : "bg-white text-ink-muted border-black/[0.1] hover:border-black/20"
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
                      className="w-full rounded-xl border border-black/[0.1] bg-white px-4 py-3 text-sm
                                 text-ink placeholder:text-ink-subtle
                                 focus:outline-none focus:ring-2 focus:ring-[#111010]/10"
                    />
                  )}
                </div>
              </div>

              {/* Quota counter */}
              {planLimits.maxScansPerMonth !== Infinity && (
                <div className="mt-6 rounded-xl bg-white border border-hairline px-4 py-3
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
                <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-8 flex items-center gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="rounded-full border border-hairline-strong bg-white px-5 py-2.5 text-sm
                             font-medium text-ink-muted hover:bg-white/80 transition-all duration-200"
                >
                  Back
                </button>
                <button
                  onClick={submitMeasurements}
                  disabled={loading || scanLimitReached}
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#111010] pl-6 pr-2.5 py-3
                             text-sm font-medium text-white hover:bg-[#2a2622] transition-all duration-300
                             disabled:opacity-50 disabled:cursor-wait"
                >
                  {loading ? "Sending…" : scanLimitReached ? "Limit reached" : "Get my fit"}
                  <Arrow />
                </button>
              </div>
            </motion.section>
          )}

          {/* ── 3  Processing ──────────────────────────────────────────── */}
          {step === 3 && (
            <motion.section
              key="s3"
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
          )}

          {/* ── 4  Size results ────────────────────────────────────────── */}
          {step === 4 && result && (
            <motion.section
              key="s4"
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
                  onClick={generateOutfits}
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
          )}

          {/* ── 5  Outfits + try-on ────────────────────────────────────── */}
          {step === 5 && (
            <motion.section
              key="s5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease }}
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
                Step 6 of 6
              </p>
              <h2 className="mt-3 font-serif text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] text-ink">
                {outfits.length > 0
                  ? `${outfits.length} look${outfits.length === 1 ? "" : "s"} picked for you.`
                  : "No outfits available yet."}
              </h2>

              {outfits.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-hairline bg-white py-12 text-center">
                  <p className="text-ink-muted">Not enough products to build an outfit yet.</p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {outfits.map((outfit, i) => (
                    <article
                      key={outfit.id}
                      className="rounded-2xl bg-white border border-hairline shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0">
                          <p className="text-[11px] text-ink-subtle uppercase tracking-[0.12em] font-medium mb-0.5">
                            Look {i + 1}
                          </p>
                          <p className="text-[15px] font-semibold text-ink">{outfit.title}</p>
                          {outfit.description && (
                            <p className="mt-0.5 text-[12px] text-ink-subtle">{outfit.description}</p>
                          )}
                        </div>
                      </div>

                      <ul className="divide-y divide-black/[0.05]">
                        {outfit.items.map((item) => {
                          const t = tryOnByItem[item.id];
                          return (
                            <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0">
                              {/* Product thumbnail */}
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#F6F3EE]">
                                {item.product.imageUrl ? (
                                  <Image
                                    src={item.product.imageUrl}
                                    alt={item.product.name}
                                    fill
                                    sizes="56px"
                                    className="object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="h-full w-full" style={{ background: brand.primaryColor + "22" }} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-[13px] font-medium text-ink">
                                  {item.product.name}
                                </p>
                                <p className="text-[10px] uppercase tracking-[0.1em] text-ink-subtle">
                                  {item.position}
                                </p>
                              </div>
                              <button
                                onClick={() => runTryOn(item.id)}
                                disabled={t?.loading}
                                className="shrink-0 rounded-full border border-hairline-strong bg-white px-3.5 py-1.5 text-[12px] font-medium
                                           text-ink hover:border-black/30 transition-all duration-200
                                           disabled:opacity-50 disabled:cursor-wait"
                              >
                                {t?.loading
                                  ? "Generating…"
                                  : t?.url
                                  ? "View try-on"
                                  : "Try on"}
                              </button>
                            </li>
                          );
                        })}
                      </ul>

                      {outfit.rationale && (
                        <p className="mt-3 text-[12px] text-ink-subtle leading-[1.6] border-t border-black/[0.05] pt-3">
                          {outfit.rationale}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-end">
                        {savedIds.has(outfit.id) ? (
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#346538]">
                            Saved to wardrobe
                          </span>
                        ) : (
                          <button
                            onClick={() => saveToWardrobe(outfit)}
                            className="text-[12px] font-medium text-[#C9A882] hover:text-[#b8956e] transition-colors duration-200"
                          >
                            Save to wardrobe
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    setStep(0);
                    setResult(null);
                    setOutfits([]);
                    setSavedIds(new Set());
                    setFrontPhoto(null);
                    setSidePhoto(null);
                  }}
                  className="rounded-full border border-hairline-strong bg-white px-5 py-2.5 text-sm font-medium
                             text-ink-muted hover:bg-white/80 transition-all duration-200"
                >
                  Start over
                </button>
                {!widgetMode && (
                  <Link
                    href="/app"
                    className="rounded-full border border-hairline-strong bg-white px-5 py-2.5 text-sm font-medium
                               text-ink-muted hover:bg-white/80 transition-all duration-200"
                  >
                    Browse more brands
                  </Link>
                )}
                {!widgetMode && savedIds.size > 0 && (
                  <Link
                    href="/app/wardrobe"
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#C9A882] hover:text-[#b8956e] transition-colors duration-200"
                  >
                    View wardrobe ({savedIds.size})
                  </Link>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Upgrade modal */}
      <AnimatePresence>
        {showUpgrade && (
          <UpgradePrompt
            reason={`You've reached a limit on the ${clientPlan} plan.`}
            targetPlan={planLimits.nextPlan ?? "model"}
            variant="modal"
            onDismiss={() => setShowUpgrade(false)}
          />
        )}
      </AnimatePresence>

      {/* Try-on viewer */}
      <AnimatePresence>
        {activeTryOn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveTryOn(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3, ease }}
              className="relative max-h-[90vh] max-w-[640px] w-full overflow-hidden rounded-2xl bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeTryOn}
                alt="Try-on preview"
                className="w-full h-auto max-h-[88vh] object-contain bg-[#F6F3EE]"
              />
              <button
                onClick={() => setActiveTryOn(null)}
                aria-label="Close"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full
                           bg-white/95 ring-1 ring-black/10 hover:bg-white transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 3l6 6M9 3l-6 6" stroke="#111010" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
