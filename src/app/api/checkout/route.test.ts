import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks (hoisted) ──────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    brandUser: { findFirst: vi.fn() },
    brand: { update: vi.fn() },
  },
}));

vi.mock("@/lib/rateLimit-upstash", () => ({
  LIMITS: { brand_writes: () => null },
  enforceLimits: vi.fn(),
  tooManyRequests: vi.fn(),
}));

// Keep the real PLAN_CATALOG (the mapping contract the route relies on) and
// override the two impure helpers + the lazy Stripe getter.
vi.mock("@/lib/stripe", async () => {
  const actual = await vi.importActual<typeof import("@/lib/stripe")>("@/lib/stripe");
  return {
    ...actual,
    getStripe: vi.fn(),
    isStripeConfigured: vi.fn(),
    priceIdForPlan: vi.fn(),
  };
});

// Imports AFTER mocks
import { POST } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforceLimits } from "@/lib/rateLimit-upstash";
import { getStripe, isStripeConfigured, priceIdForPlan } from "@/lib/stripe";

// ── Stripe stub ──────────────────────────────────────────────────────────────

const stripeCustomersCreate = vi.fn();
const stripeSessionsCreate = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripeMock: any = {
  customers: { create: stripeCustomersCreate },
  checkout: { sessions: { create: stripeSessionsCreate } },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body: unknown) {
  return new NextRequest("http://localhost:3000/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Defaults = "auth + config + price OK, no existing customer" (happy-path-ready).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
  vi.mocked(enforceLimits).mockResolvedValue({ allowed: true });
  vi.mocked(isStripeConfigured).mockReturnValue(true);
  vi.mocked(priceIdForPlan).mockReturnValue("price_test_x");
  vi.mocked(db.user.findUnique).mockResolvedValue({
    id: "u1",
    email: "u1@example.com",
    name: "User One",
    stripeCustomerId: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  vi.mocked(getStripe).mockReturnValue(stripeMock);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/checkout — gate order", () => {
  it("(a) returns 401 UNAUTHORIZED when not signed in", async () => {
    // `auth` is overloaded (zero-arg vs middleware-wrapper); pin to the zero-arg
    // overload by widening the value with `as never`.
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makeReq({ plan: "fashion" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
    // No Stripe touched
    expect(stripeCustomersCreate).not.toHaveBeenCalled();
    expect(stripeSessionsCreate).not.toHaveBeenCalled();
  });

  it("(b) returns 400 VALIDATION_ERROR when plan is not in the enum (e.g. 'premier')", async () => {
    const res = await POST(makeReq({ plan: "premier" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(stripeCustomersCreate).not.toHaveBeenCalled();
    expect(stripeSessionsCreate).not.toHaveBeenCalled();
  });

  it("(c) returns 503 BILLING_UNAVAILABLE when STRIPE_SECRET_KEY isn't set", async () => {
    vi.mocked(isStripeConfigured).mockReturnValue(false);
    const res = await POST(makeReq({ plan: "fashion" }));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error.code).toBe("BILLING_UNAVAILABLE");
  });

  it("(d) returns 503 PRICE_NOT_CONFIGURED when the plan's price env var is empty", async () => {
    vi.mocked(priceIdForPlan).mockReturnValue(null);
    const res = await POST(makeReq({ plan: "featured" }));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error.code).toBe("PRICE_NOT_CONFIGURED");
    expect(json.error.message).toContain("STRIPE_PRICE_FEATURED");
  });

  it("(e) returns 403 FORBIDDEN when a brand plan is requested by a user with no owner/admin membership", async () => {
    vi.mocked(db.brandUser.findFirst).mockResolvedValue(null);
    const res = await POST(makeReq({ plan: "featured" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("FORBIDDEN");
    // The privilege check must fire BEFORE any Stripe call.
    expect(stripeCustomersCreate).not.toHaveBeenCalled();
    expect(stripeSessionsCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/checkout — happy path BRAND", () => {
  it("(f) creates customer + Session for a Featured brand subscription and persists customer id", async () => {
    vi.mocked(db.brandUser.findFirst).mockResolvedValue({
      brand: { id: "b1", name: "Atelier", stripeCustomerId: null },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    stripeCustomersCreate.mockResolvedValue({ id: "cus_brand_new" });
    stripeSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/c/cs_test_123" });

    const res = await POST(makeReq({ plan: "featured" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.url).toBe("https://checkout.stripe.com/c/cs_test_123");

    // New customer was created with the brand metadata link…
    expect(stripeCustomersCreate).toHaveBeenCalledTimes(1);
    expect(stripeCustomersCreate.mock.calls[0][0]).toMatchObject({
      email: "u1@example.com",
      metadata: { aplomb_brand_id: "b1" },
    });
    // …then mirrored onto the Brand row.
    expect(vi.mocked(db.brand.update)).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { stripeCustomerId: "cus_brand_new" },
    });

    // The Session itself carries the right contract.
    expect(stripeSessionsCreate).toHaveBeenCalledTimes(1);
    const sessionArg = stripeSessionsCreate.mock.calls[0][0];
    expect(sessionArg.mode).toBe("subscription");
    expect(sessionArg.customer).toBe("cus_brand_new");
    expect(sessionArg.line_items).toEqual([{ price: "price_test_x", quantity: 1 }]);
    expect(sessionArg.success_url).toBe("http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}");
    expect(sessionArg.cancel_url).toBe("http://localhost:3000/pricing");
    expect(sessionArg.metadata).toMatchObject({ side: "brand", plan: "featured", userId: "u1", brandId: "b1" });
    expect(sessionArg.subscription_data.metadata).toMatchObject({ side: "brand", plan: "featured" });
  });
});

describe("POST /api/checkout — happy path CLIENT", () => {
  it("(g) creates customer + Session for a Fashion shopper subscription and persists customer id", async () => {
    stripeCustomersCreate.mockResolvedValue({ id: "cus_client_new" });
    stripeSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/c/cs_test_456" });

    const res = await POST(makeReq({ plan: "fashion" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.url).toBe("https://checkout.stripe.com/c/cs_test_456");

    // Client side → User row mirrored, not Brand.
    expect(stripeCustomersCreate.mock.calls[0][0]).toMatchObject({
      email: "u1@example.com",
      metadata: { aplomb_user_id: "u1" },
    });
    expect(vi.mocked(db.user.update)).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { stripeCustomerId: "cus_client_new" },
    });
    expect(vi.mocked(db.brand.update)).not.toHaveBeenCalled();
    expect(vi.mocked(db.brandUser.findFirst)).not.toHaveBeenCalled();

    const sessionArg = stripeSessionsCreate.mock.calls[0][0];
    expect(sessionArg.metadata).toMatchObject({ side: "client", plan: "fashion", userId: "u1" });
    expect(sessionArg.metadata.brandId).toBeUndefined();
  });
});

describe("POST /api/checkout — customer reuse", () => {
  it("(h) does NOT create a new Stripe customer when the user already has one", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "u1",
      email: "u1@example.com",
      name: "User One",
      stripeCustomerId: "cus_existing_client",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    stripeSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/c/cs_test_789" });

    const res = await POST(makeReq({ plan: "model" }));
    expect(res.status).toBe(200);

    // Critical: no duplicate customer.
    expect(stripeCustomersCreate).not.toHaveBeenCalled();
    // And no needless DB write since the id was already there.
    expect(vi.mocked(db.user.update)).not.toHaveBeenCalled();

    // The Session uses the existing customer id.
    expect(stripeSessionsCreate.mock.calls[0][0].customer).toBe("cus_existing_client");
  });
});
