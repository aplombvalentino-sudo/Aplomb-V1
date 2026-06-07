"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";

const ease = [0.16, 1, 0.3, 1] as const;

type Status = "none" | "pending" | "generating" | "ready" | "failed";

type ResultOutfit = {
  id: string;
  title: string;
  occasion: string | null;
  createdAt: string;
  generationStatus: Status;
  generationError: string | null;
  generationProvider: string | null;
  generatedImageUrl: string | null;
  selfieImageUrl: string | null;
  items: Array<{
    id: string;
    position: string;
    wardrobeItemId: string;
    category: string;
    nickname: string | null;
    brand: string | null;
    sourceType: "certified" | "user_photo";
    thumbUrl: string | null;
  }>;
};

/**
 * Renders the outfit detail page. Branches on `generationStatus`:
 *   - ready:    hero image, items, "Try again" / delete
 *   - generating/pending: live spinner + auto-refresh
 *   - failed:   error card + Try-again form
 *   - none:     legacy outfit — "Try this on me" CTA
 */
export function OutfitResultView({ outfit }: { outfit: ResultOutfit }) {
  return (
    <div className="space-y-10">
      <Header outfit={outfit} />

      {outfit.generationStatus === "ready" && outfit.generatedImageUrl && (
        <ReadyHero imageUrl={outfit.generatedImageUrl} title={outfit.title} />
      )}

      {(outfit.generationStatus === "generating" ||
        outfit.generationStatus === "pending") && <GeneratingPanel />}

      {outfit.generationStatus === "failed" && (
        <FailedPanel reason={outfit.generationError} outfitId={outfit.id} />
      )}

      {outfit.generationStatus === "none" && <NoTryOnPanel outfitId={outfit.id} />}

      <ItemsStrip outfit={outfit} />

      <Actions outfit={outfit} />
    </div>
  );
}

// ─── Header ────────────────────────────────────────────────────────────────

function Header({ outfit }: { outfit: ResultOutfit }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
        Your outfit
      </p>
      <h1 className="mt-2 font-serif text-[clamp(2rem,4vw,2.6rem)] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
        {outfit.title}
        <span className="text-accent">.</span>
      </h1>
      {outfit.occasion && (
        <p className="mt-2 text-[14px] text-ink-muted">{outfit.occasion}</p>
      )}
    </div>
  );
}

// ─── Generated hero ────────────────────────────────────────────────────────

function ReadyHero({ imageUrl, title }: { imageUrl: string; title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="relative w-full overflow-hidden rounded-2xl bg-[#F6F3EE] ring-1 ring-black/[0.08]"
      style={{ aspectRatio: "3 / 4" }}
    >
      <Image
        src={imageUrl}
        alt={`You wearing ${title}`}
        fill
        sizes="(max-width: 768px) 100vw, 768px"
        className="object-cover"
        priority
      />
    </motion.div>
  );
}

// ─── Generating ────────────────────────────────────────────────────────────

function GeneratingPanel() {
  // Server polling: refresh the page every 3 seconds while we're waiting on
  // the AI. The server renders the latest status, so once the row flips to
  // ready/failed the UI updates without manual intervention.
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div className="rounded-2xl border border-hairline bg-surface px-6 py-12 text-center">
      <div className="mx-auto h-1.5 w-40 overflow-hidden rounded-full bg-ink/[0.06]">
        <motion.span
          className="block h-full w-1/3 rounded-full bg-accent"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <p className="mt-4 font-serif text-[1.4rem] font-medium text-ink">
        Putting the outfit on you…
      </p>
      <p className="mt-2 text-[13px] text-ink-muted max-w-[42ch] mx-auto">
        The AI is rendering your try-on. This page refreshes automatically
        once the image is ready.
      </p>
    </div>
  );
}

// ─── Failed ────────────────────────────────────────────────────────────────

function FailedPanel({
  reason,
  outfitId,
}: {
  reason: string | null;
  outfitId: string;
}) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/40 px-6 py-8 text-center">
      <p className="font-serif text-[1.4rem] font-medium text-ink">
        The try-on didn&apos;t work this time.
      </p>
      <p className="mt-2 text-[13px] text-ink-muted max-w-[44ch] mx-auto">
        {reason ?? "The AI couldn't produce an image. Try a clearer selfie or different items."}
      </p>
      <div className="mt-5">
        <RegenerateForm outfitId={outfitId} label="Try a new selfie" />
      </div>
    </div>
  );
}

