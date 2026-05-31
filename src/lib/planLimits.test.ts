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

describe("getClientPlanLimits — feature gates per plan (DO NOT BREAK)", () => {
  it("essential is the entry tier with strict caps and no advanced features", () => {
    const p = getClientPlanLimits("essential");
    expect(p.maxScansPerMonth).toBe(5);
    expect(p.maxWardrobeSaves).toBe(4);
    expect(p.customOccasion).toBe(false);
    expect(p.customColorPicker).toBe(false);
    expect(p.crossBrand).toBe(false);
    expect(p.nextPlan).toBe("fashion");
  });

  it("fashion is mid-tier: more quota, custom occasions, still single-brand", () => {
    const p = getClientPlanLimits("fashion");
    expect(p.maxScansPerMonth).toBe(15);
    expect(p.customOccasion).toBe(true);
    expect(p.crossBrand).toBe(false);
    expect(p.nextPlan).toBe("model");
  });

  it("model is top tier: unlimited, cross-brand, no nextPlan", () => {
    const p = getClientPlanLimits("model");
    expect(p.maxScansPerMonth).toBe(Infinity);
    expect(p.maxWardrobeSaves).toBe(Infinity);
    expect(p.maxTryOnsPerMonth).toBe(Infinity);
    expect(p.crossBrand).toBe(true);
    expect(p.mobileWardrobe).toBe(true);
    expect(p.nextPlan).toBe(null);
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
