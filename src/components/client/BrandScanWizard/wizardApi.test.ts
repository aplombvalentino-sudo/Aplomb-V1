import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  authedHeaders,
  postMeasurements,
  postOutfits,
  postTryOn,
} from "./wizardApi";

// ── Fetch mock plumbing ──────────────────────────────────────────────────────

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockOk<T>(data: T) {
  fetchMock.mockResolvedValueOnce({
    json: async () => ({ success: true, data }),
  });
}

function makeFile(name: string): File {
  return new File(["fake-bytes"], name, { type: "image/jpeg" });
}

// ─────────────────────────────────────────────────────────────────────────────
// authedHeaders
// ─────────────────────────────────────────────────────────────────────────────

describe("authedHeaders", () => {
  it("returns Content-Type only when no session token is present", () => {
    expect(authedHeaders(null)).toEqual({ "Content-Type": "application/json" });
    expect(authedHeaders(undefined)).toEqual({ "Content-Type": "application/json" });
    expect(authedHeaders("")).toEqual({ "Content-Type": "application/json" });
  });

  it("adds X-Aplomb-Session header when token present (Safari/iframe ITP path)", () => {
    expect(authedHeaders("abc-token")).toEqual({
      "Content-Type": "application/json",
      "X-Aplomb-Session": "abc-token",
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// postMeasurements
// ─────────────────────────────────────────────────────────────────────────────

describe("postMeasurements — POST /api/measurements", () => {
  it("posts to the correct URL with method POST and a FormData body", async () => {
    mockOk({ bodyProfileId: "bp1" });
    await postMeasurements({
      brandSlug: "acme",
      mode: "easy",
      heightCm: 170,
      weightKg: 65,
      frontImage: makeFile("front.jpg"),
      sideImage: makeFile("side.jpg"),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/measurements");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
  });

  it("does NOT set Content-Type for multipart (browser sets the boundary)", async () => {
    // If we set Content-Type manually, the browser would not append the
    // `; boundary=...` part and the upload would fail to parse server-side.
    mockOk({});
    await postMeasurements({
      brandSlug: "acme",
      mode: "easy",
      heightCm: 170,
      weightKg: 65,
      frontImage: makeFile("front.jpg"),
      sideImage: makeFile("side.jpg"),
    });
    const init = fetchMock.mock.calls[0]![1];
    expect(init.headers).toBeUndefined();
  });

  it("easy mode does NOT send chest/waist/hips", async () => {
    mockOk({});
    await postMeasurements({
      brandSlug: "acme",
      mode: "easy",
      heightCm: 170,
      weightKg: 65,
      frontImage: makeFile("front.jpg"),
      sideImage: makeFile("side.jpg"),
    });
    const body = fetchMock.mock.calls[0]![1].body as FormData;
    expect(body.has("chestCm")).toBe(false);
    expect(body.has("waistCm")).toBe(false);
    expect(body.has("hipsCm")).toBe(false);
    expect(body.get("brandSlug")).toBe("acme");
    expect(body.get("measurementMode")).toBe("easy");
    expect(body.get("heightCm")).toBe("170");
    expect(body.get("weightKg")).toBe("65");
  });

  it("advanced mode sends chest/waist/hips when provided", async () => {
    mockOk({});
    await postMeasurements({
      brandSlug: "acme",
      mode: "advanced",
      heightCm: 170,
      weightKg: 65,
      chestCm: 95,
      waistCm: 80,
      hipsCm: 100,
      frontImage: makeFile("front.jpg"),
      sideImage: makeFile("side.jpg"),
    });
    const body = fetchMock.mock.calls[0]![1].body as FormData;
    expect(body.get("chestCm")).toBe("95");
    expect(body.get("waistCm")).toBe("80");
    expect(body.get("hipsCm")).toBe("100");
    expect(body.get("measurementMode")).toBe("advanced");
  });

  it("includes gender only when set", async () => {
    mockOk({});
    await postMeasurements({
      brandSlug: "acme",
      mode: "easy",
      heightCm: 170,
      weightKg: 65,
      gender: "female",
      frontImage: makeFile("front.jpg"),
      sideImage: makeFile("side.jpg"),
    });
    expect((fetchMock.mock.calls[0]![1].body as FormData).get("gender")).toBe("female");
  });

  it("attaches both photos under the expected field names", async () => {
    mockOk({});
    const front = makeFile("F.jpg");
    const side = makeFile("S.jpg");
    await postMeasurements({
      brandSlug: "acme",
      mode: "easy",
      heightCm: 170,
      weightKg: 65,
      frontImage: front,
      sideImage: side,
    });
    const body = fetchMock.mock.calls[0]![1].body as FormData;
    expect(body.get("frontImage")).toBe(front);
    expect(body.get("sideImage")).toBe(side);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// postOutfits
// ─────────────────────────────────────────────────────────────────────────────

describe("postOutfits — POST /api/outfits", () => {
  it("posts JSON to /api/outfits with the session header when token present", async () => {
    mockOk({ outfits: [] });
    await postOutfits({
      brandSlug: "acme",
      recommendationSessionId: "rs1",
      sessionToken: "tok-1",
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/outfits");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      "X-Aplomb-Session": "tok-1",
    });
  });

  it("body forwards brandSlug + sessionId, defaults maxOutfits to 3, drops empty optionals", async () => {
    mockOk({ outfits: [] });
    await postOutfits({
      brandSlug: "acme",
      recommendationSessionId: "rs1",
      sessionToken: null,
    });
    const init = fetchMock.mock.calls[0]![1];
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      brandSlug: "acme",
      recommendationSessionId: "rs1",
      maxOutfits: 3,
      // occasion + stylePreference omitted (undefined values dropped by JSON.stringify)
    });
  });

  it("forwards occasion and stylePreference when set", async () => {
    mockOk({ outfits: [] });
    await postOutfits({
      brandSlug: "acme",
      recommendationSessionId: "rs1",
      occasion: "wedding",
      stylePreference: "formal",
      sessionToken: null,
    });
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.occasion).toBe("wedding");
    expect(body.stylePreference).toBe("formal");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// postTryOn
// ─────────────────────────────────────────────────────────────────────────────

describe("postTryOn — POST /api/tryon", () => {
  it("posts JSON to /api/tryon with auth header and the {outfitItemId, bodyProfileId} body", async () => {
    mockOk({ imageUrl: "https://x/y.jpg" });
    await postTryOn({
      outfitItemId: "oi1",
      bodyProfileId: "bp1",
      sessionToken: "tok-2",
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/tryon");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      "X-Aplomb-Session": "tok-2",
    });
    expect(JSON.parse(init.body)).toEqual({
      outfitItemId: "oi1",
      bodyProfileId: "bp1",
    });
  });

  it("omits the session header when no token (signed-in user path)", async () => {
    mockOk({ imageUrl: "" });
    await postTryOn({
      outfitItemId: "oi1",
      bodyProfileId: "bp1",
      sessionToken: null,
    });
    expect(fetchMock.mock.calls[0]![1].headers).toEqual({
      "Content-Type": "application/json",
    });
  });
});