// ─── Legacy outfit (no try-on yet) ─────────────────────────────────────────

function NoTryOnPanel({ outfitId }: { outfitId: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface px-6 py-10 text-center">
      <p className="font-serif text-[1.4rem] font-medium text-ink">
        Add a selfie to see this on you.
      </p>
      <p className="mt-2 text-[13px] text-ink-muted max-w-[44ch] mx-auto">
        We saved the pieces — upload a picture of yourself and the AI will
        generate a try-on image based on this outfit.
      </p>
      <div className="mt-5">
        <RegenerateForm outfitId={outfitId} label="Try this on me" />
      </div>
    </div>
  );
}

// ─── Selfie upload + regenerate form (shared) ──────────────────────────────

function RegenerateForm({
  outfitId,
  label,
}: {
  outfitId: string;
  label: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("selfie", file);
      const res = await fetch(`/api/outfits/wardrobe/${outfitId}/regenerate`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.error?.message ?? "Try-on failed. Please try again.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="user"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={submitting}
        className="rounded-full border border-hairline-strong bg-white px-5 py-2.5 text-sm
                   font-medium text-ink hover:bg-surface-raised transition-colors duration-200
                   disabled:opacity-50"
      >
        {file ? `Selected: ${file.name}` : "Choose a selfie"}
      </button>
      {file && (
        <Button onClick={handleSubmit} loading={submitting} disabled={submitting}>
          {label}
        </Button>
      )}
      {error && <p className="text-[12px] text-red-700">{error}</p>}
    </div>
  );
}

// ─── Items strip ───────────────────────────────────────────────────────────

function ItemsStrip({ outfit }: { outfit: ResultOutfit }) {
  if (outfit.items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-subtle mb-4">
        Pieces in this outfit
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {outfit.items.map((it) => (
          <div key={it.id} className="space-y-1.5">
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#F6F3EE] ring-1 ring-black/[0.06]">
              {it.thumbUrl ? (
                <Image
                  src={it.thumbUrl}
                  alt={it.nickname || it.category}
                  fill
                  sizes="(max-width: 640px) 50vw, 200px"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-[0.1em] text-ink-subtle">
                  {it.category}
                </div>
              )}
              <span
                className={`absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-semibold
                            uppercase tracking-[0.08em] ${
                              it.sourceType === "user_photo"
                                ? "bg-white/95 text-ink"
                                : "bg-ink/90 text-white"
                            }`}
              >
                {it.sourceType === "user_photo" ? "Mine" : "Brand"}
              </span>
            </div>
            <p className="text-[12px] font-medium text-ink truncate">
              {it.nickname || titleCase(it.category)}
            </p>
            <p className="text-[10px] text-ink-subtle truncate">
              {it.brand || (it.sourceType === "user_photo" ? "Personal" : "Brand")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Footer actions ────────────────────────────────────────────────────────

function Actions({ outfit }: { outfit: ResultOutfit }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${outfit.title}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/outfits/wardrobe/${outfit.id}`, { method: "DELETE" });
      if (res.ok) {
        startTransition(() => {
          router.push("/app/outfits");
          router.refresh();
        });
        return;
      }
    } catch {}
    setDeleting(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      {outfit.generationStatus === "ready" && (
        <RegenerateInline outfitId={outfit.id} />
      )}
      <Link
        href="/app/outfits"
        className="text-[12px] text-ink-subtle hover:text-ink underline underline-offset-2"
      >
        Back to outfits
      </Link>
      <span aria-hidden className="ml-auto" />
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="text-[12px] text-ink-subtle hover:text-red-700 underline underline-offset-2 disabled:opacity-50"
      >
        {deleting ? "Deleting…" : "Delete this outfit"}
      </button>
    </div>
  );
}

/** Inline "try a different selfie" button for the ready state. */
function RegenerateInline({ outfitId }: { outfitId: string }) {
  const [open, setOpen] = useState(false);
  if (open) return <RegenerateForm outfitId={outfitId} label="Re-generate" />;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="rounded-full border border-hairline-strong bg-white px-4 py-2 text-[12px]
                 font-medium text-ink hover:bg-surface-raised transition-colors"
    >
      Try a different selfie
    </button>
  );
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
