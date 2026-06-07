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

  // ─── AI Outfit Assistant — premium feature ─────────────────────────────────
  /**
   * Whether this plan can use the AI Outfit Assistant chatbot at /app/chat.
   * Essential = false (locked, shows upgrade card); Fashion + Model = true.
   * Enforced on both the UI (hide / lock the entry point) AND the server
   * (POST /api/wardrobe/chat refuses with 402 Payment Required).
   */
  hasOutfitAssistant: boolean;
  /**
   * Daily ceiling on assistant messages the user can send. Infinity =
   * uncapped. Caps the cost of a free-form chat surface and stops a single
   * shopper burning the Gemini quota. UI shows "X / Y today" on the chat
   * page when the cap is finite.
   */
  maxAssistantMessagesPerDay: number;

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
        maxTryOnsPerMonth: 3,
        customOccasion: false,
        occasionPresets: OCCASION_PRESETS_BASIC,
        customColorPicker: false,
        crossBrand: false,
        mobileWardrobe: false,
        nextPlan: "fashion",
        // AI Outfit Assistant locked on Essential — upgrade gate.
        hasOutfitAssistant: false,
        maxAssistantMessagesPerDay: 0,
        maxWardrobeSaves: 10,
      };
    case "fashion":
      return {
        maxWardrobeItems: 40,
        maxPersonalPhotos: 15,
        outfitExperimentation: "full",
        maxScansPerMonth: 15,
        maxTryOnsPerMonth: 25,
        customOccasion: true,
        occasionPresets: OCCASION_PRESETS_EXTENDED,
        customColorPicker: false,
        crossBrand: false,
        mobileWardrobe: false,
        nextPlan: "model",
        // Fashion (€25.99) is the entry tier for the chatbot.
        // 50 messages/day caps cost without feeling cramped at normal use.
        hasOutfitAssistant: true,
        maxAssistantMessagesPerDay: 50,
        maxWardrobeSaves: 40,
      };
    case "model":
      return {
        maxWardrobeItems: Infinity,
        maxPersonalPhotos: Infinity,
        outfitExperimentation: "full",
        maxScansPerMonth: Infinity,
        maxTryOnsPerMonth: Infinity,
        customOccasion: true,
        occasionPresets: OCCASION_PRESETS_EXTENDED,
        customColorPicker: true,
        crossBrand: true,
        mobileWardrobe: true,
        nextPlan: null,
        // Model gets the assistant uncapped.
        hasOutfitAssistant: true,
        maxAssistantMessagesPerDay: Infinity,
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
