import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    brand: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/rateLimit-upstash", () => ({
  LIMITS: { measurements_day: () => null, measurements_min: () => null },
  enforceLimits: vi.fn(),
  tooManyRequests: vi.fn((s?: number) =>
    new Response(null, {
      status: 429,
      headers: s ? { "retry-after": String(s) } : undefined,
    }),
  ),
  clientIp: vi.fn(() => "203.0.113.7"),
}));

vi.mock("@/lib/ai/measurementProvider", () => ({
  runMeasurement: vi.fn(),
  buildBodyShapeSummary: vi.fn(() => "athletic"),
}));

vi.mock("@/lib/ai/sizing/recommendSizes", () => ({
  recommendSizes: vi.fn(() => []),
}));

vi.mock("@/lib/ai/storage", () => ({
  uploadBodyScan: vi.fn(),
  getSignedBodyScanUrl: vi.fn(async (p: string) => `https://signed/${p}`),
  buildScanPath: vi.fn((sid: string, side: string, mime: string) =>
    `private/${sid}/${side}.${mime.split("/")[1]}`,
  ),
}));

vi.mock("@/lib/sessionToken", () => ({
  newSessionToken: vi.fn(() => ({ token: "plain-token-abc", hash: "hash-of-abc" })),
  SESSION_TOKEN_COOKIE: "aplomb_session",
  sessionTokenCookieOptions: vi.fn(() => ({
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })),
}));

// Imports AFTER mocks
import { POST } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforceLimits } from "@/lib/rateLimit-upstash";
import { runMeasurement } from "@/lib/ai/measurementProvider";
import { uploadBodyScan } from "@/lib/ai/storage";
import { newSessionToken } from "@/lib/sessionToken";

// ── Helpers ──────────────────────────────────────────────────────────────────

function jpegFile(name = "x.jpg", size = 1024): File {
  // Construct a File with the requested byte size. Buffer of `size` zeros.
  const buf = new Uint8Array(size);
  return new File([buf], name, { type: "image/jpeg" });
}

function makeReq(form: FormData) {
  return new NextRequest("http://localhost:3000/api/measurements", {
    method: "POST",
    body: form,
  });
}

function validForm(overrides: Record<string, string | File> = {}) {
  const f = new FormData();
  f.set("brandSlug", "acme");
  f.set("measurementMode", "easy");
  f.set("heightCm", "170");
  f.set("weightKg", "65");
  f.set("frontImage", jpegFile("front.jpg"));
  f.set("sideImage", jpegFile("side.jpg"));
  for (const [k, v] of Object.entries(overrides)) f.set(k, v);
  return f;
}

