import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/api";
import { LIMITS, enforceLimits, tooManyRequests } from "@/lib/rateLimit-upstash";

/**
 * GET /api/user/me/export
 *
 * GDPR Art 15 (right of access) + Art 20 (right to data portability).
 * Returns a structured JSON dump of all data Aplomb holds about the user,
 * suitable for opening in any text editor or feeding into another service.
 *
 * Notably absent from the export: the raw body-scan photos themselves. The
 * file paths are included so the user knows what was stored; the photos
 * remain private (signed-URL access only) and are deleted by DELETE /api/user/me.
 * If a user needs the actual photos back, that's a manual support request —
 * by design we treat photos as transient material, not user-owned content.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  // Rate-limit — exports are expensive (multiple joins). Stop scraping loops.
  const guard = await enforceLimits(`u:${session.user.id}:export`, [
    LIMITS.brand_writes,
  ]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  const userId = session.user.id;

  const [
    user,
    legalAcceptances,
    bodyProfiles,
    recommendationSessions,
    subscription,
    brandMemberships,
  ] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        clientPlan: true,
        stripeCustomerId: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
      },
    }),
    db.legalAcceptance.findMany({
      where: { userId },
      select: {
        documentType: true,
        documentVersion: true,
        acceptedAt: true,
        ipAddress: true,
        userAgent: true,
      },
      orderBy: { acceptedAt: "asc" },
    }),
    db.bodyProfile.findMany({
      where: { userId },
      select: {
        id: true,
        brandId: true,
        rawMeasurementsJson: true,
        bodyShapeSummary: true,
        provider: true,
        measurementMode: true,
        frontImagePath: true,
        sideImagePath: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    db.recommendationSession.findMany({
      where: { userId },
      select: {
        id: true,
        brandId: true,
        bodyProfileId: true,
        context: true,
        source: true,
        createdAt: true,
        outfits: {
          select: {
            id: true,
            title: true,
            description: true,
            rationale: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                productId: true,
                productVariantId: true,
                position: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.subscription.findUnique({
      where: { userId },
      select: {
        plan: true,
        status: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        createdAt: true,
      },
    }),
    db.brandUser.findMany({
      where: { userId },
      select: {
        role: true,
        brand: { select: { slug: true, name: true } },
      },
    }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    notice:
      "This export contains the personal data Aplomb holds about you. The 'frontImagePath' / 'sideImagePath' fields reference photos stored in our private bucket; the photos themselves are not included in this JSON. To delete everything (photos + DB + auth), call DELETE /api/user/me from your account page.",
    user,
    brandMemberships,
    subscription,
    legalAcceptances,
    bodyProfiles,
    recommendationSessions,
  };

  // Stream as a downloadable JSON file. Date in filename for the user's
  // own archival; no PII in the filename itself.
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="aplomb-data-export-${date}.json"`,
      // Don't let the browser cache a copy that contains personal data
      "cache-control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
