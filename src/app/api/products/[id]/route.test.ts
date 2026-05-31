import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    product: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/brandRole", async () => {
  const actual = await vi.importActual<typeof import("@/lib/brandRole")>("@/lib/brandRole");
  return { ...actual, requireBrandRole: vi.fn() };
});

vi.mock("@/lib/rateLimit-upstash", () => ({
  LIMITS: { product_writes: () => null },
  enforceLimits: vi.fn(),
  tooManyRequests: vi.fn(() =>
    new Response(JSON.stringify({ success: false }), { status: 429 }),
  ),
}));

// Imports AFTER mocks
import { GET, PUT, DELETE } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireBrandRole } from "@/lib/brandRole";
import { enforceLimits } from "@/lib/rateLimit-upstash";

const VALID_ID = "ckznz0e7n0000abcdefghijklm";

const mockProduct = {
  id: VALID_ID,
  brandId: "ckznz0e7n0000brandbrandbra",
  name: "Tee",
  variants: [],
};

function paramsOf(id: string) {
  return Promise.resolve({ id });
}

beforeEach(() => {
  vi.clearAllMocks();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
  vi.mocked(enforceLimits).mockResolvedValue({ allowed: true });
  vi.mocked(requireBrandRole).mockResolvedValue({
    ok: true,
    brandUserId: "bu1",
    role: "editor",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(db.product.findUnique).mockResolvedValue(mockProduct as any);
});

const req = () => new NextRequest("http://localhost:3000/api/products/x");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products/[id]
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/products/[id]", () => {
  it("401 when unauthed", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(401);
  });

  it("400 when the [id] param is not a cuid", async () => {
    const res = await GET(req(), { params: paramsOf("not-a-cuid") });
    expect(res.status).toBe(400);
    expect(vi.mocked(db.product.findUnique)).not.toHaveBeenCalled();
  });

  it("404 when the product does not exist", async () => {
    vi.mocked(db.product.findUnique).mockResolvedValue(null);
    const res = await GET(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(404);
  });

  it("403 when the caller has no read role on the product's brand", async () => {
    vi.mocked(requireBrandRole).mockResolvedValue({
      ok: false,
      status: 403,
      reason: "no membership",
    });
    const res = await GET(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(403);
  });

  it("returns the product on happy path", async () => {
    const res = await GET(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe(VALID_ID);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/products/[id]
// ─────────────────────────────────────────────────────────────────────────────

describe("PUT /api/products/[id]", () => {
  function putReq(body: unknown) {
    return new NextRequest("http://localhost:3000/api/products/x", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401 when unauthed", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await PUT(putReq({ name: "X" }), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(401);
  });

  it("429 when rate-limited", async () => {
    vi.mocked(enforceLimits).mockResolvedValue({ allowed: false, retryAfterSeconds: 10 });
    const res = await PUT(putReq({ name: "X" }), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(429);
  });

  it("404 when the product does not exist", async () => {
    vi.mocked(db.product.findUnique).mockResolvedValue(null);
    const res = await PUT(putReq({ name: "X" }), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(404);
  });

  it("403 when caller has only viewer role (ROLES_WRITE required to update)", async () => {
    vi.mocked(requireBrandRole).mockResolvedValue({
      ok: false,
      status: 403,
      reason: "viewer cannot write",
    });
    const res = await PUT(putReq({ name: "X" }), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(403);
    expect(vi.mocked(db.product.update)).not.toHaveBeenCalled();
  });

  it("Zod strict: rejects unknown fields", async () => {
    const res = await PUT(
      putReq({ name: "X", brandId: "ckznz0e7n0000zzzzzzzzzzzzz" }), // brandId is not in updateSchema
      { params: paramsOf(VALID_ID) },
    );
    expect(res.status).toBe(400);
  });

  it("updates and returns the row on happy path", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.product.update).mockResolvedValue({ ...mockProduct, name: "New" } as any);
    const res = await PUT(putReq({ name: "New" }), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(200);
    expect(vi.mocked(db.product.update)).toHaveBeenCalledWith({
      where: { id: VALID_ID },
      data: { name: "New", imageUrl: null },
      include: { variants: true },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/products/[id]
// ─────────────────────────────────────────────────────────────────────────────

describe("DELETE /api/products/[id]", () => {
  it("401 when unauthed", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await DELETE(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(401);
  });

  it("429 when rate-limited", async () => {
    vi.mocked(enforceLimits).mockResolvedValue({ allowed: false, retryAfterSeconds: 5 });
    const res = await DELETE(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(429);
  });

  it("403 when caller has WRITE role but NOT ADMIN (the destructive-action gate)", async () => {
    // This is the critical guard: editors can update but not delete.
    vi.mocked(requireBrandRole).mockResolvedValue({
      ok: false,
      status: 403,
      reason: "editor cannot delete (needs owner or admin)",
    });
    const res = await DELETE(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(403);
    expect(vi.mocked(db.product.delete)).not.toHaveBeenCalled();
  });

  it("deletes and returns { deleted: true } on happy path (admin caller)", async () => {
    vi.mocked(requireBrandRole).mockResolvedValue({
      ok: true,
      brandUserId: "bu1",
      role: "admin",
    });
    vi.mocked(db.product.delete).mockResolvedValue(mockProduct as never);
    const res = await DELETE(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual({ deleted: true });
    expect(vi.mocked(db.product.delete)).toHaveBeenCalledWith({ where: { id: VALID_ID } });
  });
});
