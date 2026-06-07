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
  /**
   * Max wardrobe-driven AI try-on generations per month. Counts every
   * WardrobeOutfit row created in the current calendar month — each
   * outfit costs one AI call regardless of whether the user keeps it.
   *
   * Tiers (per the plan-restructure brief):
   *   Essential = 5 / month
   *   Fashion   = 50 / month
   *   Model     = 200 / month
   *
   * Enforced by /api/outfits/wardrobe/try-on (refuses with 402 when
   * over) AND surfaced in the usage panel so shoppers see "3 / 5 used".
   */
  maxTryOnsPerMonth: number;

  // ─── Cosmetic / soft-gated options (unchanged from previous shape) ─────────

  customOccasion: boolean;
  occasionPresets: string[];
  customColorPicker: boolean;
  crossBrand: boolean;
  mobileWardrobe: boolean;
  nextPlan: ClientPlan | null;

  // ─── AI Outfit Assistant — premium feature ─────────────────────────────────
  /**
   * Whether this plan can use the AI Outfit Assistant chatbot at /app/chat.
   * Essential = false (locked, shows upgrade card); Fashion + Model = true.
   * Enforced on both the UI (hide / lock the entry point) AND the server
   * (POST /api/wardrobe/chat refuses with 402 Payment Required).
   */
  hasOutfitAssistant: boolean;
  /**
   * Monthly ceiling on assistant outfit-recommendation requests.
   * Tiers (per the plan-restructure brief):
   *   Essential = 0   (no assistant — feature locked)
   *   Fashion   = 50  (wardrobe-only recommendations)
   *   Model     = Inf (uncapped; cross-brand recommendations)
   *
   * Counted by user-role messages in the current calendar month.
   * Replaces the earlier `maxAssistantMessagesPerDay` daily cap so users
   * can spread their budget across the month however suits them.
   */
  maxAssistantRecommendationsPerMonth: number;
  /**
   * Whether the AI Outfit Assistant can recommend items from the GLOBAL
   * brand catalog in addition to the user's saved wardrobe. The critical
   * Model-vs-Fashion product differentiator from the plan-restructure
   * brief.
   *
   *   Essential = false   (no assistant at all)
   *   Fashion   = false   (assistant works, but recommends ONLY from the
   *                        user's saved wardrobe — no cross-brand search)
   *   Model     = true    (assistant can search every active brand
   *                        product on the platform and surface
   *                        "Suggested from brands" chips alongside
   *                        the user's own pieces)
   *
   * Enforced server-side (the chat route refuses to include brand
   * products in the prompt context for non-Model plans) AND surfaced
   * in the UI (Model users see a different assistant intro + the
   * "From brands" chip variant).
   */
  crossBrandRecommendations: boolean;

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
        maxWardrobeItems: 10,
        maxPersonalPhotos: 3,
        outfitExperimentation: "basic",
        maxScansPerMonth: 5,
        maxTryOnsPerMonth: 5, // ↑ from 3 per plan-restructure brief
        customOccasion: false,
        occasionPresets: OCCASION_PRESETS_BASIC,
        customColorPicker: false,
        crossBrand: false,
        mobileWardrobe: false,
        nextPlan: "fashion",
        // Essential: assistant locked. The lock-card upgrade flow on
        // /app/chat handles the entry point.
        hasOutfitAssistant: false,
        maxAssistantRecommendationsPerMonth: 0,
        crossBrandRecommendations: false,
        maxWardrobeSaves: 10,
      };
    case "fashion":
      return {
        maxWardrobeItems: 40,
        maxPersonalPhotos: 15,
        outfitExperimentation: "full",
        maxScansPerMonth: 15,
        maxTryOnsPerMonth: 50, // ↑ from 25 per plan-restructure brief
        customOccasion: true,
        occasionPresets: OCCASION_PRESETS_EXTENDED,
        customColorPicker: false,
        crossBrand: false,
        mobileWardrobe: false,
        nextPlan: "model",
        // Fashion: assistant ON, but capped at 50 recommendations/month
        // AND restricted to the user's own wardrobe (no cross-brand).
        hasOutfitAssistant: true,
        maxAssistantRecommendationsPerMonth: 50,
        crossBrandRecommendations: false,
        maxWardrobeSaves: 40,
      };
    case "model":
      return {
        maxWardrobeItems: Infinity,
        maxPersonalPhotos: Infinity,
        outfitExperimentation: "full",
        maxScansPerMonth: Infinity,
        maxTryOnsPerMonth: 200, // capped per brief (was Infinity)
        customOccasion: true,
        occasionPresets: OCCASION_PRESETS_EXTENDED,
        customColorPicker: true,
        crossBrand: true,
        mobileWardrobe: true,
        nextPlan: null,
        // Model: uncapped assistant + cross-brand. The brief's headline
        // differentiator vs Fashion.
        hasOutfitAssistant: true,
        maxAssistantRecommendationsPerMonth: Infinity,
        crossBrandRecommendations: true,
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
