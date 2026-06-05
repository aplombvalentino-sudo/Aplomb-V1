import { describe, it, expect } from "vitest";
import {
  isValidClientPlan,
  getClientPlanLimits,
  currentMonthKey,
  CLIENT_PLAN_COOKIE,
} from "./planLimits";

describe("isValidClientPlan", () => {
  it("accepts essential / fashion / model and rejects everything else", () => {
    expect(isValidClientPlan("essential")).toBe(true);
    expect(isValidClientPlan("fashion")).toBe(true);
    expect(isValidClientPlan("model")).toBe(true);
    expect(isValidClientPlan("free")).toBe(false); // brand enum, not client
    expect(isValidClientPlan(undefined)).toBe(false);
    expect(isValidClientPlan(42)).toBe(false);
  });
});

describe("getClientPlanLimits — wardrobe-first dimensions (DO NOT BREAK)", () => {
  it("essential: 10 wardrobe slots including up to 3 personal photos (per product spec)", () => {
    const p = getClientPlanLimits("essential");
    expect(p.maxWardrobeItems).toBe(10);
    expect(p.maxPersonalPhotos).toBe(3);
    expect(p.outfitExperimentation).toBe("basic");
    expect(p.nextPlan).toBe("fashion");
  });

  it("fashion: 40 slots / 15 personal photos / full outfit experimentation", () => {
    const p = getClientPlanLimits("fashion");
    expect(p.maxWardrobeItems).toBe(40);
    expect(p.maxPersonalPhotos).toBe(15);
    expect(p.outfitExperimentation).toBe("full");
    expect(p.nextPlan).toBe("model");
  });

  it("model: unlimited everything, no nextPlan", () => {
    const p = getClientPlanLimits("model");
    expect(p.maxWardrobeItems).toBe(Infinity);
    expect(p.maxPersonalPhotos).toBe(Infinity);
    expect(p.outfitExperimentation).toBe("full");
    expect(p.crossBrand).toBe(true);
    expect(p.nextPlan).toBe(null);
  });

  it("personal-photo cap is always ≤ total wardrobe cap (invariant)", () => {
    // Quota helpers depend on this: you can't have more personal photos
    // than total slots, by construction.
    for (const plan of ["essential", "fashion", "model"] as const) {
      const p = getClientPlanLimits(plan);
      expect(p.maxPersonalPhotos).toBeLessThanOrEqual(p.maxWardrobeItems);
    }
  });
});

describe("getClientPlanLimits — sizing dimensions (kept as secondary)", () => {
  it("essential still has tight scan + try-on quotas (sizing didn't disappear)", () => {
    const p = getClientPlanLimits("essential");
    expect(p.maxScansPerMonth).toBe(5);
    expect(p.maxTryOnsPerMonth).toBe(3);
    expect(p.customOccasion).toBe(false);
  });

  it("model unlocks unlimited scans + try-ons", () => {
    const p = getClientPlanLimits("model");
    expect(p.maxScansPerMonth).toBe(Infinity);
    expect(p.maxTryOnsPerMonth).toBe(Infinity);
  });
});

describe("getClientPlanLimits — deprecated maxWardrobeSaves shim", () => {
  it("legacy maxWardrobeSaves field mirrors maxWardrobeItems (transition compat)", () => {
    // Old code paths (wardrobeStorage saved-outfits counter) read the
    // deprecated field. It must keep returning a sensible value until
    // those call sites migrate.
    for (const plan of ["essential", "fashion", "model"] as const) {
      const p = getClientPlanLimits(plan);
      expect(p.maxWardrobeSaves).toBe(p.maxWardrobeItems);
    }
  });
});

describe("misc planLimits exports", () => {
  it("CLIENT_PLAN_COOKIE name is stable (used by middleware + clients)", () => {
    expect(CLIENT_PLAN_COOKIE).toBe("aplomb_client_plan");
  });

  it("currentMonthKey produces a YYYY-MM string", () => {
    expect(currentMonthKey()).toMatch(/^\d{4}-\d{2}$/);
  });
});
