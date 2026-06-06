import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn() },
    wardrobeItem: { count: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    product: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/rateLimit-upstash", () => ({
  LIMITS: { brand_writes: () => null },
  enforceLimits: vi.fn(),
  tooManyRequests: vi.fn(() => new Response(null, { status: 429 })),
}));

// listWardrobeItems now batch-signs user_photo paths via this module. Mock it
// so the test doesn't pull in @supabase/supabase-js at import time (no env in
// test). With db.wardrobeItem.findMany returning [] in beforeEach, this is
// effectively a no-op anyway.
vi.mock("@/lib/wardrobe/storage", () => ({
  getSignedWardrobeUrls: vi.fn(async () => new Map<string, string>()),
}));

import { GET, POST } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforceLimits } from "@/lib/rateLimit-upstash";

const VALID_CUID = "ckznz0e7n0000abcdefghijklm";

beforeEach(() => {
  vi.clearAllMocks();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
  vi.mocked(enforceLimits).mockResolvedValue({ allowed: true });
  vi.mocked(db.user.findUnique).mockResolvedValue({
    clientPlan: "essential",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  vi.mocked(db.wardrobeItem.findMany).mockResolvedValue([]);
  vi.mocked(db.wardrobeItem.count).mockResolvedValue(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wardrobe/items
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/wardrobe/items", () => {
  it("401 when unauthed", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("happy path: returns { items, quota, plan }", async () => {
    vi.mocked(db.wardrobeItem.count)
      .mockResolvedValueOnce(2) // total items
      .mockResolvedValueOnce(1); // personal photos
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.plan).toBe("essential");
    expect(json.data.quota).toMatchObject({
      maxItems: 10,
      maxPersonalPhotos: 3,
      itemsUsed: 2,
      personalPhotosUsed: 1,
    });
    expect(Array.isArray(json.data.items)).toBe(true);
  });

  it("falls back to 'essential' plan when User row has a garbage clientPlan", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      clientPlan: "made-up-tier",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const res = await GET();
    const json = await res.json();
    expect(json.data.plan).toBe("essential");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wardrobe/items (certified)
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/wardrobe/items — certified item", () => {
  function postReq(body: unknown) {
    return new NextRequest("http://localhost:3000/api/wardrobe/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    // Default: a valid catalog product exists.
    vi.mocked(db.product.findUnique).mockResolvedValue({
      id: VALID_CUID,
      isActive: true,
      category: "tops",
      subcategory: null,
      brand: { name: "Acme" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(db.wardrobeItem.create).mockResolvedValue({
      id: "wi_new",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it("401 when unauthed", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(postReq({ productId: VALID_CUID }));
    expect(res.status).toBe(401);
  });

  it("429 when rate-limited", async () => {
    vi.mocked(enforceLimits).mockResolvedValue({ allowed: false, retryAfterSeconds: 30 });
    const res = await POST(postReq({ productId: VALID_CUID }));
    expect(res.status).toBe(429);
    expect(vi.mocked(db.wardrobeItem.create)).not.toHaveBeenCalled();
  });

  it("400 on non-cuid productId", async () => {
    const res = await POST(postReq({ productId: "nope" }));
    expect(res.status).toBe(400);
  });

  it("Zod strict rejects unknown fields (anti-mass-assignment)", async () => {
    const res = await POST(
      postReq({ productId: VALID_CUID, sourceType: "user_photo", userId: "evil" }),
    );
    expect(res.status).toBe(400);
  });

  it("409 WARDROBE_FULL when essential cap of 10 items reached", async () => {
    vi.mocked(db.wardrobeItem.count)
      .mockResolvedValueOnce(10) // total items
      .mockResolvedValueOnce(0); // personal
    const res = await POST(postReq({ productId: VALID_CUID }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("WARDROBE_FULL");
    expect(vi.mocked(db.wardrobeItem.create)).not.toHaveBeenCalled();
  });

  it("404 PRODUCT_NOT_AVAILABLE when the catalog product is inactive or missing", async () => {
    vi.mocked(db.product.findUnique).mockResolvedValue({
      id: VALID_CUID,
      isActive: false,
      category: "tops",
      subcategory: null,
      brand: { name: "Acme" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const res = await POST(postReq({ productId: VALID_CUID }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("PRODUCT_NOT_AVAILABLE");
  });

  it("happy path: 201, copies product metadata onto the wardrobe row, status ready", async () => {
    const res = await POST(postReq({ productId: VALID_CUID, nickname: "My fave tee" }));
    expect(res.status).toBe(201);
    const callArgs = vi.mocked(db.wardrobeItem.create).mock.calls[0]![0]!.data;
    expect(callArgs).toMatchObject({
      userId: "u1",
      sourceType: "certified",
      productId: VALID_CUID,
      category: "tops",
      brand: "Acme",
      nickname: "My fave tee",
      processingStatus: "ready",
    });
  });
});
