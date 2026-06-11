"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { TiltCard } from "@/components/fx/TiltCard";
import { ease, staggerContainer, depthItem } from "@/lib/motion";
import type { ClientPlan } from "@/lib/planLimits";

// ─── Types (mirror server payload) ───────────────────────────────────────────

export type WardrobeGridItem = {
  id: string;
  sourceType: "certified" | "user_photo";
  category: string;
  subcategory: string | null;
  color: string | null;
  brand: string | null;
  nickname: string | null;
  /** Size the user owns the piece in. Null on legacy rows. */
  size: string | null;
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
  const reduce = useReducedMotion();
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
          <p className="text-[12px] text-accent">
            Wardrobe full ({quota.maxItems} items) — remove one or
            <Link href="/pricing" className="underline underline-offset-2 ml-1">upgrade</Link>.
          </p>
        )}
      </div>

      {/* Grid — one shared vanishing point (perspective-stage); cards rise
          from a step back in Z on first paint via depth-staggered entrance.
          Reduced motion skips the hidden state entirely. */}
      <motion.ul
        variants={staggerContainer(0.06)}
        initial={reduce ? false : "hidden"}
        animate="show"
        className="perspective-stage grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        {items.map((item) => (
          <WardrobeCard key={item.id} item={item} />
        ))}
      </motion.ul>

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
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="rounded-2xl border border-hairline bg-surface px-6 py-16 text-center"
    >
      {/* Ghost stack — three offset, slightly rotated planes: a closet
          awaiting clothes. Decorative only (aria-hidden), no motion. */}
      <div aria-hidden className="relative mx-auto mb-8 h-32 w-24">
        <span className="absolute inset-0 -rotate-3 -translate-x-3 rounded-xl bg-stone-deep/70" />
        <span className="absolute inset-0 rotate-3 translate-x-3 rounded-xl bg-stone-deep/50" />
        <span className="absolute inset-0 -rotate-1 rounded-xl border border-hairline bg-stone shadow-card" />
      </div>

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
          ? "inline-flex items-center gap-2 rounded-full bg-ink/40 px-5 py-2.5 text-[13px] font-medium text-on-ink cursor-not-allowed"
          : "inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-on-ink hover:bg-ink/90 transition-colors"
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
    // motion.li carries the depth-stagger entrance (variants inherited from
    // the grid's staggerContainer); TiltCard makes the garment tilt + lift
    // like a physical object. All logic (delete, thumb, status) unchanged.
    <motion.li variants={depthItem} className="list-none preserve-3d">
      <TiltCard
        maxTilt={5}
        className="group rounded-2xl border border-hairline bg-surface overflow-hidden"
      >
        {/* Visual area */}
        <div className="relative aspect-[3/4] bg-stone">
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

          {/* Source pill (top-left) — stays white: sits on imagery, not on
              theme surface, so it keeps literal white + near-black text */}
          <span
            className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[9px] font-semibold
                        uppercase tracking-[0.1em] ${
                          item.sourceType === "user_photo"
                            ? "bg-white/95 text-[#111010]"
                            : "bg-[#111010]/90 text-white"
                        }`}
          >
            {item.sourceType === "user_photo" ? "Mine" : "Brand"}
          </span>

          {/* Delete button — appears on hover (focus-visible too for keyboard nav).
              Stays white: sits on imagery, not on theme surface. */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Remove from wardrobe"
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/95 text-[#111010] flex items-center justify-center
                       opacity-0 group-hover:opacity-100 focus-visible:opacity-100
                       transition-opacity duration-200 ring-1 ring-black/10 hover:bg-white
                       disabled:opacity-50 disabled:cursor-wait"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
              <path d="M2.5 2.5l6 6M8.5 2.5l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Card body — size sits to the right of the name as a small badge.
            Surfaces the most important AI-try-on input at a glance. */}
        <div className="px-3 py-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[13px] font-medium text-ink truncate">
              {item.nickname || titleCase(item.category)}
            </p>
            {item.size && (
              <span className="shrink-0 rounded-full bg-ink/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink">
                {item.size}
              </span>
            )}
          </div>
          <p className="text-[11px] text-ink-subtle truncate">
            {item.brand || (item.sourceType === "user_photo" ? "Personal" : "Brand item")}
          </p>
        </div>
      </TiltCard>
    </motion.li>
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
          isError ? "text-accent" : "text-ink-subtle"
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
