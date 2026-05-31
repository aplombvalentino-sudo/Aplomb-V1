/**
 * Thin wrappers over localStorage for the two keys the wizard owns:
 *   - aplomb_wardrobe   → JSON array of WardrobeOutfit (saved looks)
 *   - SCAN_COUNT_KEY    → the per-month scan counter (plan quota)
 *
 * All reads/writes are wrapped in try/catch and silently fall back to safe
 * defaults — Safari in private mode + iframe sandboxes can throw on either
 * read or write, and the wizard must never crash because of it.
 *
 * The wizard owns business decisions (quota check, dedup, UI prompts);
 * this module just stores and retrieves.
 */

import type { WardrobeOutfit } from "@/components/client/WardrobeClient";
import { SCAN_COUNT_KEY } from "@/lib/planLimits";

const WARDROBE_KEY = "aplomb_wardrobe";

// ─── Wardrobe ────────────────────────────────────────────────────────────────

export function loadWardrobe(): WardrobeOutfit[] {
  try {
    const raw = localStorage.getItem(WARDROBE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WardrobeOutfit[]) : [];
  } catch {
    return [];
  }
}

export function saveWardrobe(entries: WardrobeOutfit[]): void {
  try {
    localStorage.setItem(WARDROBE_KEY, JSON.stringify(entries));
  } catch {}
}

// ─── Scan counter ────────────────────────────────────────────────────────────

export function getScanCount(): number {
  try {
    const stored = localStorage.getItem(SCAN_COUNT_KEY);
    if (!stored) return 0;
    const n = parseInt(stored, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function setScanCount(n: number): void {
  try {
    localStorage.setItem(SCAN_COUNT_KEY, String(n));
  } catch {}
}
