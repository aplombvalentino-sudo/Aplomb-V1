"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { UpgradePrompt } from "@/components/client/UpgradePrompt";
import {
  type ClientPlan,
  getClientPlanLimits,
  SCAN_COUNT_KEY,
} from "@/lib/planLimits";
import type { WardrobeOutfit } from "@/components/client/WardrobeClient";

const WARDROBE_KEY = "aplomb_wardrobe";

function loadWardrobe(): WardrobeOutfit[] {
  try {
    const raw = localStorage.getItem(WARDROBE_KEY);
    return raw ? (JSON.parse(raw) as WardrobeOutfit[]) : [];
  } catch {
    return [];
  }
}

function persistWardrobe(items: WardrobeOutfit[]) {
  localStorage.setItem(WARDROBE_KEY, JSON.stringify(items));
}

const ease = [0.16, 1, 0.3, 1] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type Variant = {
  id: string;
  sizeLabel: string | null;
  color: string | null;
  price: string | null;
  stockStatus: string;
};

type Product = {
  id: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  variants: Variant[];
};

type Brand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
};

type ScanResult = {
  measurements: Record<string, number>;
  sizeRecommendations: Record<string, string>;
  sessionId: string;
  bodyProfileId: string;
  products: Product[];
  stylePreference: string | null;
  occasion: string | null;
};

