"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

const ease = [0.16, 1, 0.3, 1] as const;

export type OutfitListItem = {
  id: string;
  title: string;
  occasion: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    position: string;
    wardrobeItemId: string;
    category: string;
    nickname: string | null;
    brand: string | null;
    sourceType: "certified" | "user_photo";
    thumbPath: string | null;
  }>;
};

export function OutfitsList({
  outfits,
  wardrobeItemCount,
}: {
  outfits: OutfitListItem[];
  wardrobeItemCount: number;
}) {
  if (outfits.length === 0) {
    return <EmptyState wardrobeItemCount={wardrobeItemCount} />;
  }

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {outfits.map((o) => (
        <OutfitCard key={o.id} outfit={o} />
      ))}
    </ul>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ wardrobeItemCount }: { wardrobeItemCount: number }) {
  const hasItems = wardrobeItemCount > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="rounded-2xl border border-hairline bg-surface px-6 py-16 text-center"
    >
      <p className="font-serif text-[1.5rem] font-medium text-ink leading-snug">
        {hasItems ? "No outfits yet." : "Your wardrobe is waiting."}
      </p>
      <p className="mt-3 max-w-[46ch] mx-auto text-[14px] text-ink-muted leading-relaxed">
        {hasItems
          ? "Pick a top, a bottom, shoes and any layer you want — name the outfit and save it for later."
          : "Add a few clothing items to your wardrobe first, then start building outfits."}
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {hasItems ? (
          <Link
            href="/app/outfits/new"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5
                       text-[13px] font-medium text-white hover:bg-[#2a2622] transition-colors"
          >
            Build my first outfit
          </Link>
        ) : (
          <Link
            href="/app/wardrobe"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5
                       text-[13px] font-medium text-white hover:bg-[#2a2622] transition-colors"
          >
            Go to my wardrobe
          </Link>
        )}
      </div>
    </motion.div>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────

function OutfitCard({ outfit }: { outfit: OutfitListItem }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete the outfit "${outfit.title}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/outfits/wardrobe/${outfit.id}`, { method: "DELETE" });
      if (res.ok) {
        startTransition(() => router.refresh());
        return;
      }
    } catch {}
    setDeleting(false);
  }

  return (
    <li className="group rounded-2xl border border-hairline bg-surface overflow-hidden
                   hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-shadow duration-300">
      {/* Composite thumbnail strip — overlapping tiles of the items */}
      <div className="relative h-44 bg-[#F6F3EE] overflow-hidden flex items-end justify-center pb-4 px-4 gap-2">
        {outfit.items.slice(0, 4).map((it) => (
          <OutfitItemThumb key={it.id} item={it} />
        ))}

        {/* Delete button — top-right on hover */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete outfit"
          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/95 flex items-center justify-center
                     opacity-0 group-hover:opacity-100 focus-visible:opacity-100
                     transition-opacity duration-200 ring-1 ring-black/10 hover:bg-white
                     disabled:opacity-50 disabled:cursor-wait"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
            <path d="M2.5 2.5l6 6M8.5 2.5l-6 6" stroke="#111010" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Card body */}
      <div className="px-4 py-3">
        <p className="text-[14px] font-medium text-ink truncate">{outfit.title}</p>
        <p className="mt-0.5 text-[11px] text-ink-subtle truncate">
          {outfit.occasion ?? `${outfit.items.length} item${outfit.items.length === 1 ? "" : "s"}`}
        </p>
      </div>
    </li>
  );
}

/** A small thumbnail tile inside the outfit-card strip. Signs user-photo URLs lazily. */
function OutfitItemThumb({ item }: { item: OutfitListItem["items"][number] }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (item.sourceType === "certified" && item.thumbPath) {
      setUrl(item.thumbPath);
      return;
    }
    if (item.sourceType === "user_photo") {
      fetch(`/api/wardrobe/items/thumb?id=${encodeURIComponent(item.wardrobeItemId)}`)
        .then((r) => r.json())
        .then((j) => {
          if (!cancelled && j.success) setUrl(j.data.url);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [item.wardrobeItemId, item.sourceType, item.thumbPath]);

  return (
    <div className="relative h-24 w-20 rounded-lg overflow-hidden bg-white shadow-sm ring-1 ring-black/[0.04]">
      {url ? (
        <Image
          src={url}
          alt={item.nickname || item.category}
          fill
          sizes="80px"
          className="object-cover"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-[9px] uppercase tracking-[0.1em] text-ink-subtle">
          {item.category.slice(0, 3)}
        </div>
      )}
    </div>
  );
}
