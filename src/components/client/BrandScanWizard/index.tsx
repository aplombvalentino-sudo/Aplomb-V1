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
 *   index.tsx       — this file: state, handlers, step switch, header, modals
 *   types.ts        — API DTOs
 *   helpers.ts      — pure helpers (confidenceDot/Label, ease)
 *   ui.tsx          — presentational primitives (StepDots, ModeCard, NumField, …)
 *   wizardApi.ts    — typed POSTs to /api/measurements, /api/outfits, /api/tryon
 *   wardrobeStorage.ts — try/catch-wrapped localStorage for wardrobe + scan count
 *   steps/<X>Step.tsx — one component per wizard step
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
import { ease } from "./helpers";
import { StepDots } from "./ui";
import { postMeasurements, postOutfits, postTryOn } from "./wizardApi";
import {
  loadWardrobe,
  saveWardrobe,
  getScanCount as readScanCount,
  setScanCount as persistScanCount,
} from "./wardrobeStorage";

import { ConsentStep } from "./steps/ConsentStep";
import { ModeStep } from "./steps/ModeStep";
import { MeasurementsStep } from "./steps/MeasurementsStep";
import { ProcessingStep } from "./steps/ProcessingStep";
import { SizeResultStep } from "./steps/SizeResultStep";
import { OutfitsStep } from "./steps/OutfitsStep";

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

  // ── Try-on consent (GDPR Art 9 §2.a explicit consent — separable from the
  // general CGU/privacy clickwrap). The user's front photo is signed and
  // sent to fal.ai (US) to render the try-on imagery; this needs its OWN
  // affirmative consent. We gate the first runTryOn call behind a modal;
  // subsequent calls in the same session reuse the granted consent.
  const [tryOnConsent, setTryOnConsent] = useState(false);
  const [pendingTryOnItemId, setPendingTryOnItemId] = useState<string | null>(null);

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
  // Gated by explicit consent (Art 9 §2.a). Public entry point — defers to
  // executeTryOn() only after consent is granted; otherwise stages the
  // request for the modal to confirm.
  async function runTryOn(itemId: string) {
    if (!result) return;
    if (!tryOnConsent) {
      setPendingTryOnItemId(itemId);
      return;
    }
    await executeTryOn(itemId);
  }

  async function executeTryOn(itemId: string) {
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

  // Confirm handler invoked by the modal when the user grants try-on consent
  // for the first time. Stores the consent flag and executes the deferred call.
  async function confirmTryOnConsent() {
    const pending = pendingTryOnItemId;
    setTryOnConsent(true);
    setPendingTryOnItemId(null);
    if (pending) await executeTryOn(pending);
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

  function startOver() {
    setStep(0);
    setResult(null);
    setOutfits([]);
    setSavedIds(new Set());
    setFrontPhoto(null);
    setSidePhoto(null);
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
          {step === 0 && (
            <ConsentStep
              key="s0"
              consentAccepted={consentAccepted}
              setConsentAccepted={setConsentAccepted}
              totalProducts={totalProducts}
              onNext={() => setStep(1)}
            />
          )}

          {step === 1 && (
            <ModeStep
              key="s1"
              mode={mode}
              setMode={setMode}
              onBack={() => setStep(0)}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <MeasurementsStep
              key="s2"
              mode={mode}
              heightCm={heightCm} setHeightCm={setHeightCm}
              weightKg={weightKg} setWeightKg={setWeightKg}
              chestCm={chestCm} setChestCm={setChestCm}
              waistCm={waistCm} setWaistCm={setWaistCm}
              hipsCm={hipsCm} setHipsCm={setHipsCm}
              gender={gender} setGender={setGender}
              frontPhoto={frontPhoto} setFrontPhoto={setFrontPhoto}
              sidePhoto={sidePhoto} setSidePhoto={setSidePhoto}
              stylePreference={stylePreference} setStylePreference={setStylePreference}
              occasion={occasion} setOccasion={setOccasion}
              planLimits={planLimits}
              scanCount={scanCount}
              scanLimitReached={scanLimitReached}
              error={error}
              loading={loading}
              onBack={() => setStep(1)}
              onSubmit={submitMeasurements}
            />
          )}

          {step === 3 && <ProcessingStep key="s3" processingStage={processingStage} />}

          {step === 4 && result && (
            <SizeResultStep
              key="s4"
              result={result}
              error={error}
              loading={loading}
              onGenerate={generateOutfits}
            />
          )}

          {step === 5 && (
            <OutfitsStep
              key="s5"
              brand={brand}
              outfits={outfits}
              tryOnByItem={tryOnByItem}
              savedIds={savedIds}
              widgetMode={widgetMode}
              onTryOn={runTryOn}
              onSave={saveToWardrobe}
              onStartOver={startOver}
            />
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

      {/* Try-on explicit consent modal (GDPR Art 9 §2.a — separable consent).
          Shown the first time the user clicks "Try on" in this session. */}
      <AnimatePresence>
        {pendingTryOnItemId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPendingTryOnItemId(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3, ease }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl p-7"
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
                Try-on consent
              </p>
              <h3 className="mt-3 font-serif text-[1.5rem] font-medium leading-[1.15] tracking-[-0.02em] text-ink">
                Before we render the try-on
              </h3>
              <p className="mt-3 text-[13px] leading-[1.55] text-ink-muted">
                To generate this look on you, we&apos;ll share your front photo with{" "}
                <span className="font-medium text-ink">fal.ai</span>, our virtual
                try-on partner (servers in the United States). They generate the
                image and return it to Aplomb. We do not give them any other data,
                and we do not retain their generated images beyond what you save
                to your wardrobe.
              </p>
              <ul className="mt-4 space-y-1.5 text-[12px] text-ink leading-[1.5]">
                <li className="flex gap-2"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#C9A882]" />What&apos;s sent: your front photo (signed URL, 30-minute lifetime)</li>
                <li className="flex gap-2"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#C9A882]" />Legal basis: Article 9 §2.a — your explicit consent</li>
                <li className="flex gap-2"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#C9A882]" />Withdraw anytime: <span className="font-medium">Account → Delete</span> erases everything</li>
              </ul>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setPendingTryOnItemId(null)}
                  className="rounded-full px-4 py-2 text-[13px] font-medium text-ink-muted
                             hover:bg-ink/5 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmTryOnConsent}
                  className="inline-flex items-center gap-2 rounded-full bg-[#111010] px-5 py-2
                             text-[13px] font-medium text-white hover:bg-[#2a2622]
                             transition-colors duration-200"
                >
                  I consent — render the try-on
                </button>
              </div>
            </motion.div>
          </motion.div>
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
