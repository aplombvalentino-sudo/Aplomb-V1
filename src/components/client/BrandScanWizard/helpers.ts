import type { SizeRec } from "./types";

/**
 * Pure rendering helpers — no React, no DOM, no state. Tested in helpers.test.ts.
 */

/**
 * Honest, conservative color palette for size-confidence dots.
 * Green for high, champagne for medium, terracotta for low — never red
 * (we never want to scare a user about an approximate estimate).
 */
export function confidenceDot(c: SizeRec["confidence"]): string {
  if (c === "high") return "#346538";
  if (c === "medium") return "#C9A882";
  return "#C97A6A";
}

export function confidenceLabel(c: SizeRec["confidence"]): string {
  return c === "high"
    ? "High confidence"
    : c === "medium"
      ? "Medium confidence"
      : "Approximate";
}
