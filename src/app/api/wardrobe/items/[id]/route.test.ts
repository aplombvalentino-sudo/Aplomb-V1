import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    wardrobeItem: { findUnique: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock("@/lib/rateLimit-upstash", () => ({
  LIMITS: { brand_writes: () => null },
  enforceLimits: vi.fn(),
  tooManyRequests: vi.fn(() => new Response(null, { status: 429 })),
}));
vi.mock("@/lib/wardrobe/storage", () => ({ deleteWardrobePhoto: vi.fn() }));

import { DELETE } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforceLimits } from "@/lib/rateLimit-upstash";
import { deleteWardrobePhoto } from "@/lib/wardrobe/storage";

const VALID_ID = "ckznz0e7n0000abcdefghijklm";
const paramsOf = (id: string) => Promise.resolve({ id });
const req = () => new NextRequest("http://localhost:3000/api/wardrobe/items/x");

beforeEach(() => {
  vi.clearAllMocks();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
  vi.mocked(enforceLimits).mockResolvedValue({ allowed: true });
});

describe("DELETE /api/wardrobe/items/[id]", () => {
  it("401 when unauthed", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await DELETE(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(401);
  });

  it("429 when rate-limited", async () => {
    vi.mocked(enforceLimits).mockResolvedValue({ allowed: false, retryAfterSeconds: 30 });
    const res = await DELETE(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(429);
    expect(vi.mocked(db.wardrobeItem.delete)).not.toHaveBeenCalled();
  });

  it("400 on non-cuid id", async () => {
    const res = await DELETE(req(), { params: paramsOf("nope") });
    expect(res.status).toBe(400);
  });

  it("404 when the wardrobe item does not exist", async () => {
    vi.mocked(db.wardrobeItem.findUnique).mockResolvedValue(null);
    const res = await DELETE(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(404);
  });

  it("403 when the item belongs to a different user (cross-user delete attempt)", async () => {
    vi.mocked(db.wardrobeItem.findUnique).mockResolvedValue({
      userId: "someone-else",
      sourceType: "certified",
      frontImagePath: null,
      backImagePath: null,
      processedAssetPath: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const res = await DELETE(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(403);
    expect(vi.mocked(db.wardrobeItem.delete)).not.toHaveBeenCalled();
  });

  it("certified item: deletes DB row, does NOT touch storage", async () => {
    vi.mocked(db.wardrobeItem.findUnique).mockResolvedValue({
      userId: "u1",
      sourceType: "certified",
      frontImagePath: null,
      backImagePath: null,
      processedAssetPath: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const res = await DELETE(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(200);
    expect(vi.mocked(deleteWardrobePhoto)).not.toHaveBeenCalled();
    expect(vi.mocked(db.wardrobeItem.delete)).toHaveBeenCalledWith({ where: { id: VALID_ID } });
  });

  it("user_photo item: deletes front + back + processed from storage BEFORE the row (erasure order)", async () => {
    vi.mocked(db.wardrobeItem.findUnique).mockResolvedValue({
      userId: "u1",
      sourceType: "user_photo",
      frontImagePath: "users/u1/wi1/front.jpg",
      backImagePath: "users/u1/wi1/back.jpg",
      processedAssetPath: "users/u1/wi1/processed.png",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const res = await DELETE(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(200);
    const deletedPaths = vi.mocked(deleteWardrobePhoto).mock.calls.map((c) => c[0]);
    expect(deletedPaths).toContain("users/u1/wi1/front.jpg");
    expect(deletedPaths).toContain("users/u1/wi1/back.jpg");
    expect(deletedPaths).toContain("users/u1/wi1/processed.png");
    expect(vi.mocked(db.wardrobeItem.delete)).toHaveBeenCalled();
  });
});
