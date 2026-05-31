import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { brandUser: { findUnique: vi.fn() } },
}));

import { requireBrandRole, ROLES_READ, ROLES_WRITE, ROLES_ADMIN } from "./brandRole";
import { db } from "@/lib/db";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ROLES_* constants — the role matrix (DO NOT BREAK)", () => {
  it("ROLES_READ covers all four membership roles", () => {
    expect([...ROLES_READ].sort()).toEqual(["admin", "editor", "owner", "viewer"]);
  });

  it("ROLES_WRITE excludes viewer", () => {
    expect(ROLES_WRITE).not.toContain("viewer");
    expect([...ROLES_WRITE].sort()).toEqual(["admin", "editor", "owner"]);
  });

  it("ROLES_ADMIN excludes editor and viewer", () => {
    expect(ROLES_ADMIN).not.toContain("editor");
    expect(ROLES_ADMIN).not.toContain("viewer");
    expect([...ROLES_ADMIN].sort()).toEqual(["admin", "owner"]);
  });
});

describe("requireBrandRole", () => {
  it("returns 403 when the user has no membership on the brand", async () => {
    vi.mocked(db.brandUser.findUnique).mockResolvedValue(null);
    const r = await requireBrandRole("u1", "b1", ROLES_WRITE);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(403);
      expect(r.reason).toMatch(/not a member/i);
    }
  });

  it("returns 403 when the role is below the allowed bar (viewer trying to write)", async () => {
    vi.mocked(db.brandUser.findUnique).mockResolvedValue({
      id: "bu1",
      role: "viewer",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const r = await requireBrandRole("u1", "b1", ROLES_WRITE);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(403);
      // The error should tell the caller what role they have and what is required.
      expect(r.reason).toMatch(/viewer/);
      expect(r.reason).toMatch(/owner|admin|editor/);
    }
  });

  it("returns ok with brandUserId + role when the role is allowed", async () => {
    vi.mocked(db.brandUser.findUnique).mockResolvedValue({
      id: "bu1",
      role: "editor",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const r = await requireBrandRole("u1", "b1", ROLES_WRITE);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.brandUserId).toBe("bu1");
      expect(r.role).toBe("editor");
    }
  });

  it("rejects an editor asking for ROLES_ADMIN (delete / brand-identity gate)", async () => {
    vi.mocked(db.brandUser.findUnique).mockResolvedValue({
      id: "bu1",
      role: "editor",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const r = await requireBrandRole("u1", "b1", ROLES_ADMIN);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });
});
