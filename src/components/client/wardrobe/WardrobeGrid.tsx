"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/Button";
import type { ClientPlan } from "@/lib/planLimits";

const ease = [0.16, 1, 0.3, 1] as const;

// ─── Types (mirror server payload) ───────────────────────────────────────────

export type WardrobeGridItem = {
  id: string;
  sourceType: "certified" | "user_photo";
  category: string;
  subcategory: string | null;
  color: string | null;
  brand: string | null;
  nickname: string | null;
  processingStatus:
    | "pending_upload" | "processing" | "needs_review" | "ready" | "failed";
  usableInOutfit: boolean;
  /** Ready-to-render URL: signed Supabase URL for user_photo, public
   *  product CDN URL for certified. Server already resolved this — clients
   *  must not refetch unless explicitly refreshing after a mutation. */
  thumbUrl: string | null;
  createdAt: string;
};

type Quota = {
  maxItems: number;
  maxPersonalPhotos: number;
  itemsUsed: number;
  personalPhotosUsed: number;
};

// ─── Grid component ──────────────────────────────────────────────────────────

export function WardrobeGrid({
  items,
  quota,
  plan,
}: {
  items: WardrobeGridItem[];
  quota: Quota;
  plan: ClientPlan;
}) {
  const itemsFull = quota.itemsUsed >= quota.maxItems;
  const personalFull = quota.personalPhotosUsed >= quota.maxPersonalPhotos;

  // ── EMPTY STATE ────────────────────────────────────────────────────────
  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-8">
      {/* Action bar — Add buttons + cap-reached hints */}
      <div className="flex flex-wrap items-center gap-3">
        <AddPersonalButton disabled={personalFull || itemsFull} />
        <AddCertifiedButton disabled={itemsFull} />
        {personalFull && !itemsFull && (
          <p className="text-[12px] text-ink-subtle">
            Personal-item cap reached — upgrade to add more.
          </p>
        )}
        {itemsFull && (
          <p className="text-[12px] text-[#C9653B]">
            Wardrobe full ({quota.maxItems} items) — remove one or
            <Link href="/pricing" className="underline underline-offset-2 ml-1">upgrade</Link>.
          </p>
        )}
      </div>

      {/* Grid */}
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <WardrobeCard key={item.id} item={item} />
        ))}
      </ul>

      {/* Footer hint — only for Essential users who haven't hit the cap yet */}
      {plan === "essential" && !itemsFull && (
        <p className="text-center text-[12px] text-ink-subtle">
          Your Essential plan includes 10 wardrobe slots, with up to 3 of
          your own clothing items.
        </p>
      )}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="rounded-2xl border border-hairline bg-surface px-6 py-16 text-center"
    >
      <p className="font-serif text-[1.5rem] font-medium text-ink leading-snug">
        Your digital wardrobe is empty.
      </p>
      <p className="mt-3 max-w-[44ch] mx-auto text-[14px] text-ink-muted leading-relaxed">
        Add a piece you own or save a certified item to start building outfits.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <AddPersonalButton />
        <AddCertifiedButton variant="secondary" />
      </div>
    </motion.div>
  );
}

// ─── Add buttons ─────────────────────────────────────────────────────────────

function AddPersonalButton({ disabled }: { disabled?: boolean }) {
  return (
    <Link
      href={disabled ? "#" : "/app/wardrobe/add"}
      aria-disabled={disabled}
      className={
        disabled
          ? "inline-flex items-center gap-2 rounded-full bg-ink/40 px-5 py-2.5 text-[13px] font-medium text-white cursor-not-allowed"
          : "inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#2a2622] transition-colors"
      }
    >
      Add a clothing item I already own
    </Link>
  );
}

