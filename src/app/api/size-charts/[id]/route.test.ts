import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    sizeChart: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock("@/lib/brandRole", async () => {
  const actual = await vi.importActual<typeof import("@/lib/brandRole")>("@/lib/brandRole");
  return { ...actual, requireBrandRole: vi.fn() };
});
vi.mock("@/lib/rateLimit-upstash", () => ({
  LIMITS: { product_writes: () => null },
  enforceLimits: vi.fn(),
  tooManyRequests: vi.fn(() => new Response(null, { status: 429 })),
}));

import { GET, PUT, DELETE } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireBrandRole } from "@/lib/brandRole";
import { enforceLimits } from "@/lib/rateLimit-upstash";

const VALID_ID = "ckznz0e7n0000abcdefghijklm";
const mockChart = { id: VALID_ID, brandId: "ckxxx", category: "tops", chartJson: {} };

const paramsOf = (id: string) => Promise.resolve({ id });
const req = () => new NextRequest("http://localhost:3000/api/size-charts/x");

beforeEach(() => {
  vi.clearAllMocks();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
  vi.mocked(enforceLimits).mockResolvedValue({ allowed: true });
  vi.mocked(requireBrandRole).mockResolvedValue({
    ok: true, brandUserId: "bu1", role: "editor",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(db.sizeChart.findUnique).mockResolvedValue(mockChart as any);
});

// ─── GET /api/size-charts/[id] ───────────────────────────────────────────────

describe("GET /api/size-charts/[id]", () => {
  it("401 unauthed", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(401);
  });

  it("400 on non-cuid id", async () => {
    const res = await GET(req(), { params: paramsOf("nope") });
    expect(res.status).toBe(400);
  });

  it("404 when missing", async () => {
    vi.mocked(db.sizeChart.findUnique).mockResolvedValue(null);
    const res = await GET(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(404);
  });

  it("403 without read role on the chart's brand", async () => {
    vi.mocked(requireBrandRole).mockResolvedValue({
      ok: false, status: 403, reason: "no membership",
    });
    const res = await GET(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(403);
  });

  it("200 on happy path", async () => {
    const res = await GET(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(200);
  });
});

// ─── PUT /api/size-charts/[id] ───────────────────────────────────────────────

describe("PUT /api/size-charts/[id]", () => {
  const putReq = (body: unknown) =>
    new NextRequest("http://localhost:3000/api/size-charts/x", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  it("403 without write role", async () => {
    vi.mocked(requireBrandRole).mockResolvedValue({
      ok: false, status: 403, reason: "viewer cannot write",
    });
    const res = await PUT(putReq({ category: "x" }), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(403);
    expect(vi.mocked(db.sizeChart.update)).not.toHaveBeenCalled();
  });

  it("400: Zod rejects unknown keys (anti-mass-assignment)", async () => {
    const res = await PUT(
      putReq({ brandId: "ckznz0e7n0000zzzzzzzzzzzzz" }),
      { params: paramsOf(VALID_ID) },
    );
    expect(res.status).toBe(400);
  });

  it("200: updates category only when present (partial update)", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.sizeChart.update).mockResolvedValue({ ...mockChart, category: "bottoms" } as any);
    const res = await PUT(putReq({ category: "bottoms" }), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(200);
    const callArgs = vi.mocked(db.sizeChart.update).mock.calls[0]![0]!;
    expect(callArgs.data).toMatchObject({ category: "bottoms" });
    // chartJson must NOT appear when not provided.
    expect("chartJson" in callArgs.data).toBe(false);
  });

  it("200: updates chartJson when provided", async () => {
    const newJson = { sizes: [{ label: "XL", chest: [100, 106] }] };
    vi.mocked(db.sizeChart.update).mockResolvedValue(mockChart as never);
    await PUT(putReq({ chartJson: newJson }), { params: paramsOf(VALID_ID) });
    expect(vi.mocked(db.sizeChart.update).mock.calls[0]![0]!.data).toMatchObject({
      chartJson: newJson,
    });
  });
});

// ─── DELETE /api/size-charts/[id] ────────────────────────────────────────────

describe("DELETE /api/size-charts/[id]", () => {
  it("403 with WRITE-only role (destructive gate — needs ADMIN)", async () => {
    vi.mocked(requireBrandRole).mockResolvedValue({
      ok: false, status: 403, reason: "editor cannot delete",
    });
    const res = await DELETE(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(403);
    expect(vi.mocked(db.sizeChart.delete)).not.toHaveBeenCalled();
  });

  it("200: admin can delete", async () => {
    vi.mocked(requireBrandRole).mockResolvedValue({
      ok: true, brandUserId: "bu1", role: "admin",
    });
    vi.mocked(db.sizeChart.delete).mockResolvedValue(mockChart as never);
    const res = await DELETE(req(), { params: paramsOf(VALID_ID) });
    expect(res.status).toBe(200);
    expect(vi.mocked(db.sizeChart.delete)).toHaveBeenCalledWith({ where: { id: VALID_ID } });
  });
});
