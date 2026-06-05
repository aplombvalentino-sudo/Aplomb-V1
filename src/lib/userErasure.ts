import "server-only";
import { db } from "@/lib/db";
import { deleteBodyScan } from "@/lib/ai/storage";
import { deleteWardrobePhoto } from "@/lib/wardrobe/storage";
import { getSupabaseServiceClient } from "@/lib/supabase";

/**
 * Full GDPR-compliant erasure of a user (Art 17 right to erasure).
 *
 * Order of operations matters because several FKs on the user's downstream
 * data are currently `ON DELETE SET NULL` rather than CASCADE — naive
 * `db.user.delete()` would leave orphan BodyProfile + RecommendationSession
 * rows pointing to deleted users, *with the photo paths intact*. This routine
 * walks the dependency graph manually, removes the photos from the private
 * storage bucket FIRST, then cascade-deletes the DB rows, then the auth user.
 *
 * Safety: if the user is the sole `owner` of any Brand, the call returns
 * `{ ok: false, reason: "sole-owner" }` and aborts. The brand must be deleted
 * or ownership transferred first — silently orphaning a brand has bigger
 * consequences than a user can reverse.
 */

export type EraseResult =
  | { ok: true; deletedPhotos: number; deletedProfiles: number }
  | { ok: false; reason: "sole-owner"; brands: string[] }
  | { ok: false; reason: "not-found" };

export async function eraseUser(userId: string): Promise<EraseResult> {
  // ── 1. Refuse if the user is the sole owner of any brand ────────────────
  // (We don't want to orphan a brand. The user must delete the brand or
  // transfer ownership first.)
  const ownedBrands = await db.brandUser.findMany({
    where: { userId, role: "owner" },
    include: {
      brand: {
        select: {
          slug: true,
          brandUsers: { where: { role: "owner" }, select: { id: true } },
        },
      },
    },
  });

  const soleOwned = ownedBrands.filter((bu) => bu.brand.brandUsers.length === 1);
  if (soleOwned.length > 0) {
    return {
      ok: false,
      reason: "sole-owner",
      brands: soleOwned.map((bu) => bu.brand.slug),
    };
  }

  // ── 2. Verify the user actually exists ──────────────────────────────────
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, reason: "not-found" };

  // ── 3. Gather all photos to delete from the private bucket ──────────────
  // (Photos are NOT covered by RLS or FK cascade — they live in Supabase
  // Storage, which is a separate plane. Must be deleted explicitly.)
  const profiles = await db.bodyProfile.findMany({
    where: { userId },
    select: { id: true, frontImagePath: true, sideImagePath: true },
  });

  let deletedPhotos = 0;
  for (const p of profiles) {
    if (p.frontImagePath) {
      await deleteBodyScan(p.frontImagePath);
      deletedPhotos++;
    }
    if (p.sideImagePath) {
      await deleteBodyScan(p.sideImagePath);
      deletedPhotos++;
    }
  }

  // ── 3b. Wardrobe user_photo items — same posture, storage before DB ─────
  // (Certified wardrobe items don't have photo paths to clean up; their FK
  // to Product is SET NULL on delete, and the wardrobe row itself is
  // CASCADE-deleted with the User below.)
  const wardrobePhotos = await db.wardrobeItem.findMany({
    where: { userId, sourceType: "user_photo" },
    select: { frontImagePath: true, backImagePath: true, processedAssetPath: true },
  });

  for (const w of wardrobePhotos) {
    if (w.frontImagePath) {
      await deleteWardrobePhoto(w.frontImagePath);
      deletedPhotos++;
    }
    if (w.backImagePath) {
      await deleteWardrobePhoto(w.backImagePath);
      deletedPhotos++;
    }
    if (w.processedAssetPath) {
      await deleteWardrobePhoto(w.processedAssetPath);
      deletedPhotos++;
    }
  }

  // ── 4. Cascade-delete in DB (single transaction so all-or-nothing) ──────
  const profileIds = profiles.map((p) => p.id);

  await db.$transaction(async (tx) => {
    // 4a. TryOnResults that depend on the user's BodyProfiles.
    // FK on tryOnResult.bodyProfileId is CASCADE so deleting the BodyProfile
    // would handle this, but doing it explicitly first is defensive — keeps
    // try-on result image URLs out of the audit trail.
    await tx.tryOnResult.deleteMany({
      where: { bodyProfileId: { in: profileIds } },
    });

    // 4b. RecommendationSessions where this user is owner (by userId OR by
    // bodyProfileId). Cascades to Outfit + OutfitItem via existing FKs.
    await tx.recommendationSession.deleteMany({
      where: {
        OR: [{ userId }, { bodyProfileId: { in: profileIds } }],
      },
    });

    // 4c. BodyProfiles themselves. Photos are already gone from storage above.
    await tx.bodyProfile.deleteMany({ where: { userId } });

    // 4d. The User row. CASCADE handles:
    //   - Account, Session (NextAuth tables)
    //   - LegalAcceptance (audit trail — note: arguably should be retained for
    //     proof-of-consent during the prescription period; for now we delete
    //     as the GDPR default. If you need to keep, switch this to a soft-
    //     delete on User and anonymise PII fields instead.)
    //   - BrandUser (already verified the user isn't a sole owner above)
    //   - Subscription (Stripe row — note: the Stripe customer object itself
    //     persists. If you need full Stripe deletion, add an API call here.)
    await tx.user.delete({ where: { id: userId } });
  });

  // ── 5. Delete the Supabase Auth user (separate plane from app DB) ──────
  // Best-effort: if it fails, the app user is already gone — but the auth
  // user still exists in Supabase. The user can no longer log in because
  // there's no app row, but the email is "stuck" for the same user to re-sign-up.
  // We swallow the error; a manual cleanup is logged for observability.
  try {
    const svc = getSupabaseServiceClient();
    await svc.auth.admin.deleteUser(userId);
  } catch (e) {
    console.error(
      `[eraseUser] Supabase Auth deletion failed for user ${userId}:`,
      e,
    );
  }

  return { ok: true, deletedPhotos, deletedProfiles: profileIds.length };
}
