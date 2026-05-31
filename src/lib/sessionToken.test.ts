import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  newSessionToken,
  hashToken,
  safeEqual,
  readSessionToken,
  sessionTokenCookieOptions,
  SESSION_TOKEN_COOKIE,
  SESSION_TOKEN_HEADER,
} from "./sessionToken";

describe("newSessionToken + hashToken", () => {
  it("emits a base64url token (~43 chars) plus matching SHA-256 hex hash (64 chars)", () => {
    const { token, hash } = newSessionToken();
    // base64url of 32 random bytes → 43 chars, no padding, only [A-Za-z0-9_-].
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // SHA-256 hex = 64 lowercase hex chars.
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).toBe(hash);
  });

  it("emits a different token on each call (anti-predictability)", () => {
    const a = newSessionToken().token;
    const b = newSessionToken().token;
    expect(a).not.toBe(b);
  });

  it("hashToken is deterministic and order-sensitive", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("acb"));
  });
});

describe("safeEqual (constant-time string compare)", () => {
  it("returns true for identical strings", () => {
    expect(safeEqual("abc123", "abc123")).toBe(true);
  });

  it("returns false on length mismatch (short-circuit before XOR loop)", () => {
    expect(safeEqual("a", "ab")).toBe(false);
    expect(safeEqual("", "x")).toBe(false);
  });

  it("returns false for any position of difference at equal length", () => {
    // The whole point of the XOR-accumulator is that we don't stop at the first
    // differing byte. Different at first / middle / last all return false.
    expect(safeEqual("Xbcdef", "abcdef")).toBe(false); // diff at start
    expect(safeEqual("abXdef", "abcdef")).toBe(false); // diff middle
    expect(safeEqual("abcdeY", "abcdef")).toBe(false); // diff at end
  });

  it("two empty strings compare equal", () => {
    expect(safeEqual("", "")).toBe(true);
  });
});

describe("readSessionToken", () => {
  function makeReq(opts: { header?: string; cookie?: string } = {}) {
    const headers: Record<string, string> = {};
    if (opts.header) headers[SESSION_TOKEN_HEADER] = opts.header;
    if (opts.cookie) headers["cookie"] = `${SESSION_TOKEN_COOKIE}=${opts.cookie}`;
    return new NextRequest("http://localhost:3000/api/x", { headers });
  }

  it("returns the header value when present", () => {
    expect(readSessionToken(makeReq({ header: "tok-from-header" }))).toBe("tok-from-header");
  });

  it("falls back to the cookie when no header is set", () => {
    expect(readSessionToken(makeReq({ cookie: "tok-from-cookie" }))).toBe("tok-from-cookie");
  });

  it("prefers the header over the cookie when both are present (Safari ITP path)", () => {
    expect(
      readSessionToken(makeReq({ header: "from-header", cookie: "from-cookie" })),
    ).toBe("from-header");
  });

  it("returns undefined when neither is set", () => {
    expect(readSessionToken(makeReq())).toBeUndefined();
  });
});

describe("sessionTokenCookieOptions", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is httpOnly + sameSite=lax + secure in production, with the 7-day max-age", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(sessionTokenCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  });

  it("loosens 'secure' in development so localhost works", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(sessionTokenCookieOptions().secure).toBe(false);
  });
});
