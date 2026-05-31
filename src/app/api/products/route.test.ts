import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    product: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
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
  tooManyRequests: vi.fn((s?: number) =>
    new Response(JSON.stringify({ success: false, error: { message: "Too many" } }), {
      status: 429,
      headers: s ? { "retry-after": String(s) } : undefined,
    }),
  ),
}));

// Imports AFTER mocks
import { GET, POST } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireBrandRole } from "@/lib/brandRole";
import { enforceLimits } from "@/lib/rateLimit-upstash";

const BRAND_ID = "cuid_brand_xxxxxxxxxxxxxxxxxxxxx"; // 25 chars, c-prefixed below
const VALID_CUID = "ckznz0e7n0000abcdefghijklm";

beforeEach(() => {
  vi.clearAllMocks();
  // Happy-path defaults: signed in, rate-OK, role-OK.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
  vi.mocked(enforceLimits).mockResolvedValue({ allowed: true });
  vi.mocked(requireBrandRole).mockResolvedValue({
    ok: true,
    brandUserId: "bu1",
    role: "editor",
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/products", () => {
  function getReq(query: string) {
    return new NextRequest(`http://localhost:3000/api/products?${query}`);
  }

  it("returns 401 when unauthed", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(getReq(`brandId=${VALID_CUID}`));
    expect(res.status).toBe(401);
  });

  it("rejects an invalid brandId via Zod (cuid required)", async () => {
    const res = await GET(getReq("brandId=not-a-cuid"));
    expect(res.status).toBe(400);
    // Crucial: must not reach the DB if the query is malformed.
    expect(vi.mocked(db.product.findMany)).not.toHaveBeenCalled();
  });

  it("returns 403 when the user has no read role on the brand", async () => {
    vi.mocked(requireBrandRole).mockResolvedValue({
      ok: false,
      status: 403,
      reason: "not a member",
    });
    const res = await GET(getReq(`brandId=${VALID_CUID}`));
    expect(res.status).toBe(403);
    expect(vi.mocked(db.product.findMany)).not.toHaveBeenCalled();
  });

  it("returns the paginated list on happy path", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.product.findMany).mockResolvedValue([{ id: "p1", name: "Tee" }] as any);
    vi.mocked(db.product.count).mockResolvedValue(1);

    const res = await GET(getReq(`brandId=${VALID_CUID}&page=1&pageSize=20`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.items).toHaveLength(1);
    expect(json.data.total).toBe(1);
    expect(json.data.page).toBe(1);
    expect(json.data.pageSize).toBe(20);
    expect(json.data.totalPages).toBe(1);
  });

  it("forwards search to Prisma as a case-insensitive OR across name/category/externalId", async () => {
    vi.mocked(db.product.findMany).mockResolvedValue([]);
    vi.mocked(db.product.count).mockResolvedValue(0);
    await GET(getReq(`brandId=${VALID_CUID}&search=tee`));
    const callArgs = vi.mocked(db.product.findMany).mock.calls[0]![0]!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where = (callArgs.where as any);
    expect(where.brandId).toBe(VALID_CUID);
    expect(where.OR).toEqual([
      { name: { contains: "tee", mode: "insensitive" } },
      { category: { contains: "tee", mode: "insensitive" } },
      { externalId: { contains: "tee", mode: "insensitive" } },
    ]);
  });

  it("rejects pageSize above 100 (anti-DOS)", async () => {
    const res = await GET(getReq(`brandId=${VALID_CUID}&pageSize=10000`));
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/products
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/products", () => {
  function postReq(body: unknown) {
    return new NextRequest("http://localhost:3000/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const validBody = {
    brandId: VALID_CUID,
    name: "Linen Shirt",
  };

  it("returns 401 when unauthed", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate-limited (per-user write quota)", async () => {
    vi.mocked(enforceLimits).mockResolvedValue({ allowed: false, retryAfterSeconds: 30 });
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(429);
    // Must NOT reach validation/DB once rate-limited.
    expect(vi.mocked(db.product.create)).not.toHaveBeenCalled();
  });

  it("Zod strict: rejects unknown fields (anti-mass-assignment)", async () => {
    const res = await POST(
      postReq({ ...validBody, isActive: true, brandPlan: "premier" }),
    );
    expect(res.status).toBe(400);
    expect(vi.mocked(db.product.create)).not.toHaveBeenCalled();
  });

  it("rejects name longer than 200 chars (anti-injection / abuse)", async () => {
    const res = await POST(postReq({ ...validBody, name: "x".repeat(201) }));
    expect(res.status).toBe(400);
  });

  it("returns 403 when caller has only viewer role (ROLES_WRITE required)", async () => {
    vi.mocked(requireBrandRole).mockResolvedValue({
      ok: false,
      status: 403,
      reason: "viewer cannot write",
    });
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(403);
    expect(vi.mocked(db.product.create)).not.toHaveBeenCalled();
  });

  it("creates the product and returns 201 with the row on happy path", async () => {
    vi.mocked(db.product.create).mockResolvedValue({
      id: "p_new",
      name: "Linen Shirt",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.id).toBe("p_new");
    expect(vi.mocked(db.product.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          brandId: VALID_CUID,
          name: "Linen Shirt",
          imageUrl: null, // empty string → null normalisation
          tags: [],
        }),
      }),
    );
  });
});
