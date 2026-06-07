import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    enterpriseEnquiry: { create: vi.fn() },
  },
}));
vi.mock("@/lib/rateLimit-upstash", () => ({
  LIMITS: { signup_window: () => null, signup_daily: () => null },
  enforceLimits: vi.fn(),
  tooManyRequests: vi.fn(() => new Response(null, { status: 429 })),
  clientIp: vi.fn(() => "203.0.113.7"),
}));
vi.mock("@/lib/security/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
}));

import { POST } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforceLimits } from "@/lib/rateLimit-upstash";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

function req(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/enquiry/enterprise", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "TestUA/1.0" },
    body: JSON.stringify(body),
  });
}

const valid = {
  name: "Isabelle",
  email: "isabelle@brand.com",
  company: "Atelier Verdú",
  message: "Curious about Premier — catalogue of 200 products, EU shipping.",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(enforceLimits).mockResolvedValue({ allowed: true });
  vi.mocked(auth).mockResolvedValue(null as never);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(db.enterpriseEnquiry.create).mockResolvedValue({ id: "ent_1" } as any);
  // Default: Turnstile passes. Specific tests override to test rejection.
  vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: true });
});

describe("POST /api/enquiry/enterprise", () => {
  it("202 on happy anonymous path; persists with null userId + IP + UA", async () => {
    const res = await POST(req(valid));
    expect(res.status).toBe(202);

    const args = vi.mocked(db.enterpriseEnquiry.create).mock.calls[0]![0]!.data;
    expect(args).toMatchObject({
      userId: null,
      name: "Isabelle",
      email: "isabelle@brand.com",
      company: "Atelier Verdú",
      ipAddress: "203.0.113.7",
      userAgent: "TestUA/1.0",
    });
  });

  it("captures userId when an authenticated session is present", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValue({ user: { id: "u_42" } } as any);
    const res = await POST(req(valid));
    expect(res.status).toBe(202);
    const args = vi.mocked(db.enterpriseEnquiry.create).mock.calls[0]![0]!.data;
    expect(args.userId).toBe("u_42");
  });

  it("429 when rate-limited — never reaches the DB", async () => {
    vi.mocked(enforceLimits).mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 60,
    });
    const res = await POST(req(valid));
    expect(res.status).toBe(429);
    expect(vi.mocked(db.enterpriseEnquiry.create)).not.toHaveBeenCalled();
  });

  it("400 on missing required field", async () => {
    const res = await POST(req({ ...valid, email: undefined }));
    expect(res.status).toBe(400);
    expect(vi.mocked(db.enterpriseEnquiry.create)).not.toHaveBeenCalled();
  });

  it("400 on invalid email", async () => {
    const res = await POST(req({ ...valid, email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("400 with .strict() rejecting unknown fields (anti-mass-assignment)", async () => {
    const res = await POST(req({ ...valid, isAdmin: true }));
    expect(res.status).toBe(400);
    expect(vi.mocked(db.enterpriseEnquiry.create)).not.toHaveBeenCalled();
  });

  it("400 when message exceeds the 4000-char cap", async () => {
    const res = await POST(req({ ...valid, message: "x".repeat(4001) }));
    expect(res.status).toBe(400);
  });

  it("403 TURNSTILE_FAILED when the captcha rejects — never reaches the DB", async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue({
      success: false,
      errorCodes: ["invalid-input-response"],
    });
    const res = await POST(req({ ...valid, turnstileToken: "tampered" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("TURNSTILE_FAILED");
    expect(vi.mocked(db.enterpriseEnquiry.create)).not.toHaveBeenCalled();
  });

  it("passes the submitted Turnstile token to verifyTurnstileToken with the client IP", async () => {
    await POST(req({ ...valid, turnstileToken: "good-token" }));
    expect(vi.mocked(verifyTurnstileToken)).toHaveBeenCalledWith(
      "good-token",
      "203.0.113.7",
    );
  });

  it("happy path still works when no token is submitted (Turnstile not configured in env)", async () => {
    // verifyTurnstileToken returns { success: true, skipped: true } when no
    // secret is set — simulate that here. Server should accept the enquiry.
    vi.mocked(verifyTurnstileToken).mockResolvedValue({
      success: true,
      skipped: true,
    });
    const res = await POST(req(valid)); // no turnstileToken field
    expect(res.status).toBe(202);
    expect(vi.mocked(db.enterpriseEnquiry.create)).toHaveBeenCalled();
  });
});