function AddCertifiedButton({
  variant = "primary",
  disabled,
}: { variant?: "primary" | "secondary"; disabled?: boolean }) {
  return (
    <Link
      href={disabled ? "#" : "/app/discover"}
      aria-disabled={disabled}
      className={
        disabled
          ? "inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/40 px-5 py-2.5 text-[13px] font-medium text-ink-muted cursor-not-allowed"
          : variant === "secondary"
            ? "inline-flex items-center gap-2 rounded-full border border-hairline-strong bg-surface px-5 py-2.5 text-[13px] font-medium text-ink hover:bg-surface-raised transition-colors"
            : "inline-flex items-center gap-2 rounded-full border border-hairline-strong bg-surface px-5 py-2.5 text-[13px] font-medium text-ink hover:bg-surface-raised transition-colors"
      }
    >
      Add a certified brand item
    </Link>
  );
}

// ─── Per-item card ───────────────────────────────────────────────────────────

function WardrobeCard({ item }: { item: WardrobeGridItem }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  // The thumbnail URL is resolved server-side in listWardrobeItems — either
  // a freshly signed Supabase URL (user_photo) or a public product CDN URL
  // (certified). No per-card fetch: that pattern was an N+1 against both
  // our API and Supabase storage.
  const thumbUrl = item.thumbUrl;

  async function handleDelete() {
    if (!confirm(`Remove "${item.nickname || item.category}" from your wardrobe?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/wardrobe/items/${item.id}`, { method: "DELETE" });
      if (res.ok) {
        startTransition(() => router.refresh());
        return;
      }
    } catch {}
    setDeleting(false);
  }

  return (
    <li
      className="group relative rounded-2xl border border-hairline bg-surface overflow-hidden
                 hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-shadow duration-300"
    >
      {/* Visual area */}
      <div className="relative aspect-[3/4] bg-[#F6F3EE]">
        {thumbUrl ? (
          <Image
            src={thumbUrl}
            alt={item.nickname || item.category}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
            className="object-cover"
          />
        ) : (
          <ProcessingPlaceholder status={item.processingStatus} />
        )}

        {/* Source pill (top-left) */}
        <span
          className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[9px] font-semibold
                      uppercase tracking-[0.1em] ${
                        item.sourceType === "user_photo"
                          ? "bg-white/95 text-ink"
                          : "bg-ink/90 text-white"
                      }`}
        >
          {item.sourceType === "user_photo" ? "Mine" : "Brand"}
        </span>

        {/* Delete button — appears on hover (focus-visible too for keyboard nav) */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Remove from wardrobe"
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
      <div className="px-3 py-2.5">
        <p className="text-[13px] font-medium text-ink truncate">
          {item.nickname || titleCase(item.category)}
        </p>
        <p className="text-[11px] text-ink-subtle truncate">
          {item.brand || (item.sourceType === "user_photo" ? "Personal" : "Brand item")}
        </p>
      </div>
    </li>
  );
}

// ─── Per-status placeholder for items still being processed ──────────────────

function ProcessingPlaceholder({
  status,
}: {
  status: WardrobeGridItem["processingStatus"];
}) {
  const labels = {
    pending_upload: "Uploading…",
    processing: "Processing…",
    needs_review: "Almost ready",
    ready: "Loading…", // transient: ready but thumb URL not fetched yet
    failed: "Upload failed",
  } as const;

  const isError = status === "failed";

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
      {!isError && (
        <span className="h-1.5 w-8 rounded-full bg-ink/20 overflow-hidden mb-3">
          <AnimatePresence>
            <motion.span
              className="block h-full rounded-full bg-ink"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            />
          </AnimatePresence>
        </span>
      )}
      <p
        className={`text-[10px] font-medium uppercase tracking-[0.12em] ${
          isError ? "text-[#C9653B]" : "text-ink-subtle"
        }`}
      >
        {labels[status]}
      </p>
    </div>
  );
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// Tiny shim so TS doesn't error on unused import. Button retained for future
// expansion (filter chips, sort menu) without re-import churn.
export const _wardrobeGridButtonShim = Button;
