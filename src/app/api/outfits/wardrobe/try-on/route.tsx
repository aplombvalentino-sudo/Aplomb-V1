import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/api";
import { LIMITS, enforceLimits, tooManyRequests } from "@/lib/rateLimit-upstash";
import { createWardrobeOutfit } from "@/lib/wardrobe/outfits";
import { runWardrobeTryOn } from "@/lib/wardrobe/runTryOn";

/**
 * POST /api/outfits/wardrobe/try-on
 *
 * The single atomic endpoint behind the multistep outfit builder:
 *   - User has selected items in the wardrobe and uploaded a selfie.
 *   - This route creates the outfit row, kicks off the AI try-on, stores
 *     selfie + generated image, and returns the outfit id.
 *   - The client then navigates to /app/outfits/[id] to view the result.
 *
 * Multipart only — `selfie` (File) + `payload` (JSON string with title,
 * occasion, items). We use multipart so the selfie can be streamed
 * directly into Supabase without base64-encoding overhead.
 *
 * Cost-bearing: every call hits the AI provider, which is the most
 * expensive endpoint in the app. Rate-limit aggressively per shopper.
 *
 * Vercel timeout: image generation can take 15–30s. We set maxDuration so
 * Pro/Enterprise plans get the full 60s window; on Hobby this still works
 * for fast responses but may time out on slow ones — Pro recommended.
 */

export const maxDuration = 60;

const MAX_SELFIE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];

const payloadSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    occasion: z.string().trim().max(120).optional(),
    /** Self-reported user height in cm. Optional in this schema so the
     *  UI can omit it for shoppers whose User.heightCm is already saved
     *  (the server uses the stored value in that case). When supplied,
     *  we ALSO persist it to User.heightCm so the next try-on can skip
     *  the prompt. */
    userHeightCm: z.number().int().min(100).max(250).optional(),
    items: z
      .array(
        z.object({
          wardrobeItemId: z.string().min(20).max(40),
          position: z.string().min(1).max(40),
        }),
      )
      .min(1)
      .max(8),
  })
  .strict();

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  // Two-tier rate-limit: the AI call is expensive. Same posture as /api/tryon.
  const guard = await enforceLimits(`u:${userId}:wardrobe-tryon`, [
    LIMITS.tryon_minute,
    LIMITS.tryon_daily,
  ]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  // Multipart parse
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return err("INVALID_FORM", "Expected multipart/form-data body.", 400);
  }

  // Validate the JSON payload first — failing here doesn't touch the AI.
  let payload: z.infer<typeof payloadSchema>;
  const rawPayload = form.get("payload");
  if (typeof rawPayload !== "string") {
    return err("VALIDATION_ERROR", "Missing 'payload' field.", 400);
  }
  try {
    payload = payloadSchema.parse(JSON.parse(rawPayload));
  } catch {
    return err("VALIDATION_ERROR", "Invalid payload JSON or shape.", 400);
  }

  // Validate the selfie file.
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

  // Resolve the effective height: explicit on the payload wins, else fall
  // back to whatever's stored on the user. Persist a NEW value back to the
  // user row so the next try-on doesn't have to ask.
  let effectiveHeightCm: number | undefined;
  if (payload.userHeightCm) {
    effectiveHeightCm = payload.userHeightCm;
    await db.user
      .update({
        where: { id: userId },
        data: { heightCm: payload.userHeightCm },
      })
      .catch(() => null);
  } else {
    const u = await db.user.findUnique({
      where: { id: userId },
      select: { heightCm: true },
    });
    effectiveHeightCm = u?.heightCm ?? undefined;
  }

  // Create the outfit row — this is where item-ownership is verified. If
  // any item isn't owned, we refuse before reaching the AI.
  const created = await createWardrobeOutfit(userId, {
    title: payload.title,
    occasion: payload.occasion,
    userHeightCm: effectiveHeightCm,
    items: payload.items,
  });
  if (!created.ok) {
    if (created.reason === "no_items") {
      return err("NO_ITEMS", "Pick at least one item before trying it on.", 400);
    }
    return err(
      "ITEMS_NOT_OWNED",
      "One or more items aren't in your wardrobe.",
      403,
    );
  }

  // Run the try-on. Reads the selfie bytes into memory once + hands them
  // straight to the orchestrator.
  const selfieBuffer = Buffer.from(await selfie.arrayBuffer());
  const result = await runWardrobeTryOn({
    userId,
    outfitId: created.id,
    selfie: { buffer: selfieBuffer, mime: selfie.type },
  });

  if (!result.ok) {
    // Outfit row exists (with status=failed) — include the id in the body
    // so the UI can navigate to the detail page and offer "Try again".
    // The standard err() helper only carries { code, message }, so we hand-
    // build the response here to attach `outfitId`.
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "TRYON_FAILED",
          message: result.reason,
          outfitId: created.id,
        },
      },
      { status: 502 },
    );
  }

  return ok(
    {
      outfitId: created.id,
      provider: result.provider,
    },
    201,
  );
}
