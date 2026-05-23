/**
 * Plan limits — single source of truth for both UI enforcement and API guards.
 * No Stripe yet: plans are set via cookie (client) or Brand.plan DB field (pro).
 */

// ─── Client plans ─────────────────────────────────────────────────────────────

export type ClientPlan = "essential" | "fashion" | "model";

export type ClientPlanLimits = {
  /** Max body scans per calendar month. Infinity = unlimited. */
  maxScansPerMonth: number;
  /** Max outfits/items saved to digital wardrobe. */
  maxWardrobeSaves: number;
  /** Whether free-text custom occasion is allowed. */
  customOccasion: boolean;
  /** Preset occasions shown in scan form. */
  occasionPresets: string[];
  /** Whether full color-picker is shown. */
  customColorPicker: boolean;
  /** Whether cross-brand outfit creation is available. */
  crossBrand: boolean;
  /** Mobile wardrobe access. */
  mobileWardrobe: boolean;
  /** Human-readable label for upgrade prompts. */
  nextPlan: ClientPlan | null;
};

const OCCASION_PRESETS_BASIC = ["Casual", "Formal", "Sport"];
const OCCASION_PRESETS_EXTENDED = [
  "Casual", "Formal", "Sport", "Business", "Evening", "Weekend",
];

export function getClientPlanLimits(plan: ClientPlan): ClientPlanLimits {
  switch (plan) {
    case "essential":
      return {
        maxScansPerMonth: 5,
        maxWardrobeSaves: 4,
        customOccasion: false,
        occasionPresets: OCCASION_PRESETS_BASIC,
        customColorPicker: false,
        crossBrand: false,
        mobileWardrobe: false,
        nextPlan: "fashion",
      };
    case "fashion":
      return {
        maxScansPerMonth: 15,
        maxWardrobeSaves: 10,
        customOccasion: true,
        occasionPresets: OCCASION_PRESETS_EXTENDED,
        customColorPicker: false,
        crossBrand: false,
        mobileWardrobe: false,
        nextPlan: "model",
      };
    case "model":
      return {
        maxScansPerMonth: Infinity,
        maxWardrobeSaves: Infinity,
        customOccasion: true,
        occasionPresets: OCCASION_PRESETS_EXTENDED,
        customColorPicker: true,
        crossBrand: true,
        mobileWardrobe: true,
        nextPlan: null,
      };
  }
}

// ─── Pro / Brand plans ────────────────────────────────────────────────────────

export type ProPlan = "free" | "pro" | "enterprise";

export type ProPlanLimits = {
  /** Max simultaneously active collections (products). Infinity = unlimited. */
  maxActiveCollections: number;
  /** Max scans per month across all clients. Infinity = unlimited. */
  maxScansPerMonth: number;
  /** Custom widget branding allowed. */
  customWidgetBranding: boolean;
  /** Outgoing webhooks available. */
  webhooks: boolean;
  /** Analytics dashboard access. */
  analytics: boolean;
  /** Priority support. */
  prioritySupport: boolean;
  /** Dedicated account manager & custom integrations. */
  dedicated: boolean;
  /** Display label shown to users. */
  displayName: string;
};

export function getProPlanLimits(plan: ProPlan): ProPlanLimits {
  switch (plan) {
    case "free": // Starter
      return {
        maxActiveCollections: 2,
        maxScansPerMonth: 50,
        customWidgetBranding: false,
        webhooks: false,
        analytics: false,
        prioritySupport: false,
        dedicated: false,
        displayName: "Starter",
      };
    case "pro": // Pro
      return {
        maxActiveCollections: Infinity,
        maxScansPerMonth: Infinity,
        customWidgetBranding: true,
        webhooks: true,
        analytics: true,
        prioritySupport: true,
        dedicated: false,
        displayName: "Pro",
      };
    case "enterprise": // Enterprise
      return {
        maxActiveCollections: Infinity,
        maxScansPerMonth: Infinity,
        customWidgetBranding: true,
        webhooks: true,
        analytics: true,
        prioritySupport: true,
        dedicated: true,
        displayName: "Enterprise",
      };
  }
}

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

/** localStorage key for this month's scan count. */
export const SCAN_COUNT_KEY = `aplomb_scans_${currentMonthKey()}`;

/** Cookie name for the client plan. */
export const CLIENT_PLAN_COOKIE = "aplomb_client_plan";
