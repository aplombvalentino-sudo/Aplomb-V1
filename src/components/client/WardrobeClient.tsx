"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export type WardrobeOutfit = {
  id: string;
  brandName: string;
  brandSlug: string;
  items: { name: string; size: string; category?: string }[];
  savedAt: string; // ISO string
};

const WARDROBE_KEY = "aplomb_wardrobe";

function loadWardrobe(): WardrobeOutfit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WARDROBE_KEY);
    return raw ? (JSON.parse(raw) as WardrobeOutfit[]) : [];
  } catch {
    return [];
  }
}

function saveWardrobe(outfits: WardrobeOutfit[]) {
  localStorage.setItem(WARDROBE_KEY, JSON.stringify(outfits));
}

const ease = [0.16, 1, 0.3, 1] as const;

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── Empty state ──────────────────────────────────────────────────────────────
function EmptyWardrobe() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      {/* Hanger icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full
                      bg-white border border-black/[0.08] shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden>
          <path
            d="M17 7a3.5 3.5 0 0 1 3.5 3.5c0 1.5-.9 2.8-2.2 3.3L17 14.5"
            stroke="#C9A882" strokeWidth="1.5" strokeLinecap="round"
          />
          <path
            d="M17 14.5L5.5 21.5a2 2 0 0 0 1 3.5h23a2 2 0 0 0 1-3.5L17 14.5z"
            stroke="#C9A882" strokeWidth="1.5" strokeLinejoin="round"
          />
        </svg>
      </div>

      <h3 className="font-serif text-[1.4rem] font-semibold text-[#111010] tracking-[-0.02em]">
        Your wardrobe is empty.
      </h3>
      <p className="mt-2 max-w-[34ch] text-[14px] leading-relaxed text-[#6B6965]">
        Save outfits while scanning brands — they&apos;ll appear here so you can
        revisit and compare looks anytime.
      </p>

      <a
        href="/app"
        className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#111010]
                   pl-5 pr-2 py-2.5 text-[13px] font-medium text-white
                   hover:bg-[#2a2a2a] transition-all duration-300"
      >
        Browse brands
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.12]">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path d="M2 8L8 2M8 2H3.5M8 2V6.5"
                  stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </a>
    </motion.div>
  );
}

// ── Outfit card ──────────────────────────────────────────────────────────────
function OutfitCard({
  outfit,
  onRemove,
}: {
  outfit: WardrobeOutfit;
  onRemove: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease }}
      className="group relative rounded-2xl border border-black/[0.08] bg-white
                 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)]
                 transition-shadow duration-300"
    >
      {/* Brand + date header */}
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div>
          <a
            href={`/app/${outfit.brandSlug}`}
            className="text-[13px] font-semibold text-[#111010]
                       hover:underline underline-offset-2 transition-colors"
          >
            {outfit.brandName}
          </a>
          <p className="mt-0.5 text-[11px] text-[#9C9894]">{formatDate(outfit.savedAt)}</p>
        </div>

        {/* Remove button */}
        {confirmDelete ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onRemove(outfit.id)}
              className="rounded-lg bg-[#111010] px-2.5 py-1 text-[11px] font-medium
                         text-white hover:bg-red-700 transition-colors duration-200"
            >
              Remove
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-black/[0.08] px-2.5 py-1 text-[11px]
                         font-medium text-[#9C9894] hover:text-[#111010] transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label="Remove outfit"
            className="opacity-0 group-hover:opacity-100 flex h-7 w-7 items-center justify-center
                       rounded-full border border-black/[0.08] bg-white text-[#C9C5C0]
                       hover:text-[#6B6965] hover:border-black/20 transition-all duration-200"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
              <path d="M2 2l7 7M9 2l-7 7"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Items */}
      <ul className="space-y-1.5">
        {outfit.items.map((item, idx) => (
          <li key={idx} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {item.category && (
                <span className="shrink-0 text-[10px] uppercase tracking-[0.12em]
                                 font-medium text-[#C9A882]">
                  {item.category}
                </span>
              )}
              <span className="truncate text-[13px] text-[#3a3632]">{item.name}</span>
            </div>
            <span className="shrink-0 rounded-md border border-black/[0.07] bg-[#F7F6F3]
                             px-2 py-0.5 font-mono text-[11px] font-medium text-[#6B6965]">
              {item.size}
            </span>
          </li>
        ))}
      </ul>

      {/* View brand CTA */}
      <div className="mt-4 pt-3.5 border-t border-black/[0.06]">
        <a
          href={`/app/${outfit.brandSlug}`}
          className="inline-flex items-center gap-1 text-[12px] text-[#9C9894]
                     hover:text-[#111010] transition-colors duration-200"
        >
          Scan again
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="ml-0.5" aria-hidden>
            <path d="M2 8L8 2M8 2H4M8 2V6"
                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>
    </motion.article>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function WardrobeClient() {
  const [outfits, setOutfits] = useState<WardrobeOutfit[]>([]);
  const [mounted, setMounted] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);

  useEffect(() => {
    setOutfits(loadWardrobe());
    setMounted(true);
  }, []);

  function removeOutfit(id: string) {
    setOutfits((prev) => {
      const next = prev.filter((o) => o.id !== id);
      saveWardrobe(next);
      return next;
    });
  }

  const sorted = [...outfits].sort((a, b) => {
    const diff =
      new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
    return sortNewest ? diff : -diff;
  });

  // Skeleton while loading
  if (!mounted) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[120px] rounded-2xl bg-black/[0.04] animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    );
  }

  if (outfits.length === 0) return <EmptyWardrobe />;

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-[13px] text-[#9C9894]">
          {outfits.length} {outfits.length === 1 ? "look" : "looks"} saved
        </p>
        <button
          onClick={() => setSortNewest((v) => !v)}
          className="flex items-center gap-1.5 rounded-full border border-black/[0.08]
                     bg-white px-3 py-1.5 text-[12px] font-medium text-[#6B6965]
                     hover:text-[#111010] hover:border-black/20 transition-all duration-200"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
            <path d="M1.5 3.5h8M3 5.5h5M4.5 7.5h2"
                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          {sortNewest ? "Newest first" : "Oldest first"}
        </button>
      </div>

      {/* Grid */}
      <motion.ul
        layout
        className="grid gap-4 sm:grid-cols-2"
        role="list"
      >
        <AnimatePresence mode="popLayout">
          {sorted.map((outfit) => (
            <OutfitCard key={outfit.id} outfit={outfit} onRemove={removeOutfit} />
          ))}
        </AnimatePresence>
      </motion.ul>

      {/* Clear all */}
      {outfits.length > 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 text-center"
        >
          <button
            onClick={() => {
              if (
                window.confirm(
                  `Remove all ${outfits.length} saved looks? This cannot be undone.`
                )
              ) {
                setOutfits([]);
                saveWardrobe([]);
              }
            }}
            className="text-[12px] text-[#C9C5C0] hover:text-[#9C9894] transition-colors duration-200"
          >
            Clear all looks
          </button>
        </motion.div>
      )}
    </div>
  );
}
