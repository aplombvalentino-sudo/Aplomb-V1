"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Multistep flow:
 *   "items"      → pick wardrobe pieces, name the outfit
 *   "selfie"     → capture or upload the photo we'll put the outfit on
 *   "generating" → fire the AI request (selfie + items) and wait for the
 *                  generated try-on image. On success we navigate the user
 *                  to /app/outfits/[id] where the result page renders the
 *                  hero image; on failure we fall back to the same page
 *                  (status=failed) so the user can re-try with a new selfie.
 *
 * The outfit row + storage objects are created server-side atomically in
 * POST /api/outfits/wardrobe/try-on — see that route's docstring for the
 * full pipeline.
 */
type BuilderStep = "items" | "selfie" | "generating";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BuilderItem = {
  id: string;
  sourceType: "certified" | "user_photo";
  category: string;
  subcategory: string | null;
  color: string | null;
  brand: string | null;
  nickname: string | null;
  /** Size the user owns the piece in. Shown on every picked item +
   *  baked into the AI prompt so the try-on renders the right fit. */
  size: string | null;
  processingStatus: string;
  usableInOutfit: boolean;
  /** Pre-resolved thumbnail URL from listWardrobeItems — signed for
   *  user_photo, public product URL for certified. Never a raw bucket path. */
  thumbUrl: string | null;
  createdAt: string;
};

// Broad fashion-neutral slot system. Four slots cover the standard outfit:
// Top, Bottom, Shoes, Accessory. SLOT_RULES still accept granular legacy
// values (sneakers, hoodie, tee, jacket, pants, denim, cargos, shorts, cap,
// bag) so items captured during earlier iterations still slot in cleanly.
type Slot = "top" | "bottom" | "shoes" | "accessory";

const SLOT_RULES: Record<Slot, string[]> = {
  top: ["top", "tee", "hoodie", "dress", "outerwear", "jacket", "other"],
  bottom: ["bottom", "pants", "denim", "cargos", "shorts", "dress", "other"],
  shoes: ["shoes", "sneakers"],
  accessory: ["accessory", "bag", "cap", "other"],
};

const SLOT_LABELS: Record<Slot, string> = {
  top: "Top",
  bottom: "Bottom",
  shoes: "Shoes",
  accessory: "Accessory",
};

// Order matters: it's the order slots render in the builder, and the order
// most outfits are built (top → bottom → shoes → finishing accessory).
const SLOT_ORDER: Slot[] = ["top", "bottom", "shoes", "accessory"];

// ─── Main builder ────────────────────────────────────────────────────────────

