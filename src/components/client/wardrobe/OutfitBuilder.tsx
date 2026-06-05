"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const ease = [0.16, 1, 0.3, 1] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export type BuilderItem = {
  id: string;
  sourceType: "certified" | "user_photo";
  category: string;
  subcategory: string | null;
  color: string | null;
  brand: string | null;
  nickname: string | null;
  processingStatus: string;
  usableInOutfit: boolean;
  thumbPath: string | null;
  createdAt: string;
};

// Streetwear-first slot system. Five slots reflect how a streetwear fit is
// actually built: start with sneakers → layer a top → choose pants → add
// outerwear → finish with cap / bag.
type Slot = "sneakers" | "top" | "bottom" | "outerwear" | "accessory";

// Maps wardrobe-item categories to slots. Accepts BOTH new streetwear
// values (sneakers, hoodie, tee, jacket, pants, denim, cargos, shorts,
// cap, bag) AND legacy broad values (top, bottom, shoes, outerwear, dress,
// accessory) so items captured before the taxonomy update still slot in.
const SLOT_RULES: Record<Slot, string[]> = {
  sneakers: ["sneakers", "shoes"],
  top: ["tee", "hoodie", "top", "dress", "other"],
  bottom: ["pants", "denim", "cargos", "shorts", "bottom", "dress", "other"],
  outerwear: ["jacket", "outerwear"],
  accessory: ["cap", "bag", "accessory", "other"],
};

const SLOT_LABELS: Record<Slot, string> = {
  sneakers: "Sneakers",
  top: "Top",
  bottom: "Bottom",
  outerwear: "Outerwear",
  accessory: "Accessory",
};

// Order matters: it's the order slots render in the builder and the order
// the streetwear flow makes natural sense (footwear → layers → finishing).
const SLOT_ORDER: Slot[] = ["sneakers", "top", "bottom", "outerwear", "accessory"];

// ─── Main builder ────────────────────────────────────────────────────────────

export function OutfitBuilder({ availableItems }: { availableItems: BuilderItem[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [occasion, setOccasion] = useState("");

  // Selected item per slot. Optional — outfit doesn't need to fill every slot.
  const [picks, setPicks] = useState<Partial<Record<Slot, BuilderItem>>>({});

  // Which slot is currently expanded to the picker. Null = nothing open.
  const [openSlot, setOpenSlot] = useState<Slot | null>(null);

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

  async function handleSave() {
    if (!title.trim()) {
      setError("Give your outfit a name first.");
      return;
    }
    if (itemCount === 0) {
      setError("Add at least one piece to save the fit.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const items = SLOT_ORDER
        .filter((s) => picks[s])
        .map((s) => ({ wardrobeItemId: picks[s]!.id, position: s }));

      const res = await fetch("/api/outfits/wardrobe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          occasion: occasion.trim() || undefined,
          items,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Could not save this fit.");
        setSubmitting(false);
        return;
      }
      router.push("/app/outfits");
      router.refresh();
    } catch {
      setError("Unexpected error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* Heading */}
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
          New fit
        </p>
        <h1 className="mt-2 font-serif text-[clamp(2rem,4vw,2.4rem)] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
          Build a <em className="italic">fit</em>
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-3 text-[14px] text-ink-muted max-w-[52ch]">
          Build a fit from the pieces you already own. Start with sneakers,
          layer a top, choose pants, drop outerwear, finish with a cap or
          bag. Mix your own and certified pieces freely.
        </p>
      </div>

      {/* Title + occasion */}
      <div className="space-y-4">
        <Input
          label="Fit name"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Sunday rotation"
          maxLength={120}
        />
        <Input
          label="Occasion (optional)"
          type="text"
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
          placeholder="e.g. Errands, Hoop session, Studio day"
          maxLength={120}
        />
      </div>

      {/* Slots — rendered in streetwear-natural order:
          sneakers → top → bottom → outerwear → accessory */}
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

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} loading={submitting} disabled={itemCount === 0 || !title.trim()}>
          Save fit
        </Button>
        <span className="text-[12px] text-ink-subtle">
          {itemCount} {itemCount === 1 ? "piece" : "pieces"} selected
        </span>
      </div>
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
              {picked ? (picked.nickname || titleCase(picked.category)) : "Choose a piece"}
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
  const url = useThumbUrl(item);
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
  const url = useThumbUrl(item);
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

// ─── Shared thumb-URL hook ───────────────────────────────────────────────────

/**
 * Resolves the right URL for an item's thumbnail. Certified items can use
 * their thumbPath directly (public product image). User_photo items need
 * a signed URL via /api/wardrobe/items/thumb because their paths are
 * inside a private bucket.
 */
function useThumbUrl(item: BuilderItem): string | null {
  const [url, setUrl] = useState<string | null>(
    item.sourceType === "certified" ? item.thumbPath : null,
  );
  useEffect(() => {
    if (item.sourceType === "certified") {
      setUrl(item.thumbPath);
      return;
    }
    let cancelled = false;
    fetch(`/api/wardrobe/items/thumb?id=${encodeURIComponent(item.id)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.success) setUrl(j.data.url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item.id, item.sourceType, item.thumbPath]);
  return url;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
