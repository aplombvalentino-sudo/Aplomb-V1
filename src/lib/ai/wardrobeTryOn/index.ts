import "server-only";

/**
 * Public entry point for the wardrobe-driven outfit try-on. Routes pick the
 * active provider via env (TRYON_PROVIDER) without knowing which one is
 * wired. Adding a new provider = drop a file in ./providers + extend the
 * switch below.
 */

import type { TryOnProvider } from "./types";
import { geminiTryOnProvider } from "./providers/gemini";
import { falTryOnProvider } from "./providers/fal";

export type { TryOnInput, TryOnItem, TryOnResult, TryOnProvider } from "./types";

/**
 * Returns the active try-on provider for this deploy. Defaults to Gemini —
 * the only one wired for real today. Set TRYON_PROVIDER=fal to switch once
 * the fal.ai stub in providers/fal.ts is implemented.
 */
export function getActiveTryOnProvider(): TryOnProvider {
  const requested = process.env.TRYON_PROVIDER?.toLowerCase();
  if (requested === "fal") return falTryOnProvider;
  return geminiTryOnProvider;
}
