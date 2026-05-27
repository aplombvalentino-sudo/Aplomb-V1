/**
 * Brand-role enforcement helper.
 *
 * Every brand-scoped write endpoint should call this to assert the caller has
 * sufficient role on the brand. Returns the BrandUser membership row on
 * success (handy if the caller needs the role for further decisions).
 *
 * Policy matrix (the source of truth for which role can do what):
 *
 *   ┌────────────┬─────────┬─────────┬──────────┬───────────┐
 *   │ Operation  │ owner   │ admin   │ editor   │ viewer    │
 *   ├────────────┼─────────┼─────────┼──────────┼───────────┤
 *   │ read       │   ✓     │   ✓     │    ✓     │    ✓      │
 *   │ create     │   ✓     │   ✓     │    ✓     │           │
 *   │ update     │   ✓     │   ✓     │    ✓     │           │
 *   │ delete     │   ✓     │   ✓     │          │           │
 *   │ plan/brand │   ✓     │   ✓     │          │           │
 *   └────────────┴─────────┴─────────┴──────────┴───────────┘
 *
 * Use the named role-set constants below to avoid drift across routes.
 */

import type { BrandUserRole } from "@prisma/client";
import { db } from "@/lib/db";

/** All members — read access. */
export const ROLES_READ: BrandUserRole[] = ["owner", "admin", "editor", "viewer"];
/** Editors and above — create/update catalog content. */
export const ROLES_WRITE: BrandUserRole[] = ["owner", "admin", "editor"];
/** Admins and above — destructive operations + brand identity changes. */
export const ROLES_ADMIN: BrandUserRole[] = ["owner", "admin"];

export type BrandRoleResult =
  | { ok: true; brandUserId: string; role: BrandUserRole }
  | { ok: false; status: 403; reason: string };

/**
 * Returns the caller's BrandUser membership on `brandId` if and only if their
 * role is in `allowed`. Otherwise returns a typed failure to return to the caller.
 *
 * Routes that have already verified authentication should pass the session
 * user.id directly.
 */
export async function requireBrandRole(
  userId: string,
  brandId: string,
  allowed: BrandUserRole[],
): Promise<BrandRoleResult> {
  const membership = await db.brandUser.findUnique({
    where: { userId_brandId: { userId, brandId } },
  });
  if (!membership) {
    return { ok: false, status: 403, reason: "You are not a member of this brand." };
  }
  if (!allowed.includes(membership.role)) {
    return {
      ok: false,
      status: 403,
      reason: `This action requires one of: ${allowed.join(", ")}. Your role: ${membership.role}.`,
    };
  }
  return { ok: true, brandUserId: membership.id, role: membership.role };
}
