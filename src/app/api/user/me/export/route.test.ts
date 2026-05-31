import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn() },
    legalAcceptance: { findMany: vi.fn() },
    bodyProfile: { findMany: vi.fn() },
    recommendationSession: { findMany: vi.fn() },
    subscription: { findUnique: vi.fn() },
    brandUser: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/rateLimit-upstash", () => ({
  LIMITS: { brand_writes: () => null },
  enforceLimits: vi.fn(),
  tooManyRequests: vi.fn(() => new Response(null, { status: 429 })),
}));

import { GET } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforceLimits } from "@/lib/rateLimit-upstash";

beforeEach(() => {
  vi.clearAllMocks();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
  vi.mocked(enforceLimits).mockResolvedValue({ allowed: true });
  // Default: empty arrays / null
  vi.mocked(db.user.findUnique).mockResolvedValue({
    id: "u1", email: "u@x.com", name: "Alice",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  vi.mocked(db.legalAcceptance.findMany).mockResolvedValue([]);
  vi.mocked(db.bodyProfile.findMany).mockResolvedValue([]);
  vi.mocked(db.recommendationSession.findMany).mockResolvedValue([]);
  vi.mocked(db.subscription.findUnique).mockResolvedValue(null);
  vi.mocked(db.brandUser.findMany).mockResolvedValue([]);
});

describe("GET /api/user/me/export", () => {
  it("401 when unauthed", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("429 when over the export rate limit (anti-scrape)", async () => {
    vi.mocked(enforceLimits).mockResolvedValue({ allowed: false, retryAfterSeconds: 30 });
    const res = await GET();
    expect(res.status).toBe(429);
    expect(vi.mocked(db.user.findUnique)).not.toHaveBeenCalled();
  });

  it("rate-limit key is keyed on user.id:export (separate bucket from other writes)", async () => {
    vi.mocked(enforceLimits).mockResolvedValue({ allowed: false, retryAfterSeconds: 1 });
    await GET();
    expect(vi.mocked(enforceLimits).mock.calls[0]![0]).toBe("u:u1:export");
  });

  it("returns application/json with a download disposition + no-store cache", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    const cd = res.headers.get("content-disposition") ?? "";
    expect(cd).toMatch(/attachment/);
    expect(cd).toMatch(/aplomb-data-export-\d{4}-\d{2}-\d{2}\.json/);
    expect(res.headers.get("cache-control")).toMatch(/no-store/);
  });

  it("the payload includes the user, legal acceptances, body profiles, sessions, subscription, brand memberships", async () => {
    vi.mocked(db.legalAcceptance.findMany).mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { documentType: "terms", documentVersion: "1.0", acceptedAt: new Date() } as any,
    ]);
    vi.mocked(db.bodyProfile.findMany).mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: "bp1", frontImagePath: "scans/x/front.jpg" } as any,
    ]);
    vi.mocked(db.brandUser.findMany).mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { role: "owner", brand: { slug: "acme", name: "Acme" } } as any,
    ]);

    const res = await GET();
    const body = await res.json();
    expect(body.user.email).toBe("u@x.com");
    expect(body.legalAcceptances).toHaveLength(1);
    expect(body.bodyProfiles).toHaveLength(1);
    expect(body.brandMemberships).toHaveLength(1);
    expect(body.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof body.notice).toBe("string");
  });

  it("the user object excludes hashedPassword (server-only field)", async () => {
    const res = await GET();
    await res.json();
    // The select clause governs the shape. Verify hashedPassword isn't requested.
    const selectArg = vi.mocked(db.user.findUnique).mock.calls[0]![0]!.select;
    expect((selectArg as Record<string, unknown>).hashedPassword).toBeUndefined();
  });

  it("includes the frontImagePath in the export but warns it's a reference, not the photo itself", async () => {
    vi.mocked(db.bodyProfile.findMany).mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: "bp1", frontImagePath: "scans/x/front.jpg", sideImagePath: "scans/x/side.jpg" } as any,
    ]);
    const res = await GET();
    const body = await res.json();
    expect(body.bodyProfiles[0].frontImagePath).toBe("scans/x/front.jpg");
    // The notice MUST mention that photos themselves aren't included.
    expect(body.notice).toMatch(/photos themselves are not included/i);
  });
});
