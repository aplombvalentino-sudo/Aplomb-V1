import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { sizeChart: { findMany: vi.fn(), create: vi.fn() } },
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

import { GET, POST } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireBrandRole } from "@/lib/brandRole";
import { enforceLimits } from "@/lib/rateLimit-upstash";

const VALID_CUID = "ckznz0e7n0000abcdefghijklm";

const validChart = {
  brandId: VALID_CUID,
  category: "tops",
  chartJson: { sizes: [{ label: "S", chest: [82, 88] }] },
};

beforeEach(() => {
  vi.clearAllMocks();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
  vi.mocked(enforceLimits).mockResolvedValue({ allowed: true });
  vi.mocked(requireBrandRole).mockResolvedValue({
    ok: true, brandUserId: "bu1", role: "editor",
  });
});

// ─── GET /api/size-charts ────────────────────────────────────────────────────

describe("GET /api/size-charts", () => {
  const req = (q: string) => new NextRequest(`http://localhost:3000/api/size-charts?${q}`);

  it("401 when unauthed", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(req(`brandId=${VALID_CUID}`));
    expect(res.status).toBe(401);
  });

  it("400 when brandId is not a cuid", async () => {
    const res = await GET(req("brandId=nope"));
    expect(res.status).toBe(400);
    expect(vi.mocked(db.sizeChart.findMany)).not.toHaveBeenCalled();
  });

  it("403 without read role", async () => {
    vi.mocked(requireBrandRole).mockResolvedValue({
      ok: false, status: 403, reason: "no membership",
    });
    const res = await GET(req(`brandId=${VALID_CUID}`));
    expect(res.status).toBe(403);
  });

  it("happy path: returns sorted charts and total", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.sizeChart.findMany).mockResolvedValue([
      { id: "c1", category: "bottoms" },
      { id: "c2", category: "tops" },
    ] as any);
    const res = await GET(req(`brandId=${VALID_CUID}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.items).toHaveLength(2);
    expect(json.data.total).toBe(2);
    // sorting handled by Prisma orderBy — assert we asked for it
    expect(vi.mocked(db.sizeChart.findMany).mock.calls[0]![0]?.orderBy).toEqual({
      category: "asc",
    });
  });
});

// ─── POST /api/size-charts ───────────────────────────────────────────────────

describe("POST /api/size-charts", () => {
  const postReq = (body: unknown) =>
    new NextRequest("http://localhost:3000/api/size-charts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  it("401 unauthed", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(postReq(validChart));
    expect(res.status).toBe(401);
  });

  it("429 rate-limited", async () => {
    vi.mocked(enforceLimits).mockResolvedValue({ allowed: false, retryAfterSeconds: 5 });
    const res = await POST(postReq(validChart));
    expect(res.status).toBe(429);
    expect(vi.mocked(db.sizeChart.create)).not.toHaveBeenCalled();
  });

  it("400: Zod strict rejects unknown keys", async () => {
    const res = await POST(postReq({ ...validChart, isActive: true }));
    expect(res.status).toBe(400);
  });

  it("400: rejects gender outside the enum", async () => {
    const res = await POST(postReq({ ...validChart, gender: "other" }));
    expect(res.status).toBe(400);
  });

  it("400: rejects empty category", async () => {
    const res = await POST(postReq({ ...validChart, category: "" }));
    expect(res.status).toBe(400);
  });

  it("403 without write role", async () => {
    vi.mocked(requireBrandRole).mockResolvedValue({
      ok: false, status: 403, reason: "viewer cannot write",
    });
    const res = await POST(postReq(validChart));
    expect(res.status).toBe(403);
    expect(vi.mocked(db.sizeChart.create)).not.toHaveBeenCalled();
  });

  it("201: creates the chart with gender defaulting to null when omitted", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.sizeChart.create).mockResolvedValue({ id: "c_new" } as any);
    const res = await POST(postReq(validChart));
    expect(res.status).toBe(201);
    expect(vi.mocked(db.sizeChart.create)).toHaveBeenCalledWith({
      data: expect.objectContaining({
        brandId: VALID_CUID,
        category: "tops",
        gender: null,
      }),
    });
  });

  it("201: forwards gender when provided", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.sizeChart.create).mockResolvedValue({ id: "c_new" } as any);
    await POST(postReq({ ...validChart, gender: "female" }));
    expect(vi.mocked(db.sizeChart.create).mock.calls[0]![0]?.data).toMatchObject({
      gender: "female",
    });
  });
});
