"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Theme preference control — cycles light → dark → system.
 *
 * Not the cliché sun/moon switch: a quiet text-glyph button that shows the
 * CURRENT preference and advances on click. Reads/writes the same
 * localStorage key the no-flash bootstrap uses (ThemeScript.tsx), stamps
 * data-theme on <html>, and — while preference is "system" — listens to
 * prefers-color-scheme changes so the OS toggle flips the app live.
 *
 * Adds `.theme-switching` to <html> for the flip so the CSS cross-fade in
 * globals.css applies only during the transition window.
 */

const STORAGE_KEY = "aplomb-theme";

type Pref = "light" | "dark" | "system";

function resolve(pref: Pref): "light" | "dark" {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return pref;
}

function apply(pref: Pref) {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.setAttribute("data-theme", resolve(pref));
  window.setTimeout(() => root.classList.remove("theme-switching"), 320);
}

const NEXT: Record<Pref, Pref> = { light: "dark", dark: "system", system: "light" };

const LABEL: Record<Pref, string> = {
  light: "Light",
  dark: "Dark",
  system: "Auto",
};

export function ThemeToggle({ className }: { className?: string }) {
  // null until mounted — avoids hydration mismatch since the server can't
  // know the stored preference.
  const [pref, setPref] = useState<Pref | null>(null);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {}
    setPref(stored === "light" || stored === "dark" ? stored : "system");
  }, []);

  // While on "system", track OS preference changes live.
  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  // Side effects live OUTSIDE the state updater: React StrictMode double-
  // invokes updater functions in dev, and an effectful updater made the
  // theme double-step (light → skips dark → system). Compute next from the
  // rendered state instead.
  const cycle = useCallback(() => {
    const next = NEXT[pref ?? "system"];
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    apply(next);
    setPref(next);
  }, [pref]);

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={
        pref ? `Theme: ${LABEL[pref]}. Click to change.` : "Change theme"
      }
      title={pref ? `Theme: ${LABEL[pref]}` : undefined}
      className={`inline-flex h-7 items-center gap-1.5 rounded-full border border-hairline
                  px-2.5 text-[11px] font-medium text-ink-subtle
                  hover:text-ink hover:border-hairline-strong
                  transition-colors duration-200 ${className ?? ""}`}
    >
      {/* Aperture glyph — half-filled disc reads as "light/dark" without the
          sun/moon cliché. Rotates with the mode for a quiet state cue. */}
      <svg
        width="11"
        height="11"
        viewBox="0 0 12 12"
        aria-hidden
        className={`transition-transform duration-300 ${
          pref === "dark" ? "rotate-180" : pref === "system" ? "rotate-90" : ""
        }`}
      >
        <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M6 1a5 5 0 0 1 0 10z" fill="currentColor" />
      </svg>
      {/* Reserve label width pre-mount so the header doesn't shift. */}
      <span className="min-w-[2.4em] text-left">{pref ? LABEL[pref] : "…"}</span>
    </button>
  );
}
