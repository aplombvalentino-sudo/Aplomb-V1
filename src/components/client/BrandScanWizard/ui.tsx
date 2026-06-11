"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * Presentational primitives used by the wizard. Each one is pure UI driven
 * by props — no fetches, no app state, no localStorage. The wizard composes
 * these into screens; the screens compose them into the multi-step flow.
 */

// ─── StepDots ────────────────────────────────────────────────────────────────

/** Sticky-header progress indicator: filled pill for current, dot for visited/upcoming. */
export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? "h-1.5 w-5 bg-ink"
              : i < current
                ? "h-1.5 w-1.5 bg-ink/30"
                : "h-1.5 w-1.5 bg-ink/10"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Dot (bullet) + Arrow (CTA chevron) ──────────────────────────────────────

export function Dot() {
  return (
    <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-champagne" />
  );
}

export function Arrow() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent aplomb-glow">
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
        <path
          d="M2.5 8.5L8.5 2.5M8.5 2.5H3.5M8.5 2.5V7.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

// ─── ModeCard (Easy vs Advanced tile in step 1) ──────────────────────────────

export function ModeCard({
  active,
  onClick,
  title,
  body,
  tags,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
  tags: string[];
}) {
  return (
    <button
      onClick={onClick}
      className={`group text-left rounded-2xl border p-5 transition-all duration-200 ${
        active
          ? "border-ink bg-surface shadow-card"
          : "border-hairline bg-surface hover:border-ink/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-[1.4rem] font-semibold tracking-[-0.02em] text-ink leading-tight">
          {title}
        </h3>
        <span
          aria-hidden
          className={`h-4 w-4 rounded-full border-2 transition-colors duration-200 ${
            active ? "border-ink bg-ink" : "border-ink/20 bg-surface"
          }`}
        />
      </div>
      <p className="mt-1.5 text-[13px] text-ink-muted leading-[1.55]">{body}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center rounded-full bg-canvas px-2.5 py-0.5
                       text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted"
          >
            {t}
          </span>
        ))}
      </div>
    </button>
  );
}

// ─── NumField (numeric input with label + optional help) ─────────────────────

export function NumField({
  label,
  value,
  onChange,
  min,
  max,
  help,
}: {
  label: string;
  value: number | "";
  onChange: (v: number) => void;
  min: number;
  max: number;
  help?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-ink-muted mb-1.5">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-sm
                   text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
      />
      {help && <p className="mt-1 text-[11px] text-ink-subtle leading-[1.4]">{help}</p>}
    </div>
  );
}

// ─── PhotoField (camera/file picker with object-URL preview + cleanup) ───────

export function PhotoField({
  label,
  file,
  onChange,
  guidance,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
  guidance: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Object URLs leak memory if not revoked. The cleanup runs on file change
  // and on unmount, never holding more than one URL alive at a time.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div>
      <label className="block text-[11px] font-medium text-ink-muted mb-1.5">{label}</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`relative w-full overflow-hidden rounded-xl border bg-surface transition-all duration-200 ${
          file ? "border-ink" : "border-dashed border-ink/20 hover:border-ink/40"
        }`}
        style={{ aspectRatio: "3 / 4" }}
      >
        {previewUrl ? (
          // blob: URL from URL.createObjectURL — Next can't optimise these, so
          // unoptimized + fill against the relative parent (button has aspectRatio).
          <Image
            src={previewUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, 320px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden className="text-ink-subtle">
              <rect x="3" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="11" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 6l1.5-2h5L15 6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <p className="mt-2 text-[12px] font-medium text-ink">Add photo</p>
            <p className="mt-0.5 text-[10px] text-ink-subtle leading-[1.4] max-w-[20ch]">{guidance}</p>
          </div>
        )}
      </button>
      {file && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="mt-1.5 text-[11px] text-ink-subtle hover:text-ink transition-colors"
        >
          Replace
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
