/**
 * Plan limits — single source of truth for both UI enforcement and API guards.
 *
 * Aplomb is now WARDROBE-FIRST. The primary plan dimension is the size of the
 * user's digital wardrobe (total items) and how many of those items they can
 * upload from their own photos. Sizing-related limits (scans, try-ons) remain
 * because the fitting room is still part of the product — but they are now
 * SECONDARY: presented after wardrobe value, never used to gate product entry.
 */

// ─── Client plans ─────────────────────────────────────────────────────────────

export type ClientPlan = "essential" | "fashion" | "model";

export type ClientPlanLimits = {
  // ─── PRIMARY — wardrobe-first dimensions ──────────────────────────────────

  /**
   * Total wardrobe slots (certified items + user_photo items combined).
   * Infinity = unlimited. The wardrobe is the product centre; this is the
   * number shoppers care about most.
   */
  maxWardrobeItems: number;

  /**
   * Subset cap on user_photo items (clothes uploaded from the user's own
   * camera roll). Higher plans raise this faster than maxWardrobeItems
   * because personal items are more storage/processing-heavy than certified
   * items (we own the catalog asset for certified ones).
   */
  maxPersonalPhotos: number;

  /**
   * Outfit-experimentation level — affects how many outfits the user can
   * build per month + whether cross-brand mixing is enabled.
   *   - basic: limited outfit slots, single-brand only
   *   - full:  unlimited outfits, mix anything in the wardrobe
   */
  outfitExperimentation: "basic" | "full";

  // ─── SECONDARY — sizing / fit support (kept, no longer leads) ─────────────

  /** Max body scans per calendar month. Infinity = unlimited. */
  maxScansPerMonth: number;
  /** Max try-on image generations per month. */
  maxTryOnsPerMonth: number;

  // ─── Cosmetic / soft-gated options (unchanged from previous shape) ─────────

  customOccasion: boolean;
  occasionPresets: string[];
  customColorPicker: boolean;
  crossBrand: boolean;
  mobileWardrobe: boolean;
  nextPlan: ClientPlan | null;

  /**
   * @deprecated Replaced by `maxWardrobeItems`. Still populated so legacy
   * code paths (the old wardrobeStorage save-outfit counter) keep building
   * during the wardrobe-first rollout. New code MUST read `maxWardrobeItems`.
   */
  maxWardrobeSaves: number;
};

const OCCASION_PRESETS_BASIC = ["Casual", "Formal", "Sport"];
const OCCASION_PRESETS_EXTENDED = [
  "Casual", "Formal", "Sport", "Business", "Evening", "Weekend",
];

export function getClientPlanLimits(plan: ClientPlan): ClientPlanLimits {
  switch (plan) {
    case "essential":
      return {
        // Wardrobe-first
        maxWardrobeItems: 10,        // 10 total slots (per product spec)
        maxPersonalPhotos: 3,        // including up to 3 personal photo items
        outfitExperimentation: "basic",
        // Sizing-secondary
        maxScansPerMonth: 5,
        maxTryOnsPerMonth: 3,
        // Cosmetic
        customOccasion: false,
        occasionPresets: OCCASION_PRESETS_BASIC,
        customColorPicker: false,
        crossBrand: false,
        mobileWardrobe: false,
        nextPlan: "fashion",
        // Deprecated mirror
        maxWardrobeSaves: 10,
      };
    case "fashion":
      return {
        // Wardrobe-first
        maxWardrobeItems: 40,
        maxPersonalPhotos: 15,
        outfitExperimentation: "full",
        // Sizing-secondary
        maxScansPerMonth: 15,
        maxTryOnsPerMonth: 25,
        // Cosmetic
        customOccasion: true,
        occasionPresets: OCCASION_PRESETS_EXTENDED,
        customColorPicker: false,
        crossBrand: false,
        mobileWardrobe: false,
        nextPlan: "model",
        // Deprecated mirror
        maxWardrobeSaves: 40,
      };
    case "model":
      return {
        // Wardrobe-first
        maxWardrobeItems: Infinity,
        maxPersonalPhotos: Infinity,
        outfitExperimentation: "full",
        // Sizing-secondary
        maxScansPerMonth: Infinity,
        maxTryOnsPerMonth: Infinity,
        // Cosmetic
        customOccasion: true,
        occasionPresets: OCCASION_PRESETS_EXTENDED,
        customColorPicker: true,
        crossBrand: true,
        mobileWardrobe: true,
        nextPlan: null,
        // Deprecated mirror
        maxWardrobeSaves: Infinity,
      };
  }
}

// ─── Pro / Brand plans — re-exported from lib/plans/proPlans ──────────────────
//
// Pro plans semantics have moved to `@/lib/plans/proPlans` (Listed / Featured /
// Premier). The shim below keeps the old call sites working while we migrate.

export {
  getProfessionalPlanLimits as getProPlanLimits,
  getProfessionalPlanDisplay,
  isValidProPlan,
  ALL_PRO_PLANS,
  type ProPlan,
  type ProPlanLimits,
  type ProPlanDisplay,
} from "@/lib/plans/proPlans";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the plan value is a valid ClientPlan. */
export function isValidClientPlan(v: unknown): v is ClientPlan {
  return v === "essential" || v === "fashion" || v === "model";
}

/** Month key used as localStorage key suffix, e.g. "2026-05". */
export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** localStorage key for this month's scan count (sizing — secondary now). */
export const SCAN_COUNT_KEY = `aplomb_scans_${currentMonthKey()}`;

/** Cookie name for the client plan. */
export const CLIENT_PLAN_COOKIE = "aplomb_client_plan";
