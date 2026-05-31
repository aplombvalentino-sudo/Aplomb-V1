"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ease } from "../helpers";
import type { Brand, OutfitDTO } from "../types";

type TryOnState = Record<string, { url?: string; loading?: boolean; error?: string }>;

/**
 * Step 5 — Picked outfits + per-item try-on + save-to-wardrobe.
 * Cross-brand links (Browse more, View wardrobe) are hidden in widgetMode
 * so the iframe shopper stays inside the host brand's flow.
 */
export function OutfitsStep({
  brand,
  outfits,
  tryOnByItem,
  savedIds,
  widgetMode,
  onTryOn,
  onSave,
  onStartOver,
}: {
  brand: Brand;
  outfits: OutfitDTO[];
  tryOnByItem: TryOnState;
  savedIds: Set<string>;
  widgetMode: boolean;
  onTryOn: (itemId: string) => void;
  onSave: (outfit: OutfitDTO) => void;
  onStartOver: () => void;
}) {
  return (
    <motion.section
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
                        onClick={() => onTryOn(item.id)}
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
                    onClick={() => onSave(outfit)}
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
          onClick={onStartOver}
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
  );
}