export function OutfitBuilder({
  availableItems,
  initialHeightCm,
  tryOnUsage,
}: {
  availableItems: BuilderItem[];
  /** Saved height from the user's profile. Empty when the user hasn't set
   *  one yet — the selfie step then prompts. The server persists whatever
   *  the user types here back to User.heightCm so the next try-on can
   *  skip the prompt. */
  initialHeightCm: number | null;
  /** Monthly try-on quota state. When `canTryOn === false` the builder
   *  shows a hard block on step 1 with an upgrade CTA instead of letting
   *  the user upload a selfie they can't spend. */
  tryOnUsage: {
    used: number;
    /** null = unlimited (Model... currently capped at 200, but kept for
     *  forward-compat). */
    limit: number | null;
    canTryOn: boolean;
  };
}) {
  const router = useRouter();
  const [step, setStep] = useState<BuilderStep>("items");
  const [title, setTitle] = useState("");
  const [occasion, setOccasion] = useState("");

  // Selected item per slot. Optional — outfit doesn't need to fill every slot.
  const [picks, setPicks] = useState<Partial<Record<Slot, BuilderItem>>>({});

  // Which slot is currently expanded to the picker. Null = nothing open.
  const [openSlot, setOpenSlot] = useState<Slot | null>(null);

  // Selfie state — captured by the SelfieStep child.
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  // Height in cm. Pre-fills from the user's profile when present; the
  // selfie step prompts when missing.
  const [heightCm, setHeightCm] = useState<string>(
    initialHeightCm ? String(initialHeightCm) : "",
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const itemCount = Object.keys(picks).filter((k) => picks[k as Slot]).length;

  function pick(slot: Slot, item: BuilderItem) {
    setPicks((p) => ({ ...p, [slot]: item }));
    setOpenSlot(null);
  }

  function clear(slot: Slot) {
    setPicks((p) => {
      const next = { ...p };
      delete next[slot];
      return next;
    });
  }

  function goToSelfie() {
    setError("");
    if (!title.trim()) {
      setError("Give your outfit a name first.");
      return;
    }
    if (itemCount === 0) {
      setError("Pick at least one item to try on.");
      return;
    }
    setStep("selfie");
  }

  /**
   * Fire the atomic create-and-try-on request. On success the outfit row,
   * selfie upload, AI generation, and stored result all land together —
   * we just navigate to /app/outfits/[id]. On AI failure the row still
   * exists (status=failed) so we navigate to it anyway and let the result
   * page show the error + a "Try again" affordance.
   */
  async function handleGenerate() {
    if (!selfieFile) {
      setError("Please add a selfie first.");
      return;
    }
    // Height: parse + validate. Strict enough to refuse garbage but loose
    // enough to accept "175", "175cm", "1.75" → all read as 175 cm.
    const heightTrimmed = heightCm.trim();
    const heightInt = (() => {
      const cleaned = heightTrimmed.replace(/[^\d.]/g, "");
      if (!cleaned) return null;
      const asFloat = parseFloat(cleaned);
      if (!Number.isFinite(asFloat)) return null;
      // "1.75" → 175 cm (user typed meters by accident).
      const value = asFloat < 3 ? Math.round(asFloat * 100) : Math.round(asFloat);
      return value >= 100 && value <= 250 ? value : null;
    })();
    if (!heightInt) {
      setError("Please enter your height in cm so the AI can render the fit (between 100 and 250).");
      return;
    }
    setError("");
    setSubmitting(true);
    setStep("generating");
    try {
      const items = SLOT_ORDER
        .filter((s) => picks[s])
        .map((s) => ({ wardrobeItemId: picks[s]!.id, position: s }));

      const form = new FormData();
      form.set("selfie", selfieFile);
      form.set(
        "payload",
        JSON.stringify({
          title: title.trim(),
          occasion: occasion.trim() || undefined,
          userHeightCm: heightInt,
          items,
        }),
      );

      const res = await fetch("/api/outfits/wardrobe/try-on", {
        method: "POST",
        body: form,
      });
      const json = await res.json();

      // The route returns `outfitId` on success AND on TRYON_FAILED — both
      // cases mean the row exists. Navigate to the detail page either way.
      const outfitId: string | undefined =
        json?.data?.outfitId ?? json?.error?.outfitId;

      if (!json?.success && !outfitId) {
        setError(json?.error?.message ?? "Could not start the try-on.");
        setSubmitting(false);
        setStep("selfie");
        return;
      }

      if (outfitId) {
        router.push(`/app/outfits/${outfitId}`);
        router.refresh();
        return;
      }

      // Unknown shape — be defensive.
      setError("Unexpected response from the try-on service.");
      setStep("selfie");
      setSubmitting(false);
    } catch {
      setError("Network error. Please try again.");
      setStep("selfie");
      setSubmitting(false);
    }
  }

  // Picked items, in slot order — used by Selfie + Generating steps.
  const picked = SLOT_ORDER.filter((s) => picks[s]).map((s) => ({ slot: s, item: picks[s]! }));

  return (
    <div className="space-y-10">
      {/* Progress dots — three steps */}
      <div className="flex items-center gap-2">
        {(["items", "selfie", "generating"] as BuilderStep[]).map((s, i) => {
          const active = ["items", "selfie", "generating"].indexOf(step) >= i;
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
        {step === "items" && (
          <motion.section
            key="items"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease }}
            className="space-y-10"
          >
            {/* Heading */}
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
                Step 1 of 3 · Pick pieces
              </p>
              <h1 className="mt-2 font-serif text-[clamp(2rem,4vw,2.4rem)] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
                Build an <em className="italic">outfit</em>
                <span className="text-accent">.</span>
              </h1>
              <p className="mt-3 text-[14px] text-ink-muted max-w-[52ch]">
                Pick pieces from your wardrobe — your own clothes and certified
                brand items mix freely. Next step: take a selfie and we&apos;ll
                generate a picture of you wearing this outfit.
              </p>
            </div>

            {/* Title + occasion */}
            <div className="space-y-4">
              <Input
                label="Outfit name"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sunday brunch"
                maxLength={120}
              />
              <Input
                label="Occasion (optional)"
                type="text"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                placeholder="e.g. Weekend, Office day, Dinner"
                maxLength={120}
              />
            </div>

            {/* Slots */}
            <div className="space-y-3">
              {SLOT_ORDER.map((slot) => (
                <SlotRow
                  key={slot}
                  slot={slot}
                  picked={picks[slot] ?? null}
                  isOpen={openSlot === slot}
                  availableItems={availableItems.filter((i) =>
                    SLOT_RULES[slot].includes(i.category),
                  )}
                  onToggle={() => setOpenSlot((cur) => (cur === slot ? null : slot))}
                  onPick={(item) => pick(slot, item)}
                  onClear={() => clear(slot)}
                />
              ))}
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Monthly try-on quota panel — visible if user has hit the
                cap; the button is also disabled. Otherwise just a quiet
                "X / Y this month" badge. */}
            {!tryOnUsage.canTryOn ? (
              <div className="rounded-2xl border border-red-100 bg-red-50/40 px-4 py-4">
                <p className="font-serif text-[1.05rem] font-medium text-ink">
                  You&apos;ve reached your monthly try-on limit.
                </p>
                <p className="mt-1.5 text-[12px] text-ink-muted">
                  {tryOnUsage.limit
                    ? `Your plan includes ${tryOnUsage.limit} try-ons per month. Upgrade for more.`
                    : "Upgrade your plan to unlock more try-ons."}
                </p>
                <Link
                  href="/app/pricing"
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2
                             text-[12px] font-medium text-white hover:bg-[#2a2622] transition-colors"
                >
                  See upgrade options
                </Link>
              </div>
            ) : (
              tryOnUsage.limit !== null && (
                <p className="text-[11px] text-ink-subtle text-right">
                  {tryOnUsage.used} / {tryOnUsage.limit} try-ons used this month
                </p>
              )
            )}

            <div className="flex items-center gap-3">
              <Button
                onClick={goToSelfie}
                disabled={itemCount === 0 || !title.trim() || !tryOnUsage.canTryOn}
              >
                Next — take a selfie
              </Button>
              <span className="text-[12px] text-ink-subtle">
                {itemCount} {itemCount === 1 ? "item" : "items"} selected
              </span>
            </div>
          </motion.section>
        )}

        {step === "selfie" && (
          <SelfieStep
            key="selfie"
            picked={picked}
            selfieFile={selfieFile}
            onSelfie={(f) => setSelfieFile(f)}
            heightCm={heightCm}
            onHeight={setHeightCm}
            heightPrefilled={Boolean(initialHeightCm)}
            onBack={() => setStep("items")}
            onGenerate={handleGenerate}
            submitting={submitting}
            error={error}
          />
        )}

        {step === "generating" && <GeneratingStep key="generating" picked={picked} />}
      </AnimatePresence>
    </div>
  );
}

// ─── Slot row ────────────────────────────────────────────────────────────────

function SlotRow({
  slot,
  picked,
  isOpen,
  availableItems,
  onToggle,
  onPick,
  onClear,
}: {
  slot: Slot;
  picked: BuilderItem | null;
  isOpen: boolean;
  availableItems: BuilderItem[];
  onToggle: () => void;
  onPick: (item: BuilderItem) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface overflow-hidden">
      {/* Row header — clickable, shows picked or "Choose" */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left
                   hover:bg-surface-raised transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          {picked ? (
            <SlotPickedThumb item={picked} />
          ) : (
            <div className="h-12 w-12 rounded-lg border border-dashed border-black/20 flex items-center justify-center">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-subtle">
                {SLOT_LABELS[slot].slice(0, 2)}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
              {SLOT_LABELS[slot]}
            </p>
            <p className="mt-0.5 text-[14px] font-medium text-ink truncate">
              {picked ? (picked.nickname || titleCase(picked.category)) : "Choose an item"}
            </p>
            {picked && (
              <p className="text-[11px] text-ink-subtle truncate">
                {picked.brand || (picked.sourceType === "user_photo" ? "Personal" : "Brand item")}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          {picked && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              aria-label={`Clear ${slot}`}
              className="text-[11px] text-ink-subtle hover:text-ink transition-colors underline underline-offset-2"
            >
              Clear
            </button>
          )}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            aria-hidden
          >
            <path d="M3 4.5L6 7.5L9 4.5" stroke="#6B6965" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {/* Picker — collapses out when open */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="border-t border-hairline bg-canvas"
          >
            <div className="px-5 py-5">
              {availableItems.length === 0 ? (
                <p className="text-[13px] text-ink-muted text-center py-8">
                  No {SLOT_LABELS[slot].toLowerCase()} items in your wardrobe yet.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {availableItems.map((it) => (
                    <PickableItem key={it.id} item={it} onPick={() => onPick(it)} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Picked-thumb (the selected item on the slot row) ────────────────────────

function SlotPickedThumb({ item }: { item: BuilderItem }) {
  const url = item.thumbUrl;
  return (
    <div className="relative h-12 w-12 rounded-lg overflow-hidden ring-1 ring-black/[0.06] bg-[#F6F3EE]">
      {url && (
        <Image
          src={url}
          alt={item.nickname || item.category}
          fill
          sizes="48px"
          className="object-cover"
        />
      )}
    </div>
  );
}

// ─── Pickable tile (in the expanded picker grid) ─────────────────────────────

function PickableItem({
  item,
  onPick,
}: {
  item: BuilderItem;
  onPick: () => void;
}) {
  const url = item.thumbUrl;
  return (
    <button
      type="button"
      onClick={onPick}
      className="group flex flex-col items-stretch rounded-xl border border-hairline bg-surface
                 hover:border-ink/30 hover:shadow-[0_4px_18px_rgba(0,0,0,0.04)] transition-all duration-200 overflow-hidden text-left"
    >
      <div className="relative aspect-[3/4] bg-[#F6F3EE]">
        {url ? (
          <Image
            src={url}
            alt={item.nickname || item.category}
            fill
            sizes="(max-width: 640px) 33vw, 160px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-[0.12em] text-ink-subtle">
            {item.category}
          </div>
        )}
        <span
          className={`absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-semibold
                      uppercase tracking-[0.08em] ${
                        item.sourceType === "user_photo"
                          ? "bg-white/95 text-ink"
                          : "bg-ink/90 text-white"
                      }`}
        >
          {item.sourceType === "user_photo" ? "Mine" : "Brand"}
        </span>
      </div>
      <div className="px-2 py-1.5">
        <p className="text-[11px] font-medium text-ink truncate">
          {item.nickname || titleCase(item.category)}
        </p>
        <p className="text-[10px] text-ink-subtle truncate">
          {item.brand || (item.sourceType === "user_photo" ? "Personal" : "Brand")}
        </p>
      </div>
    </button>
  );
}

// ─── Step 2: Selfie capture ────────────────────────────────────────────────

const MAX_SELFIE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_SELFIE_MIME = ["image/jpeg", "image/png", "image/webp"];

function SelfieStep({
  picked,
  selfieFile,
  onSelfie,
  heightCm,
  onHeight,
  heightPrefilled,
  onBack,
  onGenerate,
  submitting,
  error,
}: {
  picked: Array<{ slot: Slot; item: BuilderItem }>;
  selfieFile: File | null;
  onSelfie: (f: File | null) => void;
  heightCm: string;
  onHeight: (v: string) => void;
  heightPrefilled: boolean;
  onBack: () => void;
  onGenerate: () => void;
  submitting: boolean;
  error: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [reject, setReject] = useState<string>("");
  const url = useObjectUrl(selfieFile);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setReject("");
    if (!f) {
      onSelfie(null);
      return;
    }
    if (f.size > MAX_SELFIE_BYTES) {
      setReject("Selfie must be under 8 MB.");
      return;
    }
    if (!ACCEPTED_SELFIE_MIME.includes(f.type)) {
      setReject("Selfie must be JPEG, PNG, or WebP.");
      return;
    }
    onSelfie(f);
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease }}
      className="space-y-8"
    >
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
          Step 2 of 3 · Your selfie
        </p>
        <h1 className="mt-2 font-serif text-[clamp(2rem,4vw,2.4rem)] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
          Add a picture of <em className="italic">you</em>
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-3 text-[14px] text-ink-muted max-w-[52ch]">
          The AI uses your photo as the base and dresses you in the pieces you
          picked. Full body in a simple pose works best — face visible,
          plain background, even daylight.
        </p>
      </div>

      <ul className="space-y-2 text-[13px] text-ink">
        <BulletLi>Stand against a plain wall in daylight</BulletLi>
        <BulletLi>Full body, face visible, arms relaxed</BulletLi>
        <BulletLi>Wear close-fitting clothes so the AI sees your silhouette</BulletLi>
      </ul>

      {/* Picker tile */}
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`relative w-full overflow-hidden rounded-xl border bg-white transition-all duration-200 ${
            selfieFile ? "border-ink" : "border-dashed border-black/20 hover:border-black/40"
          }`}
          style={{ aspectRatio: "3 / 4" }}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Selfie preview" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="6" width="18" height="14" rx="2" stroke="#6B6965" strokeWidth="1.5" />
                <circle cx="12" cy="13" r="3.5" stroke="#6B6965" strokeWidth="1.5" />
                <path d="M7 6l1.5-2h7L17 6" stroke="#6B6965" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              <p className="mt-3 text-[13px] font-medium text-ink">Add selfie</p>
              <p className="mt-0.5 text-[11px] text-ink-subtle">JPEG / PNG / WebP, up to 8 MB</p>
            </div>
          )}
        </button>
        {selfieFile && (
          <button
            type="button"
            onClick={() => {
              onSelfie(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="mt-2 text-[12px] text-ink-subtle hover:text-ink transition-colors underline underline-offset-2"
          >
            Replace selfie
          </button>
        )}
        {reject && <p className="mt-2 text-[11px] text-[#C9653B]">{reject}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="user"
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {/* Height — required, baked into the AI prompt so the size renders
          in proportion to your body. Pre-filled from profile when set. */}
      <div className="rounded-2xl border border-hairline bg-surface p-4">
        <label className="block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-subtle mb-2">
          Your height
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={heightCm}
            onChange={(e) => onHeight(e.target.value)}
            placeholder="e.g. 175"
            className="w-32 rounded-xl border border-hairline-strong bg-white px-3 py-2 text-[14px] text-ink
                       placeholder:text-ink-subtle focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink
                       transition-colors duration-200"
          />
          <span className="text-[13px] text-ink-muted">cm</span>
          {heightPrefilled && (
            <span className="ml-auto text-[11px] text-ink-subtle">From your profile · edit if needed</span>
          )}
        </div>
        <p className="mt-2 text-[12px] text-ink-subtle">
          The AI uses your height to render the size correctly on your body —
          a M on 165cm hangs differently than a M on 190cm.
        </p>
      </div>

      {/* What we're about to try on — each picked item shows its size so
          you can verify before generating. */}
      <div className="rounded-2xl border border-hairline bg-surface p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-subtle mb-3">
          You&apos;ll be wearing
        </p>
        <div className="grid grid-cols-4 gap-2">
          {picked.map((p) => (
            <PickedThumb key={p.slot} item={p.item} />
          ))}
        </div>
        <ul className="mt-4 space-y-1 text-[12px] text-ink-muted">
          {picked.map((p) => (
            <li key={p.slot} className="flex items-center justify-between gap-3">
              <span className="truncate">
                {SLOT_LABELS[p.slot]}: {p.item.nickname || titleCase(p.item.category)}
              </span>
              <span className="shrink-0 rounded-full bg-ink/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink">
                {p.item.size ?? "no size"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="rounded-full border border-hairline-strong bg-white px-5 py-2.5 text-sm
                     font-medium text-ink-muted hover:bg-white/80 transition-all duration-200
                     disabled:opacity-50"
        >
          Back
        </button>
        <Button onClick={onGenerate} disabled={!selfieFile || submitting} loading={submitting}>
          Generate try-on
        </Button>
      </div>
    </motion.section>
  );
}

function PickedThumb({ item }: { item: BuilderItem }) {
  const url = item.thumbUrl;
  return (
    <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#F6F3EE] ring-1 ring-black/[0.06]">
      {url ? (
        <Image
          src={url}
          alt={item.nickname || item.category}
          fill
          sizes="80px"
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[9px] uppercase tracking-[0.1em] text-ink-subtle">
          {item.category}
        </div>
      )}
    </div>
  );
}

function BulletLi({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 leading-relaxed">
      <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#C9A882]" />
      <span>{children}</span>
    </li>
  );
}

// ─── Step 3: Generating (waiting on the AI) ────────────────────────────────

function GeneratingStep({ picked }: { picked: Array<{ slot: Slot; item: BuilderItem }> }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease }}
      className="space-y-8"
    >
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
          Step 3 of 3 · Generating
        </p>
        <h1 className="mt-2 font-serif text-[clamp(2rem,4vw,2.4rem)] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
          Putting the outfit <em className="italic">on you</em>
          <span className="text-accent">…</span>
        </h1>
        <p className="mt-3 text-[14px] text-ink-muted max-w-[52ch]">
          The AI is rendering you in {picked.length} {picked.length === 1 ? "piece" : "pieces"}.
          This usually takes 15–30 seconds. We&apos;ll take you to the result
          as soon as it&apos;s ready.
        </p>
      </div>

      {/* Indeterminate progress bar */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.06]">
        <motion.span
          className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-accent"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="rounded-2xl border border-hairline bg-surface p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-subtle mb-3">
          We&apos;re dressing you in
        </p>
        <div className="grid grid-cols-4 gap-2">
          {picked.map((p) => (
            <PickedThumb key={p.slot} item={p.item} />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

/** Object URL for File preview; revoked on unmount. */
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
