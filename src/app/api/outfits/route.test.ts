import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    recommendationSession: { findUnique: vi.fn() },
    outfit: { create: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb({
      outfit: { create: vi.fn() },
    })),
  },
}));
vi.mock("@/lib/ownership", () => ({ authorizeSession: vi.fn() }));
vi.mock("@/lib/rateLimit-upstash", () => ({
  LIMITS: { ai_daily: () => null, ai_minute: () => null },
  enforceLimits: vi.fn(),
  tooManyRequests: vi.fn(() => new Response(null, { status: 429 })),
}));
vi.mock("@/lib/ai/gemini/outfits", () => ({
  generateOutfitsWithGemini: vi.fn(),
}));

import { POST } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorizeSession } from "@/lib/ownership";
import { enforceLimits } from "@/lib/rateLimit-upstash";
import { generateOutfitsWithGemini } from "@/lib/ai/gemini/outfits";

const SESSION_ID = "ckznz0e7n0000abcdefghijklm";

const validBody = {
  brandSlug: "acme",
  recommendationSessionId: SESSION_ID,
};

const makeReq = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/outfits", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
  vi.mocked(authorizeSession).mockResolvedValue({
    ok: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session: { id: SESSION_ID } as any,
  });
  vi.mocked(enforceLimits).mockResolvedValue({ allowed: true });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/outfits", () => {
  it("400: rejects malformed brand slug (must match the slug regex)", async () => {
    const res = await POST(makeReq({ ...validBody, brandSlug: "BAD slug!" }));
    expect(res.status).toBe(400);
    expect(vi.mocked(authorizeSession)).not.toHaveBeenCalled();
  });

  it("400: Zod strict rejects unknown fields (e.g. brandId injection attempt)", async () => {
    const res = await POST(makeReq({ ...validBody, brandId: "ckxxx" }));
    expect(res.status).toBe(400);
  });

  it("CRITICAL: authorizeSession runs BEFORE the rate-limit check", async () => {
    // Otherwise attackers probe ownership status by exhausting rate-limit credits.
    vi.mocked(authorizeSession).mockResolvedValue({
      ok: false,
      status: 403,
      reason: "not your session",
    });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(403);
    expect(vi.mocked(enforceLimits)).not.toHaveBeenCalled();
    expect(vi.mocked(db.recommendationSession.findUnique)).not.toHaveBeenCalled();
  });

  it("401 surfaces from authorizeSession when no auth + no cookie", async () => {
    vi.mocked(authorizeSession).mockResolvedValue({
      ok: false, status: 401, reason: "missing cookie",
    });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(401);
  });

  it("429 when over rate limit (after ownership passes)", async () => {
    vi.mocked(enforceLimits).mockResolvedValue({ allowed: false, retryAfterSeconds: 60 });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(429);
    expect(vi.mocked(generateOutfitsWithGemini)).not.toHaveBeenCalled();
  });

  it("anonymous rate-limit key falls back to rs:<sessionId> when not signed in", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    vi.mocked(enforceLimits).mockResolvedValue({ allowed: false, retryAfterSeconds: 1 });
    await POST(makeReq(validBody));
    expect(vi.mocked(enforceLimits).mock.calls[0]![0]).toBe(`rs:${SESSION_ID}`);
  });

  it("signed-in rate-limit key uses user.id", async () => {
    vi.mocked(enforceLimits).mockResolvedValue({ allowed: false, retryAfterSeconds: 1 });
    await POST(makeReq(validBody));
    expect(vi.mocked(enforceLimits).mock.calls[0]![0]).toBe("u1");
  });

  it("404 when the session's brand slug doesn't match the requested slug (cross-brand poke)", async () => {
    vi.mocked(db.recommendationSession.findUnique).mockResolvedValue({
      id: SESSION_ID,
      bodyProfile: { rawMeasurementsJson: {} },
      brand: { slug: "OTHER-BRAND", name: "Other", products: [{ id: "p1" }] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(404);
  });

  it("400 EMPTY_CATALOG when the brand has no active products", async () => {
    vi.mocked(db.recommendationSession.findUnique).mockResolvedValue({
      id: SESSION_ID,
      bodyProfile: { rawMeasurementsJson: {} },
      brand: { slug: "acme", name: "Acme", products: [] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("EMPTY_CATALOG");
  });

  it("400 MISSING_BODY_PROFILE when the session has no measurements", async () => {
    vi.mocked(db.recommendationSession.findUnique).mockResolvedValue({
      id: SESSION_ID,
      bodyProfile: null,
      brand: { slug: "acme", name: "Acme", products: [{ id: "p1", variants: [] }] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("MISSING_BODY_PROFILE");
  });

  it("500 surfaces the AI provider message when Gemini throws (caught + sanitised)", async () => {
    vi.mocked(db.recommendationSession.findUnique).mockResolvedValue({
      id: SESSION_ID,
      bodyProfile: { rawMeasurementsJson: { heightCm: 170 } },
      brand: { slug: "acme", name: "Acme", products: [{ id: "p1", variants: [] }] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(generateOutfitsWithGemini).mockRejectedValue(new Error("Gemini quota exceeded"));
    // Silence the console.error noise from the route's catch handler
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(500);
    spy.mockRestore();
  });
});
