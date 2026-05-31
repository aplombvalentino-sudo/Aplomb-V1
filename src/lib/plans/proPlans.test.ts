import { describe, it, expect } from "vitest";
import {
  isValidProPlan,
  getProfessionalPlanLimits,
  getProfessionalPlanDisplay,
  getProPlanCta,
  ALL_PRO_PLANS,
} from "./proPlans";

describe("isValidProPlan", () => {
  it("accepts the three enum values and rejects everything else", () => {
    expect(isValidProPlan("free")).toBe(true);
    expect(isValidProPlan("pro")).toBe(true);
    expect(isValidProPlan("enterprise")).toBe(true);
    expect(isValidProPlan("listed")).toBe(false); // display name, not the enum
    expect(isValidProPlan(undefined)).toBe(false);
    expect(isValidProPlan(null)).toBe(false);
  });
});

describe("Brand.plan enum → display name mapping (DO NOT BREAK)", () => {
  // This mapping is the documented quirk: the DB enum stays free|pro|enterprise
  // and maps to Listed|Featured|Premier. A regression here = a billed brand
  // gets the wrong tier.
  it("free → Listed (€45 tier)", () => {
    const p = getProfessionalPlanLimits("free");
    expect(p.displayName).toBe("Listed");
    expect(p.monthlyExposureQuota).toBe(1_000);
    expect(p.featuredEligibility).toBe(false);
    expect(getProfessionalPlanDisplay("free")).toBe("Listed");
  });

  it("pro → Featured (€200 tier)", () => {
    const p = getProfessionalPlanLimits("pro");
    expect(p.displayName).toBe("Featured");
    expect(p.monthlyExposureQuota).toBe(10_000);
    expect(p.featuredEligibility).toBe(true);
    expect(getProfessionalPlanDisplay("pro")).toBe("Featured");
  });

  it("enterprise → Premier (custom tier)", () => {
    const p = getProfessionalPlanLimits("enterprise");
    expect(p.displayName).toBe("Premier");
    expect(p.maxActiveCollections).toBe(Infinity);
    expect(p.dedicated).toBe(true);
    expect(getProfessionalPlanDisplay("enterprise")).toBe("Premier");
  });

  it("getProPlanCta is sales-led for enterprise, choose-X otherwise", () => {
    expect(getProPlanCta("enterprise")).toBe("Contact team");
    expect(getProPlanCta("free")).toBe("Choose Listed");
    expect(getProPlanCta("pro")).toBe("Choose Featured");
  });

  it("ALL_PRO_PLANS is in marketing order: Listed, Featured, Premier", () => {
    expect(ALL_PRO_PLANS.map((p) => p.displayName)).toEqual([
      "Listed",
      "Featured",
      "Premier",
    ]);
  });
});
