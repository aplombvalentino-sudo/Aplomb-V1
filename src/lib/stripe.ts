import "server-only";
import Stripe from "stripe";

/**
 * Stripe — server-side client + the plan catalog (single source of truth for
 * which plan maps to which Stripe price and which DB plan field it drives).
 *
 * The secret key is read from STRIPE_SECRET_KEY and must NEVER reach the client.
 * Instantiation is lazy so a missing key doesn't crash builds / dev — the
 * routes call getStripe() at request time and surface a clear error.
 */

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  _stripe = new Stripe(key);
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

// ─── Plan catalog ─────────────────────────────────────────────────────────────

export type PlanSide = "brand" | "client";
export type CheckoutPlanSlug = "listed" | "featured" | "fashion" | "model";

export type PlanDef = {
  slug: CheckoutPlanSlug;
  side: PlanSide;
  /** env var that holds the Stripe Price ID for this plan */
  priceEnv: string;
  /** product name used by the seed script */
  productName: string;
  /** recurring amount in minor units (cents) */
  unitAmount: number;
  currency: string;
  /** Brand.plan enum value to set (brand side only) */
  brandPlan?: "free" | "pro";
  /** User.clientPlan value to set (client side only) */
  clientPlan?: "fashion" | "model";
};

// NB: the Brand.plan enum quirk is intentional — Listed maps to `free`,
// Featured to `pro` (see lib/plans/proPlans.ts). Never rename the enum.
export const PLAN_CATALOG: Record<CheckoutPlanSlug, PlanDef> = {
  listed: {
    slug: "listed",
    side: "brand",
    priceEnv: "STRIPE_PRICE_LISTED",
    productName: "Aplomb — Listed (Brand)",
    unitAmount: 4500,
    currency: "eur",
    brandPlan: "free",
  },
  featured: {
    slug: "featured",
    side: "brand",
    priceEnv: "STRIPE_PRICE_FEATURED",
    productName: "Aplomb — Featured (Brand)",
    unitAmount: 20000,
    currency: "eur",
    brandPlan: "pro",
  },
  fashion: {
    slug: "fashion",
    side: "client",
    priceEnv: "STRIPE_PRICE_FASHION",
    productName: "Aplomb — Fashion (Shopper)",
    unitAmount: 2599,
    currency: "eur",
    clientPlan: "fashion",
  },
  model: {
    slug: "model",
    side: "client",
    priceEnv: "STRIPE_PRICE_MODEL",
    productName: "Aplomb — Model (Shopper)",
    unitAmount: 2999,
    currency: "eur",
    clientPlan: "model",
  },
};

export const CHECKOUT_PLAN_SLUGS = Object.keys(PLAN_CATALOG) as CheckoutPlanSlug[];

export function isCheckoutPlanSlug(v: unknown): v is CheckoutPlanSlug {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(PLAN_CATALOG, v);
}

/** Stripe Price ID configured for a plan (from env), or null if unset. */
export function priceIdForPlan(slug: CheckoutPlanSlug): string | null {
  return process.env[PLAN_CATALOG[slug].priceEnv]?.trim() || null;
}

/**
 * Reverse lookup for the webhook: map a Stripe price id back to a plan. The
 * webhook prefers subscription metadata (`plan`), falling back to this.
 */
export function planForPriceId(priceId: string): PlanDef | null {
  for (const def of Object.values(PLAN_CATALOG)) {
    if (process.env[def.priceEnv]?.trim() === priceId) return def;
  }
  return null;
}
