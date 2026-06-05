import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, unauthorized, forbidden, notFound, err } from "@/lib/api";
import { parseQuery, zCuid } from "@/lib/validate";
import { LIMITS, enforceLimits, tooManyRequests } from "@/lib/rateLimit-upstash";
import { getSignedWardrobeUrl } from "@/lib/wardrobe/storage";

/**
 * GET /api/wardrobe/items/thumb?id=<cuid>
 *
 * Returns a short-lived signed URL for a wardrobe item's display image
 * (processed > front > certified product image). Used by the wardrobe grid
 * to show user-photo thumbnails without exposing raw paths to the client.
 *
 * Why this exists: certified items can just use their product.imageUrl
 * (public CDN). User-photo items live in a PRIVATE bucket — the client
 * never sees the path, only a signed URL it requests fresh every page load.
 */

const querySchema = z.object({ id: zCuid }).strict();

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const guard = await enforceLimits(`u:${session.user.id}:wardrobe-thumb`, [
    LIMITS.public_read,
  ]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  const q = parseQuery(req, querySchema);
  if (!q.ok) return q.response;

  const item = await db.wardrobeItem.findUnique({
    where: { id: q.data.id },
    select: {
      userId: true,
      processedAssetPath: true,
      frontImagePath: true,
      product: { select: { imageUrl: true } },
    },
  });
  if (!item) return notFound("Wardrobe item");
  if (item.userId !== session.user.id) return forbidden();

  // Prefer processed > front > certified product URL.
  if (item.processedAssetPath) {
    const url = await getSignedWardrobeUrl(item.processedAssetPath);
    return ok({ url });
  }
  if (item.frontImagePath) {
    const url = await getSignedWardrobeUrl(item.frontImagePath);
    return ok({ url });
  }
  if (item.product?.imageUrl) {
    // Certified items use the public product image directly — no signing.
    return ok({ url: item.product.imageUrl });
  }
  return err("NO_THUMBNAIL", "No image available for this item.", 404);
}
