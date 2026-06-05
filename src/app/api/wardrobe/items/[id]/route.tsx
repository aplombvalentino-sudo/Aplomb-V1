import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, unauthorized, forbidden, notFound } from "@/lib/api";
import { parseParam, zCuid } from "@/lib/validate";
import { LIMITS, enforceLimits, tooManyRequests } from "@/lib/rateLimit-upstash";
import { deleteWardrobePhoto } from "@/lib/wardrobe/storage";

/**
 * DELETE /api/wardrobe/items/[id]
 *
 * Removes one wardrobe item from the signed-in user's closet. For user_photo
 * items the underlying bucket objects are deleted FIRST (Art 17 erasure
 * posture — never leave orphan photos in storage); then the DB row.
 *
 * GET is not implemented per item — the list endpoint returns everything in
 * one call already, and we don't need per-item read.
 */

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const guard = await enforceLimits(`u:${session.user.id}:wardrobe`, [
    LIMITS.brand_writes,
  ]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  const { id: rawId } = await params;
  const idParsed = parseParam(rawId, zCuid);
  if (!idParsed.ok) return idParsed.response;

  // Look up + verify ownership in a single query. We do NOT use RLS for this
  // (we go through Prisma + service-role), so the userId match here IS the
  // ownership gate. Without it, anyone could delete anyone's items.
  const item = await db.wardrobeItem.findUnique({
    where: { id: idParsed.data },
    select: {
      userId: true,
      sourceType: true,
      frontImagePath: true,
      backImagePath: true,
      processedAssetPath: true,
    },
  });
  if (!item) return notFound("Wardrobe item");
  if (item.userId !== session.user.id) return forbidden();

  // For user_photo items, purge the bucket objects BEFORE the DB row goes —
  // matches the eraseUser pattern. deleteWardrobePhoto is best-effort
  // (swallows errors) so a transient storage failure doesn't block the
  // user-facing delete.
  if (item.sourceType === "user_photo") {
    if (item.frontImagePath) await deleteWardrobePhoto(item.frontImagePath);
    if (item.backImagePath) await deleteWardrobePhoto(item.backImagePath);
    if (item.processedAssetPath) await deleteWardrobePhoto(item.processedAssetPath);
  }

  await db.wardrobeItem.delete({ where: { id: idParsed.data } });
  return ok({ deleted: true });
}
