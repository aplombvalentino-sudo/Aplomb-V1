"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/** Public site key — safe to expose (NEXT_PUBLIC_*). */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
/** True when a site key is configured; when false we render nothing and the
 *  server skips verification, so the app still works without keys. */
export const TURNSTILE_ENABLED = TURNSTILE_SITE_KEY.length > 0;

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

type RenderOptions = {
  sitekey: string;
  theme?: "light" | "dark" | "auto";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
};
type TurnstileApi = {
  render: (el: HTMLElement, opts: RenderOptions) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("turnstile-script-failed")));
      if (window.turnstile) resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile-script-failed"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export type TurnstileHandle = { reset: () => void };

type Props = {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
};

/**
 * Renders a single Cloudflare Turnstile widget via the official script and the
 * explicit-render API. Client-only; renders nothing when no site key is set.
 */
export const TurnstileWidget = forwardRef<TurnstileHandle, Props>(function TurnstileWidget(
  { onVerify, onExpire, onError, className },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Keep latest callbacks without re-rendering the widget.
  const cbRef = useRef({ onVerify, onExpire, onError });
  cbRef.current = { onVerify, onExpire, onError };

  useImperativeHandle(ref, () => ({
    reset() {
      if (window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          /* widget already gone */
        }
      }
    },
  }));

  useEffect(() => {
    if (!TURNSTILE_ENABLED) return;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current) return; // guard double-render (React StrictMode)
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "light",
          callback: (token) => cbRef.current.onVerify(token),
          "expired-callback": () => cbRef.current.onExpire?.(),
          "error-callback": () => cbRef.current.onError?.(),
        });
      })
      .catch(() => cbRef.current.onError?.());

    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* noop */
        }
        widgetIdRef.current = null;
      }
    };
  }, []);

  if (!TURNSTILE_ENABLED) return null;
  return <div ref={containerRef} className={className} />;
});
