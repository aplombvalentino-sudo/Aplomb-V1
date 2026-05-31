import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks (hoisted) ──────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    subscription: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    brand: {
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      update: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

// Keep the real PLAN_CATALOG (its mapping is the contract we're verifying) but
// override the two functions the route calls at runtime.
vi.mock("@/lib/stripe", async () => {
  const actual = await vi.importActual<typeof import("@/lib/stripe")>("@/lib/stripe");
  return {
    ...actual,
    getStripe: vi.fn(),
    planForPriceId: vi.fn(),
  };
});

// Imports AFTER the mocks so they resolve to the mocked modules.
import { POST } from "./route";
import { db } from "@/lib/db";
import { getStripe, planForPriceId } from "@/lib/stripe";

// ── Stripe stub ──────────────────────────────────────────────────────────────

const constructEvent = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripeMock: any = { webhooks: { constructEvent } };

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(rawBody = "{}", sig: string | null = "t=1,v1=abc") {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (sig) headers["stripe-signature"] = sig;
  return new NextRequest("http://localhost:3000/api/stripe/webhook", {
    method: "POST",
    headers,
    body: rawBody,
  });
}

type EventOverrides = {
  type?: string;
  subId?: string;
  status?: string;
  metadata?: Record<string, string>;
  priceId?: string;
  customer?: string;
};

function brandFeaturedEvent(o: EventOverrides = {}) {
  return {
    type: o.type ?? "customer.subscription.created",
    data: {
      object: {
        id: o.subId ?? "sub_featured_1",
        status: o.status ?? "active",
        customer: o.customer ?? "cus_brand",
        cancel_at_period_end: false,
        current_period_end: 1735689600,
        metadata: o.metadata ?? {
          side: "brand",
          plan: "featured",
          userId: "u1",
          brandId: "b1",
        },
        items: { data: [{ price: { id: o.priceId ?? "price_featured_x" } }] },
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function clientFashionEvent(o: EventOverrides = {}) {
  return {
    type: o.type ?? "customer.subscription.deleted",
    data: {
      object: {
        id: o.subId ?? "sub_fashion_1",
        status: o.status ?? "canceled",
        customer: o.customer ?? "cus_client",
        cancel_at_period_end: false,
        current_period_end: 1735689600,
        metadata: o.metadata ?? {
          side: "client",
          plan: "fashion",
          userId: "u_shopper",
        },
        items: { data: [{ price: { id: o.priceId ?? "price_fashion_x" } }] },
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  vi.mocked(getStripe).mockReturnValue(stripeMock);
  // planForPriceId fallback is only used when metadata.plan is absent, which we
  // never trigger in these tests — keep it benign.
  vi.mocked(planForPriceId).mockReturnValue(null);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/stripe/webhook — signature gate", () => {
  it("returns 400 when the stripe-signature header is missing", async () => {
    const res = await POST(makeReq("{}", null));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing signature");
    expect(constructEvent).not.toHaveBeenCalled();
    expect(vi.mocked(db.subscription.upsert)).not.toHaveBeenCalled();
  });

  it("returns 400 'Invalid signature' when constructEvent throws", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("bad signature");
    });
    const res = await POST(makeReq("{}", "t=1,v1=tampered"));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Invalid signature");
    // No DB writes on a bad signature — defence in depth.
    expect(vi.mocked(db.subscription.upsert)).not.toHaveBeenCalled();
    expect(vi.mocked(db.brand.update)).not.toHaveBeenCalled();
    expect(vi.mocked(db.user.update)).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe/webhook — brand subscription created (Featured)", () => {
  it("upserts the Subscription row and flips Brand.plan to 'pro' (featured → pro mapping)", async () => {
    constructEvent.mockReturnValue(brandFeaturedEvent());
    vi.mocked(db.subscription.upsert).mockResolvedValue({} as never);
    vi.mocked(db.brand.update).mockResolvedValue({} as never);

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    // The Subscription row carries the right keys + the plan slug from metadata.
    expect(vi.mocked(db.subscription.upsert)).toHaveBeenCalledTimes(1);
    const upsertArg = vi.mocked(db.subscription.upsert).mock.calls[0][0];
    expect(upsertArg.where).toEqual({ brandId: "b1" });
    expect(upsertArg.create).toMatchObject({
      brandId: "b1",
      stripeCustomerId: "cus_brand",
      stripeSubscriptionId: "sub_featured_1",
      stripePriceId: "price_featured_x",
      plan: "featured",
      status: "active",
    });

    // The Brand.plan enum is the documented quirk: featured maps to "pro".
    expect(vi.mocked(db.brand.update)).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { plan: "pro" },
    });

    // No shopper side-effects.
    expect(vi.mocked(db.user.update)).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe/webhook — shopper subscription deleted (Fashion)", () => {
  it("reverts User.clientPlan to 'essential' when the subscription is cancelled", async () => {
    constructEvent.mockReturnValue(clientFashionEvent()); // type=deleted, status=canceled
    // The existing row matches the deleted sub id → not stale, proceed with revert.
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      stripeSubscriptionId: "sub_fashion_1",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(db.subscription.upsert).mockResolvedValue({} as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    expect(vi.mocked(db.user.update)).toHaveBeenCalledWith({
      where: { id: "u_shopper" },
      data: { clientPlan: "essential" },
    });
    // No brand-side update.
    expect(vi.mocked(db.brand.update)).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe/webhook — stale delete guard", () => {
  it("ignores a deleted event whose subscription id doesn't match the stored one", async () => {
    // The webhook is for sub_OLD; meanwhile DB already tracks a newer sub_NEW.
    constructEvent.mockReturnValue(clientFashionEvent({ subId: "sub_OLD" }));
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      stripeSubscriptionId: "sub_NEW",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    // Critical: stale cancel must NOT overwrite the current (newer) subscription
    // nor downgrade the user's plan.
    expect(vi.mocked(db.subscription.upsert)).not.toHaveBeenCalled();
    expect(vi.mocked(db.user.update)).not.toHaveBeenCalled();
    expect(vi.mocked(db.brand.update)).not.toHaveBeenCalled();
  });
});
