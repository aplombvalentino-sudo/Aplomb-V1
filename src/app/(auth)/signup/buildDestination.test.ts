import { describe, it, expect } from "vitest";
import { buildDestination } from "./buildDestination";

describe("buildDestination — post-signup redirect map", () => {
  // ── Client branch ──
  it("client + no plan → /app (free Essential is the default)", () => {
    expect(buildDestination("client", null)).toBe("/app");
  });

  it("client + 'essential' plan → /app (Essential is free, skips Stripe)", () => {
    expect(buildDestination("client", "essential")).toBe("/app");
  });

  it("client + paid plan → /checkout with audience=client and the plan slug", () => {
    expect(buildDestination("client", "premium")).toBe(
      "/checkout?audience=client&plan=premium",
    );
  });

  // ── Brand branch ──
  it("brand + no plan → /pro/dashboard (free trial workspace)", () => {
    expect(buildDestination("brand", null)).toBe("/pro/dashboard");
  });

  it("brand + any plan → /checkout with audience=brand and the plan slug", () => {
    expect(buildDestination("brand", "fashion")).toBe(
      "/checkout?audience=brand&plan=fashion",
    );
    expect(buildDestination("brand", "featured")).toBe(
      "/checkout?audience=brand&plan=featured",
    );
  });

  // ── Encoding sanity ──
  it("does not double-encode the plan slug (it's already URL-safe)", () => {
    // Plan slugs are validated upstream as [a-z0-9_-]+; ensure we don't run
    // them through encodeURIComponent (which would break legitimate slugs).
    expect(buildDestination("brand", "pro-yearly")).toBe(
      "/checkout?audience=brand&plan=pro-yearly",
    );
  });
});