type Outfit = {
  id: string;
  title: string;
  description: string;
  rationale: string;
  items: Array<{
    id: string;
    position: string;
    product: { name: string; imageUrl: string | null };
  }>;
};

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? "h-1.5 w-5 bg-[#111010]"
              : i < current
              ? "h-1.5 w-1.5 bg-[#111010]/30"
              : "h-1.5 w-1.5 bg-black/10"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export function BrandScanWizard({
  brand,
  productsByCategory,
  clientPlan = "essential",
}: {
  brand: Brand;
  productsByCategory: Record<string, Product[]>;
  clientPlan?: ClientPlan;
}) {
  const planLimits = getClientPlanLimits(clientPlan);
  const occasionPresets = planLimits.occasionPresets;

  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [scanCount, setScanCount] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [formValues, setFormValues] = useState({
    heightCm: 170,
    stylePreference: "" as "" | "casual" | "formal" | "sport",
    occasion: "",
  });

  // Read scan count from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SCAN_COUNT_KEY);
      setScanCount(stored ? parseInt(stored, 10) : 0);
    } catch {}
  }, []);

  const scanLimitReached =
    planLimits.maxScansPerMonth !== Infinity &&
    scanCount >= planLimits.maxScansPerMonth;
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  function saveOutfitToWardrobe(outfit: Outfit) {
    const existing = loadWardrobe();
    // Check plan wardrobe limit
    if (
      planLimits.maxWardrobeSaves !== Infinity &&
      existing.length >= planLimits.maxWardrobeSaves
    ) {
      setShowUpgrade(true);
      return;
    }
    // Don't double-save
    if (existing.some((o) => o.id === outfit.id)) {
      setSavedIds((s) => new Set([...s, outfit.id]));
      return;
    }
    const entry: WardrobeOutfit = {
      id: outfit.id,
      brandName: brand.name,
      brandSlug: brand.slug,
      savedAt: new Date().toISOString(),
      items: outfit.items.map((item) => ({
        name: item.product.name,
        size: (scanResult?.sizeRecommendations?.[item.position] ??
               scanResult?.sizeRecommendations?.["top"] ??
               "—"),
        category: item.position,
      })),
    };
    persistWardrobe([entry, ...existing]);
    setSavedIds((s) => new Set([...s, outfit.id]));
  }

  const categories = Object.keys(productsByCategory);
  const totalProducts = Object.values(productsByCategory).flat().length;

  // Step 2 → 3: POST scan
  async function runScan() {
    // Enforce client plan scan limit
    if (scanLimitReached) {
      setShowUpgrade(true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/client/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandSlug: brand.slug,
          heightCm: formValues.heightCm,
          stylePreference: formValues.stylePreference || undefined,
          occasion: formValues.occasion || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Scan failed.");
        setLoading(false);
        return;
      }
      setScanResult(json.data);
      // Increment monthly scan counter in localStorage
      try {
        const next = scanCount + 1;
        localStorage.setItem(SCAN_COUNT_KEY, String(next));
        setScanCount(next);
      } catch {}
      setStep(3);
    } catch {
      setError("Unexpected error. Please try again.");
    }
    setLoading(false);
  }

  // Step 3 → 4: POST outfits
  async function generateOutfits() {
    if (!scanResult) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandSlug: brand.slug,
          recommendationSessionId: scanResult.sessionId,
          context: {
            occasion: scanResult.occasion ?? undefined,
            stylePreferences: scanResult.stylePreference
              ? [scanResult.stylePreference]
              : undefined,
            maxItems: 4,
          },
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Could not generate outfits.");
        setLoading(false);
        return;
      }
      setOutfits(json.data?.outfits ?? []);
      setStep(4);
    } catch {
      setError("Unexpected error. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-[100dvh] bg-[#F7F6F3]">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 30%, ${brand.primaryColor}18 0%, transparent 70%)`,
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-black/[0.07] bg-[#F7F6F3]/90
                          backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Brand logo */}
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center overflow-hidden
                         ring-1 ring-black/10"
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
          <span className="text-[14px] font-semibold text-[#111010]">{brand.name}</span>
        </div>

        <div className="flex items-center gap-4">
          <StepDots total={5} current={step} />
          <Link href="/app" className="text-[12px] text-[#9C9894] hover:text-[#111010]
                                        transition-colors duration-200">
            ← All brands
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <AnimatePresence mode="wait">

          {/* ── Step 0: Product overview ── */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease }}
            >
              <span className="inline-flex items-center rounded-full border border-black/10
                               bg-white/60 px-3 py-1 text-[10px] font-medium uppercase
                               tracking-[0.18em] text-[#6B6965]">
                Step 1 of 5
              </span>
              <h1 className="mt-4 font-serif text-[1.9rem] font-semibold leading-[1.1]
                             tracking-[-0.025em] text-[#111010]">
                {totalProducts > 0
                  ? `${totalProducts} product${totalProducts !== 1 ? "s" : ""} to fit.`
                  : "Browse the catalogue."}
              </h1>
              <p className="mt-2 text-sm text-[#6B6965]">
                Here&apos;s what we&apos;ll find your size for.
              </p>

              <div className="mt-8 space-y-6">
                {categories.length === 0 ? (
                  <p className="text-[#9C9894]">No active products for this brand yet.</p>
                ) : (
                  categories.map((cat) => (
                    <div key={cat}>
                      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.15em]
                                     text-[#9C9894]">
                        {cat}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {productsByCategory[cat].map((p) => (
                          <div
                            key={p.id}
                            className="rounded-xl bg-white border border-black/[0.06]
                                        shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4"
                          >
                            {/* Colour swatch placeholder */}
                            <div
                              className="mb-3 h-20 rounded-lg"
                              style={{ background: brand.primaryColor + "18" }}
                            />
                            <p className="text-[13px] font-medium text-[#111010] leading-tight">
                              {p.name}
                            </p>
                            <p className="mt-0.5 text-[11px] text-[#9C9894]">
                              {p.variants.length} variant{p.variants.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-10">
                <button
                  onClick={() => setStep(1)}
                  disabled={totalProducts === 0}
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#111010]
                             pl-6 pr-2.5 py-3 text-sm font-medium text-white
                             hover:bg-[#2a2a2a] transition-all duration-300
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Start fit session
                  <span className="flex h-7 w-7 items-center justify-center rounded-full
                                   bg-white/[0.12]">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M2.5 8.5L8.5 2.5M8.5 2.5H3.5M8.5 2.5V7.5"
                            stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 1: Measurement form ── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease }}
            >
              <span className="inline-flex items-center rounded-full border border-black/10
                               bg-white/60 px-3 py-1 text-[10px] font-medium uppercase
                               tracking-[0.18em] text-[#6B6965]">
                Step 2 of 5
              </span>
              <h2 className="mt-4 font-serif text-[1.9rem] font-semibold leading-[1.1]
                             tracking-[-0.025em] text-[#111010]">
                Tell us about yourself.
              </h2>
              <p className="mt-2 text-sm text-[#6B6965]">
                We only need your height to get started. Everything else is optional.
              </p>

              <div className="mt-8 space-y-5">
                {/* Height */}
                <div>
                  <label className="block text-[12px] font-medium text-[#6B6965] mb-1.5">
                    Height (cm) *
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={250}
                    value={formValues.heightCm}
                    onChange={(e) =>
                      setFormValues((f) => ({ ...f, heightCm: Number(e.target.value) }))
                    }
                    className="w-full rounded-xl border border-black/[0.1] bg-white px-4 py-3
                               text-sm text-[#111010] placeholder:text-[#C9C5C0]
                               focus:outline-none focus:ring-2 focus:ring-[#111010]/10"
                  />
                </div>

                {/* Style preference */}
                <div>
                  <label className="block text-[12px] font-medium text-[#6B6965] mb-1.5">
                    Style preference
                  </label>
                  <div className="flex gap-2">
                    {(["casual", "formal", "sport"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setFormValues((f) => ({
                            ...f,
                            stylePreference: f.stylePreference === s ? "" : s,
                          }))
                        }
                        className={`rounded-full px-4 py-2 text-[13px] font-medium capitalize
                                    border transition-all duration-200 ${
                          formValues.stylePreference === s
                            ? "bg-[#111010] text-white border-[#111010]"
                            : "bg-white text-[#6B6965] border-black/[0.1] hover:border-black/20"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Occasion */}
                <div>
                  <label className="block text-[12px] font-medium text-[#6B6965] mb-1.5">
                    Occasion (optional)
                  </label>
                  {/* Preset chips */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {occasionPresets.map((o) => (
                      <button
                        key={o}
                        type="button"
                        onClick={() =>
                          setFormValues((f) => ({
                            ...f,
                            occasion: f.occasion === o ? "" : o,
                          }))
                        }
                        className={`rounded-full px-3 py-1.5 text-[12px] font-medium
                                    border transition-all duration-200 ${
                          formValues.occasion === o
                            ? "bg-[#111010] text-white border-[#111010]"
                            : "bg-white text-[#6B6965] border-black/[0.1] hover:border-black/20"
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                  {/* Free-text input only for fashion+ */}
                  {planLimits.customOccasion ? (
                    <input
                      type="text"
                      value={formValues.occasion}
                      onChange={(e) =>
                        setFormValues((f) => ({ ...f, occasion: e.target.value }))
                      }
                      placeholder="Or type a custom occasion…"
                      className="w-full rounded-xl border border-black/[0.1] bg-white px-4 py-3
                                 text-sm text-[#111010] placeholder:text-[#C9C5C0]
                                 focus:outline-none focus:ring-2 focus:ring-[#111010]/10"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-[12px] text-[#C9C5C0] mt-1">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M6 1l1.5 4H11l-3 2 1 4L6 9 3 11l1-4-3-2h3.5L6 1z"
                              stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                      </svg>
                      Custom occasions available on Fashion plan.{" "}
                      <Link href="/app/pricing" className="text-[#C9A882] hover:underline">Upgrade</Link>
                    </div>
                  )}
                </div>

                {/* Scan counter */}
                {planLimits.maxScansPerMonth !== Infinity && (
                  <div className="rounded-xl bg-[#F7F6F3] border border-black/[0.06] px-4 py-3
                                   flex items-center justify-between">
                    <span className="text-[12px] text-[#6B6965]">Scans used this month</span>
                    <span className="text-[13px] font-semibold text-[#111010] tabular-nums">
                      {scanCount} / {planLimits.maxScansPerMonth}
                    </span>
                  </div>
                )}
              </div>

              {scanLimitReached && (
                <div className="mt-4">
                  <UpgradePrompt
                    reason={`You've used all ${planLimits.maxScansPerMonth} scans for this month.`}
                    targetPlan={planLimits.nextPlan ?? "model"}
                    variant="inline"
                  />
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3
                                text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-8 flex items-center gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="rounded-full border border-black/[0.12] bg-white px-5 py-2.5
                             text-sm font-medium text-[#6B6965] hover:bg-white/80
                             transition-all duration-200"
                >
                  Back
                </button>
                <button
                  onClick={runScan}
                  disabled={loading || formValues.heightCm < 100 || scanLimitReached}
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#111010]
                             pl-6 pr-2.5 py-3 text-sm font-medium text-white
                             hover:bg-[#2a2a2a] transition-all duration-300
                             disabled:opacity-50 disabled:cursor-wait"
                >
                  {loading ? "Scanning…" : scanLimitReached ? "Limit reached" : "Get my size"}
                  <span className="flex h-7 w-7 items-center justify-center rounded-full
                                   bg-white/[0.12]">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M2.5 8.5L8.5 2.5M8.5 2.5H3.5M8.5 2.5V7.5"
                            stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Size recommendations ── */}
          {step === 3 && scanResult && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease }}
            >
              <span className="inline-flex items-center rounded-full border border-black/10
                               bg-white/60 px-3 py-1 text-[10px] font-medium uppercase
                               tracking-[0.18em] text-[#6B6965]">
                Step 3 of 5 — Your measurements
              </span>
              <h2 className="mt-4 font-serif text-[1.9rem] font-semibold leading-[1.1]
                             tracking-[-0.025em] text-[#111010]">
                Here&apos;s your fit profile.
              </h2>
              <p className="mt-2 text-sm text-[#6B6965]">
                Based on your height of {formValues.heightCm} cm.
              </p>

              {/* Measurements grid */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                {Object.entries(scanResult.measurements)
                  .filter(([, v]) => typeof v === "number")
                  .map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-xl bg-white border border-black/[0.06]
                                  shadow-[0_2px_8px_rgba(0,0,0,0.03)] px-4 py-3.5"
                    >
                      <p className="text-[10px] text-[#9C9894] uppercase tracking-[0.1em]
                                     capitalize mb-0.5">
                        {k}
                      </p>
                      <p className="font-serif text-[1.4rem] font-semibold text-[#111010]
                                     leading-none tabular-nums">
                        {Math.round(v as number)}
                        <span className="text-[12px] font-normal text-[#9C9894] ml-1">cm</span>
                      </p>
                    </div>
                  ))}
              </div>

              {/* Size recommendations */}
              {Object.keys(scanResult.sizeRecommendations).length > 0 && (
                <div className="mt-6 rounded-2xl bg-[#111010] px-6 py-5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em]
                                 text-white/40 mb-3">
                    Recommended sizes
                  </p>
                  <div className="space-y-2">
                    {Object.entries(scanResult.sizeRecommendations).map(([cat, size]) => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-[13px] text-white/60 capitalize">{cat}</span>
                        <span className="font-serif text-[1.3rem] font-semibold text-white
                                         leading-none tabular-nums">
                          {size}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3
                                text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-8">
                <button
                  onClick={generateOutfits}
                  disabled={loading}
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#111010]
                             pl-6 pr-2.5 py-3 text-sm font-medium text-white
                             hover:bg-[#2a2a2a] transition-all duration-300
                             disabled:opacity-50 disabled:cursor-wait"
                >
                  {loading ? "Building outfits…" : "See outfit suggestions"}
                  <span className="flex h-7 w-7 items-center justify-center rounded-full
                                   bg-white/[0.12]">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M2.5 8.5L8.5 2.5M8.5 2.5H3.5M8.5 2.5V7.5"
                            stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Outfit suggestions ── */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease }}
            >
              <span className="inline-flex items-center rounded-full border border-black/10
                               bg-white/60 px-3 py-1 text-[10px] font-medium uppercase
                               tracking-[0.18em] text-[#6B6965]">
                Step 4 of 5 — Your looks
              </span>
              <h2 className="mt-4 font-serif text-[1.9rem] font-semibold leading-[1.1]
                             tracking-[-0.025em] text-[#111010]">
                {outfits.length > 0
                  ? `${outfits.length} outfit${outfits.length !== 1 ? "s" : ""} picked for you.`
                  : "No outfits available."}
              </h2>
              <p className="mt-2 text-sm text-[#6B6965]">
                Each look is matched to your measurements and style.
              </p>

              {outfits.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-black/[0.06] bg-white py-12
                                text-center">
                  <p className="text-[#6B6965]">
                    Not enough products to build an outfit yet.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {outfits.map((outfit, i) => (
                    <div
                      key={outfit.id}
                      className="rounded-2xl bg-white border border-black/[0.06]
                                  shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-[11px] text-[#9C9894] uppercase tracking-[0.12em]
                                         font-medium mb-0.5">
                            Look {i + 1}
                          </p>
                          <p className="text-[15px] font-semibold text-[#111010]">
                            {outfit.title}
                          </p>
                        </div>
                        {/* Swatch row */}
                        <div className="flex -space-x-1">
                          {outfit.items.slice(0, 3).map((item, j) => (
                            <div
                              key={item.id}
                              className="h-8 w-8 rounded-lg ring-2 ring-white"
                              style={{
                                background: brand.primaryColor + String(22 + j * 20).padStart(2, "0"),
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5 mb-4">
                        {outfit.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 text-[13px] text-[#6B6965]"
                          >
                            <span className="w-16 text-[10px] uppercase tracking-[0.1em]
                                             text-[#C9C5C0] shrink-0">
                              {item.position}
                            </span>
                            {item.product.name}
                          </div>
                        ))}
                      </div>

                      {outfit.rationale && (
                        <p className="text-[12px] text-[#9C9894] leading-relaxed border-t
                                       border-black/[0.05] pt-3 mb-3">
                          {outfit.rationale}
                        </p>
                      )}

                      {/* Save to wardrobe */}
                      <div className={`flex items-center justify-end ${outfit.rationale ? "" : "border-t border-black/[0.05] pt-3 mt-3"}`}>
                        {savedIds.has(outfit.id) ? (
                          <span className="inline-flex items-center gap-1.5 text-[12px]
                                           font-medium text-[#6B9F6B]">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                              <path d="M2 6l3 3 5-5"
                                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Saved to wardrobe
                          </span>
                        ) : (
                          <button
                            onClick={() => saveOutfitToWardrobe(outfit)}
                            className="inline-flex items-center gap-1.5 text-[12px] font-medium
                                       text-[#C9A882] hover:text-[#b8956e] transition-colors duration-200"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                              <path d="M6 1l1.3 3.9H11L7.9 7.1l1.3 3.9L6 9 2.8 11l1.3-3.9L1 4.9h3.7L6 1z"
                                    stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                            </svg>
                            Save to wardrobe
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    setScanResult(null);
                    setOutfits([]);
                    setSavedIds(new Set());
                    setStep(0);
                  }}
                  className="rounded-full border border-black/[0.12] bg-white px-5 py-2.5
                             text-sm font-medium text-[#6B6965] hover:bg-white/80
                             transition-all duration-200"
                >
                  Start over
                </button>
                <Link
                  href="/app"
                  className="rounded-full border border-black/[0.12] bg-white px-5 py-2.5
                             text-sm font-medium text-[#6B6965] hover:bg-white/80
                             transition-all duration-200"
                >
                  Browse more brands
                </Link>
                {savedIds.size > 0 && (
                  <Link
                    href="/app/wardrobe"
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium
                               text-[#C9A882] hover:text-[#b8956e] transition-colors duration-200"
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
                      <path d="M6.5 1.5l1.5 4.5H12L8.5 8.5l1.5 4L6.5 10 3 12.5l1.5-4L1 6h4L6.5 1.5z"
                            stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                    </svg>
                    View wardrobe ({savedIds.size})
                  </Link>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Upgrade modal */}
      <AnimatePresence>
        {showUpgrade && (
          <UpgradePrompt
            reason={`You've reached your ${planLimits.maxScansPerMonth}-scan monthly limit. Upgrade to keep scanning.`}
            targetPlan={planLimits.nextPlan ?? "model"}
            variant="modal"
            onDismiss={() => setShowUpgrade(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
