"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { ClientPlan } from "@/lib/planLimits";

const ease = [0.16, 1, 0.3, 1] as const;

type Step = "intro" | "front" | "back" | "review" | "confirm";

// ─── Reference data ──────────────────────────────────────────────────────────

// Broad fashion-neutral category taxonomy. The underlying field is a free
// string in the DB (no enum constraint), so legacy or future values are
// also accepted by the outfit builder's SLOT_RULES.
const CATEGORY_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "dress", label: "Dress" },
  { value: "outerwear", label: "Outerwear" },
  { value: "shoes", label: "Shoes" },
  { value: "bag", label: "Bag" },
  { value: "accessory", label: "Accessory" },
  { value: "other", label: "Other" },
] as const;

const COLOR_OPTIONS = [
  "Black", "White", "Grey", "Beige", "Brown", "Blue",
  "Navy", "Red", "Pink", "Green", "Yellow", "Orange", "Purple", "Other",
];

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

// ─── Main component ──────────────────────────────────────────────────────────

export function CaptureFlow({
  plan: _plan,
  remaining,
}: {
  plan: ClientPlan;
  remaining: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");

  // Photos as File objects (kept in memory until upload). Object URLs are
  // managed by the PhotoSlot component to avoid leaks.
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

  // Metadata form
  const [category, setCategory] = useState<string>("top");
  const [color, setColor] = useState<string>("");
  const [brand, setBrand] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");
  // Size is required by the AI try-on (renders the right drape for the
  // size on the user's body). Free-form so brands using "38", "Tall L",
  // or anything else all fit.
  const [size, setSize] = useState<string>("");

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  async function handleSubmit() {
    if (!frontFile || !backFile) {
      setError("Both front and back photos are required.");
      setStep("review");
      return;
    }
    if (!size.trim()) {
      setError("Pick a size — the AI try-on needs it to render the right fit.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("frontImage", frontFile);
      form.set("backImage", backFile);
      form.set("category", category);
      form.set("size", size.trim());
      if (color) form.set("color", color);
      if (brand) form.set("brand", brand);
      if (nickname) form.set("nickname", nickname);

      const res = await fetch("/api/wardrobe/items/upload", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Upload failed.");
        setSubmitting(false);
        return;
      }
      // Success — bounce back to wardrobe; refresh to pick up the new item.
      router.push("/app/wardrobe");
      router.refresh();
    } catch {
      setError("Unexpected error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Progress dots */}
      <div className="mb-8 flex items-center gap-2">
        {(["intro", "front", "back", "review", "confirm"] as Step[]).map((s, i) => {
          const active =
            ["intro", "front", "back", "review", "confirm"].indexOf(step) >= i;
          return (
            <span
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                active ? "w-6 bg-ink" : "w-1.5 bg-ink/15"
              }`}
              aria-hidden
            />
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {step === "intro" && (
          <IntroStep
            key="intro"
            remaining={remaining}
            onNext={() => setStep("front")}
          />
        )}
        {step === "front" && (
          <CaptureStep
            key="front"
            kind="front"
            file={frontFile}
            onFile={(f) => {
              setError("");
              setFrontFile(f);
            }}
            onBack={() => setStep("intro")}
            onNext={() => setStep("back")}
            error={error}
          />
        )}
        {step === "back" && (
          <CaptureStep
            key="back"
            kind="back"
            file={backFile}
            onFile={(f) => {
              setError("");
              setBackFile(f);
            }}
            onBack={() => setStep("front")}
            onNext={() => setStep("review")}
            error={error}
          />
        )}
        {step === "review" && (
          <ReviewStep
            key="review"
            frontFile={frontFile}
            backFile={backFile}
            onRetakeFront={() => {
              setFrontFile(null);
              setStep("front");
            }}
            onRetakeBack={() => {
              setBackFile(null);
              setStep("back");
            }}
            onBack={() => setStep("back")}
            onNext={() => setStep("confirm")}
          />
        )}
        {step === "confirm" && (
          <ConfirmStep
            key="confirm"
            category={category}
            setCategory={setCategory}
            color={color}
            setColor={setColor}
            brand={brand}
            setBrand={setBrand}
            nickname={nickname}
            setNickname={setNickname}
            size={size}
            setSize={setSize}
            onBack={() => setStep("review")}
            onSave={handleSubmit}
            submitting={submitting}
            error={error}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step 1: Intro ───────────────────────────────────────────────────────────

function IntroStep({
  remaining,
  onNext,
}: {
  remaining: number;
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
        Step 1 of 5
      </p>
      <h1 className="mt-3 font-serif text-[2.2rem] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
        Photograph a clothing item you already own and add it to your digital <em className="italic">wardrobe</em><span className="text-accent">.</span>
      </h1>
      <p className="mt-3 text-[14px] text-ink-muted leading-[1.6]">
        Two photos — front and back. Any clothing item, any style. About a minute.
        {remaining !== Infinity && (
          <span className="block mt-1 text-[12px] text-ink-subtle">
            {remaining} personal {remaining === 1 ? "photo slot" : "photo slots"} remaining on your plan.
          </span>
        )}
      </p>

      <ul className="mt-7 space-y-2.5 text-[13px] text-ink">
        <Bullet>Lay the item flat on a plain floor or surface — no hanger, no hands</Bullet>
        <Bullet>Make the whole item visible — top to bottom, sleeves and straps out</Bullet>
        <Bullet>One front photo, then flip it for the back</Bullet>
        <Bullet>Skip folded fabric, dark shadows, and overlap with other clothes</Bullet>
        <Bullet>Even daylight works best</Bullet>
      </ul>

      <div className="mt-9">
        <Button onClick={onNext}>I&apos;m ready — take the front photo</Button>
      </div>
    </motion.section>
  );
}

// ─── Steps 2 & 3: Capture (front, then back) ─────────────────────────────────

function CaptureStep({
  kind,
  file,
  onFile,
  onBack,
  onNext,
  error,
}: {
  kind: "front" | "back";
  file: File | null;
  onFile: (f: File | null) => void;
  onBack: () => void;
  onNext: () => void;
  error: string;
}) {
  const stepIndex = kind === "front" ? 2 : 3;
  const heading =
    kind === "front" ? "Front photo first." : "Now the back.";
  const helper =
    kind === "front"
      ? "Lay the item flat and capture the full shape."
      : "Flip it over and capture the back, same way.";

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease }}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
        Step {stepIndex} of 5
      </p>
      <h2 className="mt-3 font-serif text-[2rem] font-medium leading-[1.08] tracking-[-0.02em] text-ink">
        {heading}
      </h2>
      <p className="mt-2 text-[14px] text-ink-muted">{helper}</p>

      {/* Short reminders */}
      <ul className="mt-5 space-y-1.5 text-[12px] text-ink-subtle">
        <li>· Item alone, plain background</li>
        <li>· No hangers, no hands, not worn</li>
        <li>· Capture the whole silhouette</li>
      </ul>

      <div className="mt-7">
        <PhotoSlot file={file} onFile={onFile} aspect="3 / 4" />
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-full border border-hairline-strong bg-white px-5 py-2.5 text-sm
                     font-medium text-ink-muted hover:bg-white/80 transition-all duration-200"
        >
          Back
        </button>
        <Button onClick={onNext} disabled={!file}>
          Continue
        </Button>
      </div>
    </motion.section>
  );
}

// ─── Step 4: Review ──────────────────────────────────────────────────────────

function ReviewStep({
  frontFile,
  backFile,
  onRetakeFront,
  onRetakeBack,
  onBack,
  onNext,
}: {
  frontFile: File | null;
  backFile: File | null;
  onRetakeFront: () => void;
  onRetakeBack: () => void;
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
        Step 4 of 5
      </p>
      <h2 className="mt-3 font-serif text-[2rem] font-medium leading-[1.08] tracking-[-0.02em] text-ink">
        Looking good?
      </h2>
      <p className="mt-2 text-[14px] text-ink-muted">
        Retake either side, or continue to add a few details.
      </p>

      <div className="mt-7 grid grid-cols-2 gap-3">
        <ReviewSlot label="Front" file={frontFile} onRetake={onRetakeFront} />
        <ReviewSlot label="Back" file={backFile} onRetake={onRetakeBack} />
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-full border border-hairline-strong bg-white px-5 py-2.5 text-sm
                     font-medium text-ink-muted hover:bg-white/80 transition-all duration-200"
        >
          Back
        </button>
        <Button onClick={onNext} disabled={!frontFile || !backFile}>
          Continue
        </Button>
      </div>
    </motion.section>
  );
}

function ReviewSlot({
  label,
  file,
  onRetake,
}: {
  label: string;
  file: File | null;
  onRetake: () => void;
}) {
  const url = useObjectUrl(file);
  return (
    <div>
      <label className="block text-[11px] font-medium text-ink-muted mb-1.5">{label}</label>
      <div
        className="relative w-full overflow-hidden rounded-xl border border-[#111010] bg-white"
        style={{ aspectRatio: "3 / 4" }}
      >
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`${label} photo`} className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>
      <button
        type="button"
        onClick={onRetake}
        className="mt-2 text-[12px] text-ink-subtle hover:text-ink transition-colors underline underline-offset-2"
      >
        Retake {label.toLowerCase()}
      </button>
    </div>
  );
}

// ─── Step 5: Confirm details ─────────────────────────────────────────────────

// Common ready-made size pills — picking a pill is faster than typing
// for the 99% case (S/M/L/XL or 38/40/42). Free-text input below the
// pills covers everything else.
const SIZE_PILLS = ["XS", "S", "M", "L", "XL", "XXL", "36", "38", "40", "42", "44"];

function ConfirmStep({
  category, setCategory,
  color, setColor,
  brand, setBrand,
  nickname, setNickname,
  size, setSize,
  onBack,
  onSave,
  submitting,
  error,
}: {
  category: string;
  setCategory: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  brand: string;
  setBrand: (v: string) => void;
  nickname: string;
  setNickname: (v: string) => void;
  size: string;
  setSize: (v: string) => void;
  onBack: () => void;
  onSave: () => void;
  submitting: boolean;
  error: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease }}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
        Step 5 of 5
      </p>
      <h2 className="mt-3 font-serif text-[2rem] font-medium leading-[1.08] tracking-[-0.02em] text-ink">
        A few quick details<span className="text-accent">.</span>
      </h2>
      <p className="mt-2 text-[14px] text-ink-muted">
        Category and size are required — the AI try-on uses both to render
        the right fit on you. Everything else is optional.
      </p>

      <div className="mt-7 space-y-5">
        {/* Category — pill row */}
        <div>
          <label className="block text-[11px] font-medium text-ink-muted mb-2">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                className={`rounded-full px-4 py-2 text-[13px] font-medium border transition-all duration-200 ${
                  category === opt.value
                    ? "bg-ink text-white border-ink"
                    : "bg-white text-ink-muted border-black/[0.1] hover:border-black/20"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Size — required. Common pills + free-text for anything else. */}
        <div>
          <label className="block text-[11px] font-medium text-ink-muted mb-2">
            Size <span className="text-[#C9653B]">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {SIZE_PILLS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(size === s ? "" : s)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium border transition-all duration-200 ${
                  size === s
                    ? "bg-ink text-white border-ink"
                    : "bg-white text-ink-muted border-black/[0.1] hover:border-black/20"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <Input
              label="Or type a size"
              type="text"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="e.g. M Tall, EU 42, US 8"
              maxLength={40}
            />
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="block text-[11px] font-medium text-ink-muted mb-2">
            Main color <span className="text-ink-subtle">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(color === c ? "" : c)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium border transition-all duration-200 ${
                  color === c
                    ? "bg-ink text-white border-ink"
                    : "bg-white text-ink-muted border-black/[0.1] hover:border-black/20"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Brand */}
        <Input
          label="Brand (optional)"
          type="text"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="e.g. Atelier Verdú"
          maxLength={120}
        />

        {/* Nickname */}
        <Input
          label="Nickname (optional)"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="e.g. My linen shirt"
          maxLength={80}
        />
      </div>

      {error && (
        <div className="mt-5 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={onBack}
          disabled={submitting}
          className="rounded-full border border-hairline-strong bg-white px-5 py-2.5 text-sm
                     font-medium text-ink-muted hover:bg-white/80 transition-all duration-200
                     disabled:opacity-50"
        >
          Back
        </button>
        <Button onClick={onSave} loading={submitting}>
          Save to wardrobe
        </Button>
      </div>
    </motion.section>
  );
}

// ─── Reusable bits ───────────────────────────────────────────────────────────

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 leading-relaxed">
      <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#C9A882]" />
      <span>{children}</span>
    </li>
  );
}

/**
 * One-photo input — camera-friendly on mobile, file-picker on desktop. Owns
 * its object URL lifecycle so the parent only deals with File instances.
 */
function PhotoSlot({
  file,
  onFile,
  aspect,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  aspect: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const url = useObjectUrl(file);
  const [reject, setReject] = useState<string>("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setReject("");
    if (!f) {
      onFile(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      setReject("Photo must be under 8 MB.");
      return;
    }
    if (!ACCEPTED.includes(f.type)) {
      setReject("Photo must be JPEG, PNG, or WebP.");
      return;
    }
    onFile(f);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`relative w-full overflow-hidden rounded-xl border bg-white transition-all duration-200 ${
          file ? "border-ink" : "border-dashed border-black/20 hover:border-black/40"
        }`}
        style={{ aspectRatio: aspect }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="6" width="18" height="14" rx="2" stroke="#6B6965" strokeWidth="1.5" />
              <circle cx="12" cy="13" r="3.5" stroke="#6B6965" strokeWidth="1.5" />
              <path d="M7 6l1.5-2h7L17 6" stroke="#6B6965" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <p className="mt-3 text-[13px] font-medium text-ink">Add photo</p>
            <p className="mt-0.5 text-[11px] text-ink-subtle">JPEG / PNG / WebP, up to 8 MB</p>
          </div>
        )}
      </button>
      {file && (
        <button
          type="button"
          onClick={() => {
            onFile(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="mt-2 text-[12px] text-ink-subtle hover:text-ink transition-colors underline underline-offset-2"
        >
          Replace photo
        </button>
      )}
      {reject && (
        <p className="mt-2 text-[11px] text-[#C9653B]">{reject}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

/** Memoised object-URL — created on file change, revoked on unmount. */
function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}
