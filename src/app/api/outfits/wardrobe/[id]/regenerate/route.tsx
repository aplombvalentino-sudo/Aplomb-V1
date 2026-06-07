import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, err, unauthorized, forbidden, notFound } from "@/lib/api";
import { zCuid } from "@/lib/validate";
import { LIMITS, enforceLimits, tooManyRequests } from "@/lib/rateLimit-upstash";
import { runWardrobeTryOn } from "@/lib/wardrobe/runTryOn";
import { getMonthlyUsage } from "@/lib/wardrobe/usage";
import { isValidClientPlan } from "@/lib/planLimits";

/**
 * POST /api/outfits/wardrobe/[id]/regenerate
 *
 * Re-runs the AI try-on for an EXISTING outfit. Multipart with a fresh
 * selfie (the user might want to try the same outfit on a different photo
 * or fix an earlier failed attempt). The outfit row is updated in place —
 * old generated image is overwritten.
 *
 * Same cost-bearing posture as the create-and-tryon route. Rate-limited
 * with the existing tryon limiters.
 */

export const maxDuration = 60;

const MAX_SELFIE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  const { id: outfitId } = await params;
  const idCheck = zCuid.safeParse(outfitId);
  if (!idCheck.success) return err("VALIDATION_ERROR", "Invalid outfit id.", 400);

  const guard = await enforceLimits(`u:${userId}:wardrobe-tryon`, [
    LIMITS.tryon_minute,
    LIMITS.tryon_daily,
  ]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  // Ownership check — refuse before any heavy lifting.
  const outfit = await db.wardrobeOutfit.findUnique({
    where: { id: outfitId },
    select: { id: true, userId: true },
  });
  if (!outfit) return notFound("Outfit");
  if (outfit.userId !== userId) return forbidden();

  // Monthly try-on quota check — regenerate counts as a try-on too since
  // it spends an AI call.
  const planUser = await db.user.findUnique({
    where: { id: userId },
    select: { clientPlan: true },
  });
  const plan = isValidClientPlan(planUser?.clientPlan) ? planUser!.clientPlan : "essential";
  const usage = await getMonthlyUsage(userId, plan);
  if (!usage.canTryOn) {
    return err(
      "MONTHLY_LIMIT",
      `You've reached your monthly try-on limit (${usage.tryOnsLimit}). Upgrade for more.`,
      402,
    );
  }

  // Multipart parse.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return err("INVALID_FORM", "Expected multipart/form-data body.", 400);
  }

  const selfie = form.get("selfie");
  if (!(selfie instanceof File)) {
    return err("VALIDATION_ERROR", "Selfie photo is required.", 400);
  }
  if (selfie.size > MAX_SELFIE_BYTES) {
    return err(
      "PHOTO_TOO_LARGE",
      `Selfie must be under 8 MB (got ${Math.round(selfie.size / 1024 / 1024)} MB).`,
      413,
    );
  }
  if (!ACCEPTED_MIME.includes(selfie.type)) {
    return err("PHOTO_TYPE", "Selfie must be JPEG, PNG, or WebP.", 415);
  }

  const selfieBuffer = Buffer.from(await selfie.arrayBuffer());
  const result = await runWardrobeTryOn({
    userId,
    outfitId,
    selfie: { buffer: selfieBuffer, mime: selfie.type },
  });

  if (!result.ok) {
    return err("TRYON_FAILED", result.reason, 502);
  }
  return ok({ outfitId, provider: result.provider });
}
