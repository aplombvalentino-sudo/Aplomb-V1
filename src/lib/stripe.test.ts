import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isCheckoutPlanSlug,
  priceIdForPlan,
  planForPriceId,
  PLAN_CATALOG,
  CHECKOUT_PLAN_SLUGS,
} from "./stripe";

describe("PLAN_CATALOG shape", () => {
  it("contains exactly the 4 Stripe-billable slugs", () => {
    // .sort() is lexicographic — "fashion" sorts before "featured".
    expect(CHECKOUT_PLAN_SLUGS.sort()).toEqual([
      "fashion",
      "featured",
      "listed",
      "model",
    ]);
  });

  it("brand slugs map to the right Brand.plan enum value", () => {
    expect(PLAN_CATALOG.listed.side).toBe("brand");
    expect(PLAN_CATALOG.listed.brandPlan).toBe("free");
    expect(PLAN_CATALOG.featured.side).toBe("brand");
    expect(PLAN_CATALOG.featured.brandPlan).toBe("pro");
  });

  it("shopper slugs map to the right User.clientPlan value", () => {
    expect(PLAN_CATALOG.fashion.side).toBe("client");
    expect(PLAN_CATALOG.fashion.clientPlan).toBe("fashion");
    expect(PLAN_CATALOG.model.side).toBe("client");
    expect(PLAN_CATALOG.model.clientPlan).toBe("model");
  });

  it("monthly amounts match the displayed prices (EUR, in cents)", () => {
    expect(PLAN_CATALOG.listed.unitAmount).toBe(4500);
    expect(PLAN_CATALOG.featured.unitAmount).toBe(20000);
    expect(PLAN_CATALOG.fashion.unitAmount).toBe(2599);
    expect(PLAN_CATALOG.model.unitAmount).toBe(2999);
  });
});

describe("isCheckoutPlanSlug", () => {
  it("accepts the 4 slugs and rejects everything else (incl. free tiers)", () => {
    expect(isCheckoutPlanSlug("listed")).toBe(true);
    expect(isCheckoutPlanSlug("model")).toBe(true);
    expect(isCheckoutPlanSlug("essential")).toBe(false); // free, no Stripe price
    expect(isCheckoutPlanSlug("premier")).toBe(false); // sales-led
    expect(isCheckoutPlanSlug("")).toBe(false);
    expect(isCheckoutPlanSlug(undefined)).toBe(false);
  });
});

describe("priceIdForPlan + planForPriceId (env-driven)", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_PRICE_LISTED", "price_listed_test");
    vi.stubEnv("STRIPE_PRICE_FEATURED", "price_featured_test");
    vi.stubEnv("STRIPE_PRICE_FASHION", "price_fashion_test");
    vi.stubEnv("STRIPE_PRICE_MODEL", "price_model_test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads the configured Stripe price ID from the env var named in the catalog", () => {
    expect(priceIdForPlan("listed")).toBe("price_listed_test");
    expect(priceIdForPlan("model")).toBe("price_model_test");
  });

  it("planForPriceId is the inverse of priceIdForPlan", () => {
    expect(planForPriceId("price_featured_test")?.slug).toBe("featured");
    expect(planForPriceId("price_fashion_test")?.slug).toBe("fashion");
  });

  it("planForPriceId returns null for an unknown price id", () => {
    expect(planForPriceId("price_does_not_exist")).toBeNull();
  });
});

describe("priceIdForPlan when env is missing", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_PRICE_LISTED", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when the price env var is empty", () => {
    expect(priceIdForPlan("listed")).toBeNull();
  });
});