// ── Default mock setup (happy-path-ready) ────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(enforceLimits).mockResolvedValue({ allowed: true });
  vi.mocked(auth).mockResolvedValue(null as never); // anonymous by default
  vi.mocked(db.brand.findUnique).mockResolvedValue({
    id: "b1",
    slug: "acme",
    sizeCharts: [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  vi.mocked(runMeasurement).mockResolvedValue({
    measurementMode: "easy",
    sourceConfidence: { chest: "ai", waist: "ai", hips: "ai", shoulders: "ai", inseam: "ai" },
    heightCm: 170,
    weightKg: 65,
    chestCm: 92,
    waistCm: 76,
    hipsCm: 98,
    providerName: "stub",
    rawProviderResponse: { secret: "this-must-NOT-leak" },
  });
  vi.mocked(db.$transaction).mockImplementation(async (cb: unknown) => {
    if (typeof cb === "function") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return [
        { id: "bp_new" },
        { id: "rs_new" },
      ] as any;
    }
    return [];
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting — first line of defence
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/measurements — rate limit", () => {
  it("429 when over the IP-keyed limit (anonymous can't be keyed by user.id yet)", async () => {
    vi.mocked(enforceLimits).mockResolvedValue({ allowed: false, retryAfterSeconds: 600 });
    const res = await POST(makeReq(validForm()));
    expect(res.status).toBe(429);
    // Must NOT reach upload or AI provider once rate-limited.
    expect(vi.mocked(uploadBodyScan)).not.toHaveBeenCalled();
    expect(vi.mocked(runMeasurement)).not.toHaveBeenCalled();
  });

  it("rate-limit key is ip:<ip> (not user) — IP is the only stable identity for anonymous shoppers", async () => {
    vi.mocked(enforceLimits).mockResolvedValue({ allowed: false, retryAfterSeconds: 1 });
    await POST(makeReq(validForm()));
    expect(vi.mocked(enforceLimits).mock.calls[0]![0]).toBe("ip:203.0.113.7");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Multipart + Zod validation
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/measurements — validation", () => {
  it("400 INVALID_FORM when body isn't multipart", async () => {
    const res = await POST(
      new NextRequest("http://localhost:3000/api/measurements", {
        method: "POST",
        body: "garbage",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("400 when brand slug fails the regex (no uppercase, no spaces)", async () => {
    const res = await POST(makeReq(validForm({ brandSlug: "BAD slug" })));
    expect(res.status).toBe(400);
  });

  it("400 when heightCm is outside [120, 230] (anti-garbage)", async () => {
    const res = await POST(makeReq(validForm({ heightCm: "500" })));
    expect(res.status).toBe(400);
  });

  it("400 in advanced mode without chest/waist/hips", async () => {
    const res = await POST(
      makeReq(validForm({ measurementMode: "advanced" })),
    );
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Photo handling — size cap, MIME allow-list, private storage
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/measurements — photo gates", () => {
  it("400 when a photo is missing", async () => {
    const f = validForm();
    f.delete("frontImage");
    const res = await POST(makeReq(f));
    expect(res.status).toBe(400);
  });

  it("413 PHOTO_TOO_LARGE when a photo exceeds 8 MB", async () => {
    const tooBig = jpegFile("huge.jpg", 9 * 1024 * 1024);
    const res = await POST(makeReq(validForm({ frontImage: tooBig })));
    expect(res.status).toBe(413);
  });

  it("415 PHOTO_TYPE when a photo isn't jpeg/png/webp", async () => {
    const gif = new File([new Uint8Array(100)], "x.gif", { type: "image/gif" });
    const res = await POST(makeReq(validForm({ frontImage: gif })));
    expect(res.status).toBe(415);
  });

  it("photos are uploaded to the private bucket via uploadBodyScan (NOT returned to client)", async () => {
    const res = await POST(makeReq(validForm()));
    expect(res.status).toBe(200);
    expect(vi.mocked(uploadBodyScan)).toHaveBeenCalledTimes(2);
    const json = await res.json();
    // Crucial: response must NEVER include the photo URLs or paths.
    const jsonStr = JSON.stringify(json);
    expect(jsonStr).not.toMatch(/private\//);
    expect(jsonStr).not.toMatch(/signed\//);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Brand resolution
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/measurements — brand resolution", () => {
  it("404 when the brand slug doesn't exist", async () => {
    vi.mocked(db.brand.findUnique).mockResolvedValue(null);
    const res = await POST(makeReq(validForm()));
    expect(res.status).toBe(404);
    expect(vi.mocked(uploadBodyScan)).not.toHaveBeenCalled();
    expect(vi.mocked(runMeasurement)).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Privacy — raw provider response must not leak
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/measurements — privacy", () => {
  it("strips rawProviderResponse before returning measurements to client", async () => {
    const res = await POST(makeReq(validForm()));
    const json = await res.json();
    expect(json.data.measurements.rawProviderResponse).toBeUndefined();
    expect(JSON.stringify(json)).not.toMatch(/this-must-NOT-leak/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Session token — anonymous vs logged-in
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/measurements — session token policy", () => {
  it("ANONYMOUS: mints a token; HASH goes to DB, PLAINTEXT to cookie + response body", async () => {
    const res = await POST(makeReq(validForm()));
    expect(res.status).toBe(200);
    expect(vi.mocked(newSessionToken)).toHaveBeenCalledTimes(1);

    const json = await res.json();
    expect(json.data.sessionToken).toBe("plain-token-abc");

    // The cookie should carry the plaintext token (browser-side ownership proof).
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("aplomb_session=plain-token-abc");
    expect(setCookie.toLowerCase()).toContain("httponly");

    // The DB-persisted hash must be the HASH, not the plaintext.
    const txCb = vi.mocked(db.$transaction).mock.calls[0]![0] as (tx: unknown) => Promise<unknown>;
    const txMock = {
      bodyProfile: { create: vi.fn().mockResolvedValue({ id: "bp" }) },
      recommendationSession: { create: vi.fn().mockResolvedValue({ id: "rs" }) },
    };
    await txCb(txMock);
    const rsCall = txMock.recommendationSession.create.mock.calls[0]![0]!;
    expect(rsCall.data.ownerTokenHash).toBe("hash-of-abc");
    expect(rsCall.data.ownerTokenHash).not.toBe("plain-token-abc");
  });

  it("LOGGED-IN: no token minted; sessionToken in response is null; no cookie set", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValue({ user: { id: "u_logged_in" } } as any);
    const res = await POST(makeReq(validForm()));
    expect(res.status).toBe(200);
    expect(vi.mocked(newSessionToken)).not.toHaveBeenCalled();

    const json = await res.json();
    expect(json.data.sessionToken).toBeNull();

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).not.toContain("aplomb_session=");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Happy path
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/measurements — happy path output shape", () => {
  it("200 returns { bodyProfileId, recommendationSessionId, measurements, bodyShapeSummary, sizeRecommendations }", async () => {
    const res = await POST(makeReq(validForm()));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.bodyProfileId).toBe("bp_new");
    expect(json.data.recommendationSessionId).toBe("rs_new");
    expect(json.data.bodyShapeSummary).toBe("athletic");
    expect(Array.isArray(json.data.sizeRecommendations)).toBe(true);
    expect(json.data.measurements.heightCm).toBe(170);
  });
});
