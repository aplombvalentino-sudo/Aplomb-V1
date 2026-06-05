import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, unauthorized, forbidden, notFound } from "@/lib/api";
import { parseParam, zCuid } from "@/lib/validate";
import { LIMITS, enforceLimits, tooManyRequests } from "@/lib/rateLimit-upstash";

/**
 * DELETE /api/outfits/wardrobe/[id]
 * Removes a saved outfit. Cascade FKs handle the item rows.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const guard = await enforceLimits(`u:${session.user.id}:outfits-delete`, [
    LIMITS.brand_writes,
  ]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  const { id: rawId } = await params;
  const idParsed = parseParam(rawId, zCuid);
  if (!idParsed.ok) return idParsed.response;

  const outfit = await db.wardrobeOutfit.findUnique({
    where: { id: idParsed.data },
    select: { userId: true },
  });
  if (!outfit) return notFound("Outfit");
  if (outfit.userId !== session.user.id) return forbidden();

  await db.wardrobeOutfit.delete({ where: { id: idParsed.data } });
  return ok({ deleted: true });
}
