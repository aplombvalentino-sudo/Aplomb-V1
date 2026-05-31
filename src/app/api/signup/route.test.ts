import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks (hoisted by vitest before imports below) ───────────────────────────

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      admin: { deleteUser: vi.fn() },
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: { $transaction: vi.fn() },
}));

vi.mock("@/lib/rateLimit-upstash", () => ({
  // LIMITS values are not introspected by the route — just need callable shape.
  LIMITS: { signup_window: () => null, signup_daily: () => null },
  enforceLimits: vi.fn(),
  tooManyRequests: vi.fn(),
  clientIp: vi.fn(),
}));

vi.mock("@/lib/security/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
}));

// Imports AFTER vi.mock so the mocks resolve. The real `ok`/`err`/`parseJsonBody`
// and the real `CURRENT_*_VERSION` constants are used — we want to assert on
// the actual response envelope and the actual versions stamped on rows.
import { POST } from "./route";
import { supabase } from "@/lib/supabase";
import { db } from "@/lib/db";
import { enforceLimits, clientIp } from "@/lib/rateLimit-upstash";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
} from "@/lib/legal/legalVersions";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/signup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "vitest-ua",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test User",
    email: "test@example.com",
    password: "supersecret",
    acceptTerms: true,
    acceptPrivacy: true,
    ...overrides,
  };
}

// Per-test mutable mock of the Prisma transaction client.
const tx = {
  user: { upsert: vi.fn() },
  legalAcceptance: { createMany: vi.fn() },
  brand: { findUnique: vi.fn(), create: vi.fn() },
  brandUser: { create: vi.fn() },
};

beforeEach(() => {
  vi.clearAllMocks();
  // Defaults: rate-limit allows; ip resolves; Turnstile passes (skipped path).
  vi.mocked(enforceLimits).mockResolvedValue({ allowed: true });
  vi.mocked(clientIp).mockReturnValue("1.2.3.4");
  vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: true, skipped: true });
  // $transaction executes the callback against our tx mock.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(db.$transaction).mockImplementation(async (cb: any) => cb(tx));
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/signup — clickwrap gate (runs BEFORE any I/O)", () => {
  it("rejects with 400 LEGAL_NOT_ACCEPTED when acceptTerms is false, and never touches Supabase", async () => {
    const res = await POST(makeReq(validBody({ acceptTerms: false })));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("LEGAL_NOT_ACCEPTED");
    // The gate must fire before account creation.
    expect(vi.mocked(supabase.auth.signUp)).not.toHaveBeenCalled();
    expect(vi.mocked(db.$transaction)).not.toHaveBeenCalled();
  });

  it("rejects with 400 LEGAL_NOT_ACCEPTED when acceptPrivacy is false", async () => {
    const res = await POST(makeReq(validBody({ acceptPrivacy: false })));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("LEGAL_NOT_ACCEPTED");
  });
});

describe("POST /api/signup — Turnstile gate", () => {
  it("rejects with 403 TURNSTILE_FAILED on captcha failure and never creates an account", async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue({
      success: false,
      errorCodes: ["missing-input-response"],
    });
    const res = await POST(makeReq(validBody()));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("TURNSTILE_FAILED");
    expect(vi.mocked(supabase.auth.signUp)).not.toHaveBeenCalled();
    expect(vi.mocked(db.$transaction)).not.toHaveBeenCalled();
  });
});

describe("POST /api/signup — happy path (client account)", () => {
  it("returns 201, creates user, and records BOTH legal acceptances at current versions", async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { user: { id: "supabase-user-id" } } as any,
      error: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    tx.user.upsert.mockResolvedValue({
      id: "supabase-user-id",
      email: "test@example.com",
      name: "Test User",
    });
    tx.legalAcceptance.createMany.mockResolvedValue({ count: 2 });

    const res = await POST(makeReq(validBody()));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.user.id).toBe("supabase-user-id");
    expect(json.data.brand).toBeNull();

    // The whole point of A3: prove the audit-trail rows are written with the
    // server-chosen current versions + the captured ip/user-agent.
    expect(tx.legalAcceptance.createMany).toHaveBeenCalledTimes(1);
    const arg = tx.legalAcceptance.createMany.mock.calls[0][0];
    expect(arg.data).toHaveLength(2);
    expect(arg.data[0]).toMatchObject({
      userId: "supabase-user-id",
      documentType: "terms",
      documentVersion: CURRENT_TERMS_VERSION,
      ipAddress: "1.2.3.4",
      userAgent: "vitest-ua",
    });
    expect(arg.data[1]).toMatchObject({
      userId: "supabase-user-id",
      documentType: "privacy",
      documentVersion: CURRENT_PRIVACY_VERSION,
      ipAddress: "1.2.3.4",
      userAgent: "vitest-ua",
    });

    // No brand artefacts created for a client account.
    expect(tx.brand.create).not.toHaveBeenCalled();
    expect(tx.brandUser.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/signup — happy path (brand account)", () => {
  it("also creates Brand + BrandUser with role 'owner' when brandName is provided", async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { user: { id: "supabase-user-id" } } as any,
      error: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    tx.user.upsert.mockResolvedValue({
      id: "supabase-user-id",
      email: "owner@brand.com",
      name: "Owner",
    });
    tx.legalAcceptance.createMany.mockResolvedValue({ count: 2 });
    tx.brand.findUnique.mockResolvedValue(null); // slug "atelier" is free
    tx.brand.create.mockResolvedValue({ id: "brand-id", name: "Atelier", slug: "atelier" });
    tx.brandUser.create.mockResolvedValue({});

    const res = await POST(
      makeReq(
        validBody({ email: "owner@brand.com", name: "Owner", brandName: "Atelier" }),
      ),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.brand).toMatchObject({ id: "brand-id", slug: "atelier" });

    expect(tx.brand.create).toHaveBeenCalledTimes(1);
    expect(tx.brandUser.create).toHaveBeenCalledTimes(1);
    expect(tx.brandUser.create.mock.calls[0][0].data).toMatchObject({
      userId: "supabase-user-id",
      brandId: "brand-id",
      role: "owner",
    });
  });
});
