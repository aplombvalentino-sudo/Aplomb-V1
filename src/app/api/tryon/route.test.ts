import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    tryOnResult: { findFirst: vi.fn(), create: vi.fn() },
    outfitItem: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/ownership", () => ({ authorizeBodyProfile: vi.fn() }));
vi.mock("@/lib/rateLimit-upstash", () => ({
  LIMITS: { tryon_daily: () => null, tryon_minute: () => null },
  enforceLimits: vi.fn(),
  tooManyRequests: vi.fn(() => new Response(null, { status: 429 })),
}));
vi.mock("@/lib/ai/fal/tryon", () => ({
  generateTryOnImage: vi.fn(),
}));
vi.mock("@/lib/ai/storage", () => ({
  getSignedBodyScanUrl: vi.fn(),
}));

import { POST } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorizeBodyProfile } from "@/lib/ownership";
import { enforceLimits } from "@/lib/rateLimit-upstash";
import { generateTryOnImage } from "@/lib/ai/fal/tryon";
import { getSignedBodyScanUrl } from "@/lib/ai/storage";

const ITEM_ID = "ckznz0e7n0000aaaaaaaaaaaaa";
const BP_ID = "ckznz0e7n0000bbbbbbbbbbbbb";

const validBody = { outfitItemId: ITEM_ID, bodyProfileId: BP_ID };

const makeReq = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/tryon", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
  vi.mocked(authorizeBodyProfile).mockResolvedValue({
    ok: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bodyProfile: { id: BP_ID, frontImagePath: "private/u1/front.jpg" } as any,
  });
  vi.mocked(enforceLimits).mockResolvedValue({ allowed: true });
  vi.mocked(db.tryOnResult.findFirst).mockResolvedValue(null);
  vi.mocked(db.outfitItem.findUnique).mockResolvedValue({
    id: ITEM_ID,
    position: "top",
    product: { imageUrl: "https://example.com/g.jpg" },
    productVariant: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  vi.mocked(getSignedBodyScanUrl).mockResolvedValue("https://signed/model.jpg");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(generateTryOnImage).mockResolvedValue({ imageUrl: "https://result.jpg" } as any);
});

describe("POST /api/tryon", () => {
  it("400: Zod strict rejects unknown fields", async () => {
    const res = await POST(makeReq({ ...validBody, qualityMode: "fast", evil: "x" }));
    expect(res.status).toBe(400);
  });

  it("400: rejects qualityMode outside the enum", async () => {
    const res = await POST(makeReq({ ...validBody, qualityMode: "ultra" }));
    expect(res.status).toBe(400);
  });

  it("CRITICAL: authorizeBodyProfile runs BEFORE rate-limit (no ownership probe via 429)", async () => {
    vi.mocked(authorizeBodyProfile).mockResolvedValue({
      ok: false, status: 403, reason: "not your profile",
    });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(403);
    expect(vi.mocked(enforceLimits)).not.toHaveBeenCalled();
    expect(vi.mocked(generateTryOnImage)).not.toHaveBeenCalled();
  });

  it("429 when rate-limited (after ownership passes)", async () => {
    vi.mocked(enforceLimits).mockResolvedValue({ allowed: false, retryAfterSeconds: 30 });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(429);
    expect(vi.mocked(generateTryOnImage)).not.toHaveBeenCalled();
  });

  it("CACHE: returns the existing result and skips fal.ai when a tryOnResult already exists", async () => {
    vi.mocked(db.tryOnResult.findFirst).mockResolvedValue({
      id: "tr_cached",
      imageUrl: "https://cached.jpg",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual({
      tryOnResultId: "tr_cached",
      imageUrl: "https://cached.jpg",
      cached: true,
    });
    // The whole point of the cache: no AI call, no storage signing.
    expect(vi.mocked(generateTryOnImage)).not.toHaveBeenCalled();
    expect(vi.mocked(getSignedBodyScanUrl)).not.toHaveBeenCalled();
  });

  it("404 when the outfit item doesn't exist", async () => {
    vi.mocked(db.outfitItem.findUnique).mockResolvedValue(null);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(404);
  });

  it("400 NO_FRONT_PHOTO when the body profile has no scan on file", async () => {
    vi.mocked(authorizeBodyProfile).mockResolvedValue({
      ok: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bodyProfile: { id: BP_ID, frontImagePath: null } as any,
    });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("NO_FRONT_PHOTO");
  });

  it("400 NO_GARMENT_IMAGE when neither variant nor product has an image", async () => {
    vi.mocked(db.outfitItem.findUnique).mockResolvedValue({
      id: ITEM_ID,
      position: "top",
      product: { imageUrl: null },
      productVariant: { additionalImages: [] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("NO_GARMENT_IMAGE");
  });

  it("happy path: signs the body scan, calls fal, persists, returns {cached:false}", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.tryOnResult.create).mockResolvedValue({
      id: "tr_new",
      imageUrl: "https://result.jpg",
    } as never);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.cached).toBe(false);
    expect(json.data.imageUrl).toBe("https://result.jpg");

    // The user's front photo must be signed (private bucket), not passed as a path.
    expect(vi.mocked(getSignedBodyScanUrl)).toHaveBeenCalledWith("private/u1/front.jpg");
    // fal got the signed URL, not the raw path.
    expect(vi.mocked(generateTryOnImage).mock.calls[0]![0]).toMatchObject({
      modelImageUrl: "https://signed/model.jpg",
      garmentImageUrl: "https://example.com/g.jpg",
      category: "tops",
    });
  });

  it("anonymous rate-limit key falls back to bp:<bodyProfileId>", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    vi.mocked(enforceLimits).mockResolvedValue({ allowed: false, retryAfterSeconds: 1 });
    await POST(makeReq(validBody));
    expect(vi.mocked(enforceLimits).mock.calls[0]![0]).toBe(`bp:${BP_ID}`);
  });
});
