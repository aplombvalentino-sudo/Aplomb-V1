import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mocks (hoisted) ──────────────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { signInWithPassword: vi.fn() },
  },
}));

vi.mock("@/lib/rateLimit-upstash", () => ({
  LIMITS: { login_window: () => null },
  enforceLimits: vi.fn(),
}));

// Force PROTECT_LOGIN = true so we can exercise the Turnstile branch. The
// real (deployed) constant value being `false` is already verified in
// `lib/security/turnstile.test.ts`.
vi.mock("@/lib/security/turnstile", () => ({
  TURNSTILE_PROTECT_LOGIN: true,
  verifyTurnstileToken: vi.fn(),
}));

// PrismaAdapter is constructed at module load with `db` — replace with a no-op
// so importing auth.ts doesn't reach Prisma. The adapter is never *called* in
// the unit tests below; only `authorizeCredentialsLogin` is.
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: vi.fn(() => ({})),
}));

// Mock NextAuth + its providers so importing lib/auth.ts doesn't pull in
// next-auth's runtime (which has Node ESM module-resolution quirks vitest
// doesn't replicate). We don't test NextAuth itself here — only the extracted
// authorize function — so a stub is enough.
vi.mock("next-auth", () => ({
  default: () => ({
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
  }),
}));
vi.mock("next-auth/providers/credentials", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (config: any) => config,
}));
vi.mock("next-auth/providers/google", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (config: any) => config,
}));

import { authorizeCredentialsLogin } from "./auth";
import { supabase } from "@/lib/supabase";
import { enforceLimits } from "@/lib/rateLimit-upstash";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(enforceLimits).mockResolvedValue({ allowed: true });
  vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: true });
});

function validCreds(overrides: Record<string, unknown> = {}) {
  return {
    email: "user@example.com",
    password: "secret123",
    turnstileToken: "tok",
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("authorizeCredentialsLogin — schema gate (Zod)", () => {
  it("returns null when email is malformed", async () => {
    const r = await authorizeCredentialsLogin(validCreds({ email: "not-an-email" }), undefined);
    expect(r).toBeNull();
    // The schema gate must fire BEFORE any downstream call.
    expect(vi.mocked(verifyTurnstileToken)).not.toHaveBeenCalled();
    expect(vi.mocked(enforceLimits)).not.toHaveBeenCalled();
    expect(vi.mocked(supabase.auth.signInWithPassword)).not.toHaveBeenCalled();
  });

  it("returns null when password is shorter than 6 chars", async () => {
    const r = await authorizeCredentialsLogin(validCreds({ password: "abc" }), undefined);
    expect(r).toBeNull();
  });
});

describe("authorizeCredentialsLogin — Turnstile gate (PROTECT_LOGIN mocked true)", () => {
  it("returns null when verifyTurnstileToken fails; does not reach rate-limit or Supabase", async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue({
      success: false,
      errorCodes: ["invalid-input-response"],
    });
    const r = await authorizeCredentialsLogin(validCreds(), undefined);
    expect(r).toBeNull();
    expect(vi.mocked(enforceLimits)).not.toHaveBeenCalled();
    expect(vi.mocked(supabase.auth.signInWithPassword)).not.toHaveBeenCalled();
  });

  it("passes the turnstileToken from credentials into verifyTurnstileToken", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { user: { id: "u1", email: "user@example.com", user_metadata: {} } } as any,
      error: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    await authorizeCredentialsLogin(validCreds({ turnstileToken: "fresh-token" }), undefined);
    expect(vi.mocked(verifyTurnstileToken)).toHaveBeenCalledWith("fresh-token", "unknown");
  });
});

describe("authorizeCredentialsLogin — rate-limit gate", () => {
  it("returns null when the per-(IP,email) limiter denies", async () => {
    vi.mocked(enforceLimits).mockResolvedValue({ allowed: false, retryAfterSeconds: 60 });
    const r = await authorizeCredentialsLogin(validCreds(), undefined);
    expect(r).toBeNull();
    // The Supabase password check MUST NOT be reached when rate-limited —
    // otherwise rate-limit could be probed via timing of Supabase calls.
    expect(vi.mocked(supabase.auth.signInWithPassword)).not.toHaveBeenCalled();
  });
});

describe("authorizeCredentialsLogin — Supabase password check", () => {
  it("returns null on Supabase auth error (wrong password)", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { user: null, session: null } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: { message: "Invalid login credentials", status: 400 } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const r = await authorizeCredentialsLogin(validCreds(), undefined);
    expect(r).toBeNull();
  });

  it("returns null when Supabase succeeds but yields no user object", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { user: null, session: null } as any,
      error: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const r = await authorizeCredentialsLogin(validCreds(), undefined);
    expect(r).toBeNull();
  });

  it("returns the {id, email, name} user shape on successful login", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: {
        user: {
          id: "supabase-user-id",
          email: "user@example.com",
          user_metadata: { name: "Alice" },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session: {} as any,
      },
      error: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const r = await authorizeCredentialsLogin(validCreds(), undefined);
    expect(r).toEqual({
      id: "supabase-user-id",
      email: "user@example.com",
      name: "Alice",
    });

    // The function called Supabase with the parsed credentials (not the raw
    // unknown body) — guarantees email normalisation + password forwarding.
    expect(vi.mocked(supabase.auth.signInWithPassword)).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret123",
    });
  });

  it("returns null and falls back to name=null when user_metadata has no name", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: {
        user: {
          id: "u2",
          email: "u2@example.com",
          user_metadata: {},
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session: {} as any,
      },
      error: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const r = await authorizeCredentialsLogin(validCreds({ email: "u2@example.com" }), undefined);
    expect(r).toEqual({ id: "u2", email: "u2@example.com", name: null });
  });
});
