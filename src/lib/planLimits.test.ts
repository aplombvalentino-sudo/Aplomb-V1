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

  it("fashion: 50 slots / 15 personal photos / full outfit experimentation", () => {
    const p = getClientPlanLimits("fashion");
    expect(p.maxWardrobeItems).toBe(50);
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

describe("getClientPlanLimits — sizing + try-on quotas (per restructure brief)", () => {
  it("essential = 5 try-ons / month, scans stay tight", () => {
    const p = getClientPlanLimits("essential");
    expect(p.maxScansPerMonth).toBe(5);
    expect(p.maxTryOnsPerMonth).toBe(5); // ↑ from 3 per brief
    expect(p.customOccasion).toBe(false);
  });

  it("fashion = 50 try-ons / month", () => {
    const p = getClientPlanLimits("fashion");
    expect(p.maxTryOnsPerMonth).toBe(50);
  });

  it("model = 200 try-ons / month (capped per brief, no longer unlimited)", () => {
    const p = getClientPlanLimits("model");
    expect(p.maxScansPerMonth).toBe(Infinity);
    expect(p.maxTryOnsPerMonth).toBe(200);
  });
});

describe("getClientPlanLimits — AI Outfit Assistant tiering", () => {
  it("essential has the assistant locked + no recommendation quota", () => {
    const p = getClientPlanLimits("essential");
    expect(p.hasOutfitAssistant).toBe(false);
    expect(p.maxAssistantRecommendationsPerMonth).toBe(0);
    expect(p.crossBrandRecommendations).toBe(false);
  });

  it("fashion = 50 monthly recommendations, wardrobe-only (no cross-brand)", () => {
    const p = getClientPlanLimits("fashion");
    expect(p.hasOutfitAssistant).toBe(true);
    expect(p.maxAssistantRecommendationsPerMonth).toBe(50);
    expect(p.crossBrandRecommendations).toBe(false);
  });

  it("model = unlimited recommendations + cross-brand unlocked", () => {
    const p = getClientPlanLimits("model");
    expect(p.hasOutfitAssistant).toBe(true);
    expect(p.maxAssistantRecommendationsPerMonth).toBe(Infinity);
    expect(p.crossBrandRecommendations).toBe(true);
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
