/**
 * Professional (brand-side) plan semantics.
 *
 * Pro plans are NOT personal AI credits. They define a brand's MARKETPLACE
 * PRESENCE: catalog capacity, monthly shopper-scan exposure quota, visibility
 * eligibility, analytics depth.
 *
 * The DB enum (Brand.plan) stays as `free | pro | enterprise` for backwards
 * compatibility. The UI labels and business logic use the new names below.
 *
 *   DB enum   →   Display label
 *   ───────       ─────────────
 *   free          Listed     (€45/mo)
 *   pro           Featured   (€200/mo)
 *   enterprise    Premier    (Contact team)
 */

export type ProPlan = "free" | "pro" | "enterprise";
export type ProPlanDisplay = "Listed" | "Featured" | "Premier";
export type SupportLevel = "standard" | "priority" | "dedicated";

export type ProPlanLimits = {
  /** Enum value (matches Brand.plan in DB) */
  id: ProPlan;
  /** Human-readable display name shown everywhere in UI */
  displayName: ProPlanDisplay;
  /** Display price string (UI only — Stripe wires real billing later) */
  priceLabel: string;
  /** Short marketing description */
  tagline: string;
  /** Max collections a brand may keep active at once. */
  maxActiveCollections: number;
  /** Monthly customer-scan exposure quota. */
  monthlyExposureQuota: number;
  /** Eligible to appear in "Top Brands" / featured carousels. */
  featuredEligibility: boolean;
  /** Enables product performance, save-to-wardrobe insights, outfit metrics. */
  advancedAnalytics: boolean;
  /** Custom branding on the embedded fit widget. */
  customWidgetBranding: boolean;
  /** Outgoing webhooks for fit events. */
  webhooks: boolean;
  /** Support tier offered. */
  support: SupportLevel;
  /** Dedicated account manager / custom integrations. */
  dedicated: boolean;
};

const LISTED: ProPlanLimits = {
  id: "free",
  displayName: "Listed",
  priceLabel: "€45 / mo",
  tagline: "Be present on the platform with a basic listing.",
  maxActiveCollections: 2,
  monthlyExposureQuota: 1_000,
  featuredEligibility: false,
  advancedAnalytics: false,
  customWidgetBranding: false,
  webhooks: false,
  support: "standard",
  dedicated: false,
};

const FEATURED: ProPlanLimits = {
  id: "pro",
  displayName: "Featured",
  priceLabel: "€200 / mo",
  tagline: "Strong visibility and marketplace growth.",
  maxActiveCollections: Infinity,
  monthlyExposureQuota: 10_000,
  featuredEligibility: true,
  advancedAnalytics: true,
  customWidgetBranding: true,
  webhooks: true,
  support: "priority",
  dedicated: false,
};

const PREMIER: ProPlanLimits = {
  id: "enterprise",
  displayName: "Premier",
  priceLabel: "Contact team",
  tagline: "Custom exposure, dedicated growth support.",
  maxActiveCollections: Infinity,
  monthlyExposureQuota: Infinity,
  featuredEligibility: true,
  advancedAnalytics: true,
  customWidgetBranding: true,
  webhooks: true,
  support: "dedicated",
  dedicated: true,
};

/** Returns the limits config for a given pro plan. */
export function getProfessionalPlanLimits(plan: ProPlan): ProPlanLimits {
  switch (plan) {
    case "free":
      return LISTED;
    case "pro":
      return FEATURED;
    case "enterprise":
      return PREMIER;
  }
}

/** Just the display name (for short references). */
export function getProfessionalPlanDisplay(plan: ProPlan): ProPlanDisplay {
  return getProfessionalPlanLimits(plan).displayName;
}

/** All plans in marketing order, useful for pricing pages. */
export const ALL_PRO_PLANS: ProPlanLimits[] = [LISTED, FEATURED, PREMIER];

/** Marketing CTA copy keyed by plan id. */
export function getProPlanCta(plan: ProPlan): string {
  return plan === "enterprise" ? "Contact team" : `Choose ${getProfessionalPlanDisplay(plan)}`;
}

/** True if `plan` is a recognised pro plan. */
export function isValidProPlan(v: unknown): v is ProPlan {
  return v === "free" || v === "pro" || v === "enterprise";
}
