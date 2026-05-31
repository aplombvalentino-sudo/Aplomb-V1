import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the DB and auth — but NOT sessionToken: we use the real hashToken/
// safeEqual to prove integration (otherwise we'd just be testing our mock).
vi.mock("@/lib/db", () => ({
  db: {
    recommendationSession: { findUnique: vi.fn(), findFirst: vi.fn() },
    bodyProfile: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { authorizeSession, authorizeBodyProfile } from "./ownership";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  hashToken,
  SESSION_TOKEN_COOKIE,
  SESSION_TOKEN_HEADER,
} from "./sessionToken";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(opts: { cookie?: string; header?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.header) headers[SESSION_TOKEN_HEADER] = opts.header;
  if (opts.cookie) headers["cookie"] = `${SESSION_TOKEN_COOKIE}=${opts.cookie}`;
  return new NextRequest("http://localhost:3000/api/x", { headers });
}

const ANON_TOKEN = "anon-token-secret-value";
const ANON_HASH = hashToken(ANON_TOKEN);

beforeEach(() => {
  vi.clearAllMocks();
});

// ── authorizeSession ─────────────────────────────────────────────────────────

describe("authorizeSession", () => {
  it("returns 404 when the session does not exist", async () => {
    vi.mocked(db.recommendationSession.findUnique).mockResolvedValue(null);
    const r = await authorizeSession(makeReq(), "sess-missing");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });

  // ── User-owned branch ──
  it("user-owned: 401 when no auth() session", async () => {
    vi.mocked(db.recommendationSession.findUnique).mockResolvedValue({
      id: "s1",
      userId: "u1",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(auth).mockResolvedValue(null as never);
    const r = await authorizeSession(makeReq(), "s1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });

  it("user-owned: 403 when authed but as a different user", async () => {
    vi.mocked(db.recommendationSession.findUnique).mockResolvedValue({
      id: "s1",
      userId: "u1",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValue({ user: { id: "u2" } } as any);
    const r = await authorizeSession(makeReq(), "s1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it("user-owned: ok when authed as the owning user", async () => {
    vi.mocked(db.recommendationSession.findUnique).mockResolvedValue({
      id: "s1",
      userId: "u1",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    const r = await authorizeSession(makeReq(), "s1");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.session.id).toBe("s1");
  });

  // ── Anonymous branch ──
  it("anonymous: 403 when the session has no ownerTokenHash at all", async () => {
    vi.mocked(db.recommendationSession.findUnique).mockResolvedValue({
      id: "s1",
      userId: null,
      ownerTokenHash: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const r = await authorizeSession(makeReq({ cookie: ANON_TOKEN }), "s1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it("anonymous: 401 when the cookie/header is missing", async () => {
    vi.mocked(db.recommendationSession.findUnique).mockResolvedValue({
      id: "s1",
      userId: null,
      ownerTokenHash: ANON_HASH,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const r = await authorizeSession(makeReq(), "s1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });

  it("anonymous: 403 when the cookie token hashes to a different value", async () => {
    vi.mocked(db.recommendationSession.findUnique).mockResolvedValue({
      id: "s1",
      userId: null,
      ownerTokenHash: ANON_HASH,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const r = await authorizeSession(makeReq({ cookie: "a-different-token" }), "s1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it("anonymous: ok when the cookie token hashes to the stored hash", async () => {
    vi.mocked(db.recommendationSession.findUnique).mockResolvedValue({
      id: "s1",
      userId: null,
      ownerTokenHash: ANON_HASH,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const r = await authorizeSession(makeReq({ cookie: ANON_TOKEN }), "s1");
    expect(r.ok).toBe(true);
  });
});

// ── authorizeBodyProfile ─────────────────────────────────────────────────────

describe("authorizeBodyProfile", () => {
  it("returns 404 when the body profile does not exist", async () => {
    vi.mocked(db.bodyProfile.findUnique).mockResolvedValue(null);
    const r = await authorizeBodyProfile(makeReq(), "bp-missing");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });

  it("user-owned: 401 when not authed", async () => {
    vi.mocked(db.bodyProfile.findUnique).mockResolvedValue({
      id: "bp1",
      userId: "u1",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(auth).mockResolvedValue(null as never);
    const r = await authorizeBodyProfile(makeReq(), "bp1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });

  it("user-owned: 403 when authed as a different user", async () => {
    vi.mocked(db.bodyProfile.findUnique).mockResolvedValue({
      id: "bp1",
      userId: "u1",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValue({ user: { id: "u2" } } as any);
    const r = await authorizeBodyProfile(makeReq(), "bp1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it("user-owned: ok when authed as the owning user", async () => {
    vi.mocked(db.bodyProfile.findUnique).mockResolvedValue({
      id: "bp1",
      userId: "u1",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    const r = await authorizeBodyProfile(makeReq(), "bp1");
    expect(r.ok).toBe(true);
  });

  it("anonymous: 401 when the cookie is missing", async () => {
    vi.mocked(db.bodyProfile.findUnique).mockResolvedValue({
      id: "bp1",
      userId: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const r = await authorizeBodyProfile(makeReq(), "bp1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });

  it("anonymous: 403 when no sibling RecommendationSession with the matching token-hash exists", async () => {
    vi.mocked(db.bodyProfile.findUnique).mockResolvedValue({
      id: "bp1",
      userId: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(db.recommendationSession.findFirst).mockResolvedValue(null);
    const r = await authorizeBodyProfile(makeReq({ cookie: ANON_TOKEN }), "bp1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it("anonymous: ok when a sibling session with the matching token-hash exists, and the query uses the real SHA-256 of the cookie", async () => {
    vi.mocked(db.bodyProfile.findUnique).mockResolvedValue({
      id: "bp1",
      userId: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(db.recommendationSession.findFirst).mockResolvedValue({
      id: "s_sibling",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const r = await authorizeBodyProfile(makeReq({ cookie: ANON_TOKEN }), "bp1");
    expect(r.ok).toBe(true);

    // Critical: the DB query MUST use the SHA-256 of the cookie, not the cookie
    // itself — else the plaintext token would be queryable.
    expect(vi.mocked(db.recommendationSession.findFirst)).toHaveBeenCalledWith({
      where: { bodyProfileId: "bp1", ownerTokenHash: ANON_HASH },
    });
  });
});
