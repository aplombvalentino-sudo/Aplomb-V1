"use client";

import { useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Step = "info" | "upload" | "measuring" | "outfits" | "error";

type OutfitItemData = {
  id: string;
  position: string;
  product: { name: string; imageUrl: string | null; category: string | null };
  productVariant: { sizeLabel: string | null; price: string | null } | null;
};

type OutfitData = {
  id: string;
  title: string;
  description: string | null;
  rationale: string | null;
  items: OutfitItemData[];
};

const ease = [0.16, 1, 0.3, 1] as const;

const stepVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 36 : -36,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -36 : 36,
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] as const },
  }),
};

const stepOrder: Step[] = ["info", "upload", "measuring", "outfits"];

function WidgetContent() {
  const searchParams = useSearchParams();
  const brandSlug = searchParams.get("brand") ?? "";
  const productExternalId = searchParams.get("product") ?? undefined;

  const [step, setStep] = useState<Step>("info");
  const prevStepRef = useRef<Step>("info");
  const [height, setHeight] = useState("");
  const [occasion, setOccasion] = useState("");
  const [stylePrefs, setStylePrefs] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [outfits, setOutfits] = useState<OutfitData[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function getDirection(next: Step): number {
    const from = stepOrder.indexOf(prevStepRef.current);
    const to = stepOrder.indexOf(next);
    return to >= from ? 1 : -1;
  }

  function goTo(next: Step) {
    prevStepRef.current = step;
    setStep(next);
  }

  async function handleStart() {
    goTo("upload");
  }

  async function handleUpload() {
    setLoading(true);
    goTo("measuring");
    setError("");

    try {
      const mediaUrl = mediaFile
        ? `https://media.aplomb.ai/stub/${Date.now()}`
        : "https://media.aplomb.ai/stub/default";

      const measRes = await fetch("/api/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandSlug,
          mediaUrl,
          heightCm: height ? parseFloat(height) : undefined,
          context: "PDP",
        }),
      });

      const measJson = await measRes.json();
      if (!measJson.success) {
        throw new Error(measJson.error?.message ?? "Measurement failed");
      }

      const { recommendationSessionId } = measJson.data;

      const outfitRes = await fetch("/api/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandSlug,
          recommendationSessionId,
          context: {
            occasion: occasion || "casual",
            stylePreferences: stylePrefs
              ? stylePrefs.split(",").map((s) => s.trim())
              : [],
            maxItems: 4,
          },
        }),
      });

      const outfitJson = await outfitRes.json();
      if (!outfitJson.success) {
        throw new Error(outfitJson.error?.message ?? "Outfit generation failed");
      }

      setOutfits(outfitJson.data.outfits ?? []);
      goTo("outfits");
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
      goTo("error");
    }

    setLoading(false);
  }

  if (!brandSlug) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="text-sm text-[#6B6965]">
          Missing <code className="rounded bg-black/5 px-1.5 py-0.5 text-[#111010]">brand</code> parameter.
        </p>
      </div>
    );
  }

  const direction = getDirection(step);

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F6F3]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease }}
        className="flex items-center justify-between border-b border-black/[0.07] bg-white px-5 py-4"
      >
        <span className="text-[14px] font-semibold tracking-tight text-[#111010]">AI Fitting Room</span>
        <span className="rounded-full bg-black/[0.04] px-2.5 py-0.5 text-[10px] font-medium
                         uppercase tracking-wide text-[#9C9894] ring-1 ring-black/[0.07]">
          Powered by Aplomb
        </span>
      </motion.div>

      {/* Step progress dots */}
      <div className="flex items-center justify-center gap-2 bg-white px-5 py-3 border-b border-black/[0.05]">
        {(["info", "upload", "measuring", "outfits"] as const).map((s) => {
          const idx = stepOrder.indexOf(s);
          const cur = stepOrder.indexOf(step === "error" ? "measuring" : step);
          return (
            <motion.div
              key={s}
              animate={{
                width: s === step ? 22 : 6,
                backgroundColor: idx <= cur ? "#111010" : "#D1CEC9",
              }}
              transition={{ duration: 0.35, ease }}
              className="h-1.5 rounded-full"
            />
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 relative">
        <AnimatePresence mode="wait" custom={direction}>
          {step === "info" && (
            <motion.div
              key="info"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-5"
            >
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#111010]">
                  Find your perfect fit
                </h2>
                <p className="mt-1.5 text-[13px] leading-[1.6] text-[#6B6965]">
                  Tell us a little about yourself. We&apos;ll recommend the right sizes and build outfits that suit you.
                </p>
              </div>
              <Input
                label="Your height (cm)"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="170"
              />
              <div>
                <label className="block text-[13px] font-medium text-[#111010] mb-1.5">
                  Occasion
                </label>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="w-full rounded-xl border border-black/[0.12] bg-white px-3.5 py-2.5
                             text-[13px] text-[#111010] focus:border-[#111010] focus:outline-none
                             transition-colors"
                >
                  <option value="">Any occasion</option>
                  <option value="casual">Casual</option>
                  <option value="office">Office</option>
                  <option value="date night">Date night</option>
                  <option value="sport">Sport</option>
                  <option value="formal">Formal</option>
                </select>
              </div>
              <Input
                label="Style preferences (optional)"
                value={stylePrefs}
                onChange={(e) => setStylePrefs(e.target.value)}
                placeholder="e.g. minimalist, colourful, oversized"
              />
              <Button onClick={handleStart} className="w-full">
                Continue
              </Button>
            </motion.div>
          )}

          {step === "upload" && (
            <motion.div
              key="upload"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-5"
            >
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#111010]">
                  Upload a photo
                </h2>
                <p className="mt-1.5 text-[13px] leading-[1.6] text-[#6B6965]">
                  A full-body photo gives the most accurate measurements. Your photo is never stored or shared.
                </p>
              </div>

              {/* Upload zone — double-bezel */}
              <div className="rounded-[1.25rem] bg-black/[0.025] p-1.5 ring-1 ring-black/[0.06]">
                <motion.div
                  whileHover={{ backgroundColor: "rgba(0,0,0,0.015)" }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.2 }}
                  className="flex h-44 flex-col items-center justify-center rounded-[calc(1.25rem-0.375rem)]
                             bg-white cursor-pointer border border-dashed border-black/[0.12]"
                  onClick={() => document.getElementById("photo-upload")?.click()}
                >
                  {mediaFile ? (
                    <div className="text-center px-4">
                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full
                                      bg-black/[0.04] ring-1 ring-black/[0.07]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6965" strokeWidth="1.5">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                      </div>
                      <p className="text-[13px] font-medium text-[#111010]">{mediaFile.name}</p>
                      <p className="mt-0.5 text-[11px] text-[#9C9894]">Tap to change</p>
                    </div>
                  ) : (
                    <div className="text-center px-4">
                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full
                                      bg-black/[0.04]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6965" strokeWidth="1.5">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                      </div>
                      <p className="text-[13px] text-[#6B6965]">Tap to upload a photo</p>
                      <p className="mt-0.5 text-[11px] text-[#9C9894]">JPG, PNG up to 10 MB</p>
                    </div>
                  )}
                </motion.div>
              </div>

              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-center text-[12px] text-[#9C9894]">
                No photo? We&apos;ll use your height to estimate.
              </p>
              <Button onClick={handleUpload} loading={loading} className="w-full">
                {mediaFile ? "Analyse my photo" : "Skip & generate outfits"}
              </Button>
              <button
                onClick={() => goTo("info")}
                className="w-full text-center text-[13px] text-[#9C9894] hover:text-[#111010] transition-colors"
              >
                Back
              </button>
            </motion.div>
          )}

          {step === "measuring" && (
            <motion.div
              key="measuring"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              {/* Spinner */}
              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.3, repeat: Infinity, ease: "linear" }}
                  className="h-12 w-12 rounded-full border-[2.5px] border-black/[0.08] border-t-[#111010]"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute h-5 w-5 rounded-full bg-[#111010]"
                />
              </div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mt-6 text-[14px] font-medium text-[#111010]"
              >
                Analysing your measurements…
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="mt-1.5 text-[12px] text-[#9C9894]"
              >
                Building personalised outfits
              </motion.p>
            </motion.div>
          )}

          {step === "outfits" && (
            <motion.div
              key="outfits"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-5"
            >
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#111010]">
                  Your outfits
                </h2>
                <p className="mt-1 text-[13px] text-[#6B6965]">
                  Personalised looks selected to fit your measurements.
                </p>
              </div>

              {outfits.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-black/[0.07] bg-white py-12 text-center"
                >
                  <p className="text-[14px] text-[#6B6965]">No outfits generated yet.</p>
                  <p className="mt-1 text-[12px] text-[#9C9894]">
                    Add products to your brand catalog first.
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {outfits.map((outfit, i) => (
                    <motion.div
                      key={outfit.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: i * 0.1, ease }}
                      className="rounded-2xl border border-black/[0.07] bg-white p-4"
                    >
                      <h3 className="text-[14px] font-semibold text-[#111010]">{outfit.title}</h3>
                      {outfit.description && (
                        <p className="mt-1 text-[12px] text-[#6B6965]">{outfit.description}</p>
                      )}
                      {outfit.rationale && (
                        <p className="mt-3 rounded-xl bg-[#F7F6F3] p-3 text-[12px] leading-[1.6]
                                       text-[#6B6965] italic">
                          {outfit.rationale}
                        </p>
                      )}
                      <div className="mt-4 grid grid-cols-2 gap-2.5">
                        {outfit.items.map((item, j) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.35, delay: i * 0.1 + j * 0.07, ease }}
                            whileHover={{ scale: 1.02 }}
                            className="rounded-xl border border-black/[0.07] bg-[#F9F8F6] p-3"
                          >
                            {item.product.imageUrl && (
                              <img
                                src={item.product.imageUrl}
                                alt={item.product.name}
                                className="mb-2 h-24 w-full rounded-lg object-cover"
                              />
                            )}
                            <p className="text-[12px] font-medium text-[#111010] line-clamp-2">
                              {item.product.name}
                            </p>
                            {item.productVariant?.sizeLabel && (
                              <p className="mt-1 text-[11px] text-[#9C9894]">
                                Size: {item.productVariant.sizeLabel}
                              </p>
                            )}
                            <p className="mt-0.5 text-[11px] capitalize text-[#9C9894]">
                              {item.position}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  goTo("info");
                  setOutfits([]);
                  setMediaFile(null);
                }}
                className="w-full text-center text-[13px] text-[#9C9894] hover:text-[#111010] transition-colors"
              >
                Start over
              </button>
            </motion.div>
          )}

          {step === "error" && (
            <motion.div
              key="error"
              custom={0}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50
                           ring-1 ring-red-100"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </motion.div>
              <p className="mt-4 text-[14px] font-medium text-red-600">Something went wrong</p>
              <p className="mt-2 text-[12px] text-[#9C9894]">{error}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => goTo("info")}
                className="mt-6"
              >
                Try again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-sm text-[#9C9894]">
          Loading…
        </div>
      }
    >
      <WidgetContent />
    </Suspense>
  );
}
