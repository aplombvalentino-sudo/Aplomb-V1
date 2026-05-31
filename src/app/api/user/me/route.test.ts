import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("@/lib/userErasure", () => ({ eraseUser: vi.fn() }));
vi.mock("@/lib/rateLimit-upstash", () => ({
  LIMITS: { brand_writes: () => null },
  enforceLimits: vi.fn(),
  tooManyRequests: vi.fn(() =>
    new Response(JSON.stringify({ success: false, error: { message: "Too many" } }), {
      status: 429,
    }),
  ),
}));

import { GET, PATCH, DELETE } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eraseUser } from "@/lib/userErasure";
import { enforceLimits } from "@/lib/rateLimit-upstash";

beforeEach(() => {
  vi.clearAllMocks();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
  vi.mocked(enforceLimits).mockResolvedValue({ allowed: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/user/me
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/user/me", () => {
  it("returns 401 when unauthed", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 404 when the user row is missing (orphan auth)", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns the user profile + counts on happy path", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "u1",
      email: "u1@example.com",
      name: "Alice",
      image: null,
      clientPlan: "essential",
      createdAt: new Date("2025-01-01"),
      _count: { bodyProfiles: 2, recommendationSessions: 5, legalAcceptances: 2 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.user.email).toBe("u1@example.com");
    expect(json.data.user._count.bodyProfiles).toBe(2);
  });

  it("Zod-restricted SELECT — hashedPassword and stripeCustomerId never appear in the read", async () => {
    // The select clause must not include sensitive fields. Verify the
    // Prisma call args, which is what gates the return shape.
    vi.mocked(db.user.findUnique).mockResolvedValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    await GET();
    const selectArg = vi.mocked(db.user.findUnique).mock.calls[0]![0]!.select;
    expect(selectArg).toBeDefined();
    expect((selectArg as Record<string, unknown>).hashedPassword).toBeUndefined();
    expect((selectArg as Record<string, unknown>).stripeCustomerId).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/user/me
// ─────────────────────────────────────────────────────────────────────────────

describe("PATCH /api/user/me", () => {
  function patchReq(body: unknown) {
    return new NextRequest("http://localhost:3000/api/user/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401 when unauthed", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await PATCH(patchReq({ name: "Bob" }));
    expect(res.status).toBe(401);
  });

  it("429 when over the per-user rate limit", async () => {
    vi.mocked(enforceLimits).mockResolvedValue({ allowed: false, retryAfterSeconds: 30 });
    const res = await PATCH(patchReq({ name: "Bob" }));
    expect(res.status).toBe(429);
    expect(vi.mocked(db.user.update)).not.toHaveBeenCalled();
  });

  it("Zod strict rejects unknown fields (anti-mass-assignment on User row)", async () => {
    // The CRITICAL test: someone trying to set their own clientPlan or
    // stripeCustomerId via PATCH must be rejected by the strict schema.
    const res = await PATCH(
      patchReq({ name: "Bob", clientPlan: "model", stripeCustomerId: "cus_evil" }),
    );
    expect(res.status).toBe(400);
    expect(vi.mocked(db.user.update)).not.toHaveBeenCalled();
  });

  it("rejects empty name (min length 1)", async () => {
    const res = await PATCH(patchReq({ name: "" }));
    expect(res.status).toBe(400);
  });

  it("rejects name longer than 120 chars", async () => {
    const res = await PATCH(patchReq({ name: "x".repeat(121) }));
    expect(res.status).toBe(400);
  });

  it("empty body returns current user without touching the DB (no-op)", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "u1", name: "Existing", email: "u@x.com",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const res = await PATCH(patchReq({}));
    expect(res.status).toBe(200);
    expect(vi.mocked(db.user.update)).not.toHaveBeenCalled();
  });

  it("happy path: updates name only and returns the row", async () => {
    vi.mocked(db.user.update).mockResolvedValue({
      id: "u1", name: "Bob", email: "u1@example.com",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const res = await PATCH(patchReq({ name: "Bob" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.user.name).toBe("Bob");
    // Verify ONLY name is in the data payload — no smuggling.
    expect(vi.mocked(db.user.update).mock.calls[0]![0].data).toEqual({ name: "Bob" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/user/me — Art 17 erasure
// ─────────────────────────────────────────────────────────────────────────────

describe("DELETE /api/user/me", () => {
  it("401 when unauthed", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await DELETE();
    expect(res.status).toBe(401);
    expect(vi.mocked(eraseUser)).not.toHaveBeenCalled();
  });

  it("429 when over the erase rate limit (anti-replay)", async () => {
    vi.mocked(enforceLimits).mockResolvedValue({ allowed: false, retryAfterSeconds: 10 });
    const res = await DELETE();
    expect(res.status).toBe(429);
    expect(vi.mocked(eraseUser)).not.toHaveBeenCalled();
  });

  it("happy path: calls eraseUser and returns photo + profile counts", async () => {
    vi.mocked(eraseUser).mockResolvedValue({
      ok: true,
      deletedPhotos: 4,
      deletedProfiles: 2,
    });
    const res = await DELETE();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual({ deleted: true, photosRemoved: 4, profilesRemoved: 2 });
    expect(vi.mocked(eraseUser)).toHaveBeenCalledWith("u1");
  });

  it("409 BRAND_OWNER when the user is the sole owner of a brand (cannot orphan)", async () => {
    vi.mocked(eraseUser).mockResolvedValue({
      ok: false,
      reason: "sole-owner",
      brands: ["acme", "verdu"],
    });
    const res = await DELETE();
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("BRAND_OWNER");
    expect(json.error.message).toMatch(/acme/);
    expect(json.error.message).toMatch(/verdu/);
  });

  it("404 when the user row already vanished (race)", async () => {
    vi.mocked(eraseUser).mockResolvedValue({ ok: false, reason: "not-found" });
    const res = await DELETE();
    expect(res.status).toBe(404);
  });

  it("rate-limit key is keyed on user.id:erase (separate bucket from PATCH writes)", async () => {
    vi.mocked(eraseUser).mockResolvedValue({ ok: true, deletedPhotos: 0, deletedProfiles: 0 });
    await DELETE();
    expect(vi.mocked(enforceLimits).mock.calls[0]![0]).toBe("u:u1:erase");
  });
});
