import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/api";
import { LIMITS, enforceLimits, tooManyRequests } from "@/lib/rateLimit-upstash";
import { canAddWardrobeItem } from "@/lib/wardrobe/items";
import {
  uploadWardrobePhoto,
  buildWardrobePhotoPath,
} from "@/lib/wardrobe/storage";
import { isValidClientPlan } from "@/lib/planLimits";

/**
 * POST /api/wardrobe/items/upload
 *
 * Adds a USER_PHOTO wardrobe item. Multipart payload with the front + back
 * photos plus the metadata captured on the "Confirm details" screen of the
 * capture flow. The flow:
 *
 *   1. Auth + rate-limit + Zod metadata + quota check (refuse if essential
 *      cap of 3 personal photos reached → 409 PERSONAL_FULL).
 *   2. Validate photo size + MIME type.
 *   3. Create the WardrobeItem row in `pending_upload` so the photos have
 *      something to attach to (and so the user sees an item appear in the
 *      wardrobe immediately — UX optimism).
 *   4. Upload front + back to the private wardrobe-items bucket.
 *   5. Flip the row to `ready` and stamp the paths.
 *
 * For v1 we set `ready` directly (no AI background-removal pipeline yet).
 * When the pipeline ships, step 4 will leave the row in `processing` and a
 * background worker / direct call will move it to `ready` or `needs_review`.
 */

const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB — matches /api/measurements
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];

const metadataSchema = z
  .object({
    category: z.string().min(1).max(80),
    subcategory: z.string().max(80).optional(),
    color: z.string().max(40).optional(),
    brand: z.string().max(120).optional(),
    nickname: z.string().max(80).optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  const guard = await enforceLimits(`u:${userId}:wardrobe-upload`, [
    LIMITS.brand_writes,
  ]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  // Multipart parse
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return err("INVALID_FORM", "Expected multipart/form-data body.", 400);
  }

  // Metadata fields come as string FormData entries; Zod-parse them.
  const metadataParsed = metadataSchema.safeParse({
    category: form.get("category"),
    subcategory: form.get("subcategory") || undefined,
    color: form.get("color") || undefined,
    brand: form.get("brand") || undefined,
    nickname: form.get("nickname") || undefined,
  });
  if (!metadataParsed.success) {
    return err(
      "VALIDATION_ERROR",
      metadataParsed.error.issues[0]?.message ?? "Invalid metadata",
    );
  }

  // Both photos required (per product spec: front + back minimum).
  const frontImage = form.get("frontImage");
  const backImage = form.get("backImage");
  if (!(frontImage instanceof File) || !(backImage instanceof File)) {
    return err(
      "VALIDATION_ERROR",
      "Both front and back photos are required.",
    );
  }
  for (const [label, f] of [["front", frontImage], ["back", backImage]] as const) {
    if (f.size > MAX_PHOTO_BYTES) {
      return err(
        "PHOTO_TOO_LARGE",
        `Each photo must be under 8 MB (${label} is ${Math.round(f.size / 1024 / 1024)} MB).`,
        413,
      );
    }
    if (!ACCEPTED_MIME.includes(f.type)) {
      return err("PHOTO_TYPE", "Photos must be JPEG, PNG, or WebP.", 415);
    }
  }

  // Quota check on user_photo specifically — Essential plan caps at 3.
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { clientPlan: true },
  });
  const plan = isValidClientPlan(user?.clientPlan) ? user!.clientPlan : "essential";
  const allowed = await canAddWardrobeItem(userId, plan, "user_photo");
  if (!allowed.ok) {
    const code = allowed.reason === "personal_full" ? "PERSONAL_FULL" : "WARDROBE_FULL";
    const message =
      allowed.reason === "personal_full"
        ? `You've used all ${allowed.quota.maxPersonalPhotos} personal photo slots on the ${plan} plan. Upgrade or remove a personal item to add more.`
        : `Wardrobe is full (${allowed.quota.itemsUsed}/${allowed.quota.maxItems} slots used).`;
    return err(code, message, 409);
  }

  // ── Create the row first, then upload — gives us the itemId for the path
  // and lets the wardrobe UI optimistically show "Processing…" right away.

  const item = await db.wardrobeItem.create({
    data: {
      userId,
      sourceType: "user_photo",
      category: metadataParsed.data.category,
      subcategory: metadataParsed.data.subcategory,
      color: metadataParsed.data.color,
      brand: metadataParsed.data.brand,
      nickname: metadataParsed.data.nickname,
      processingStatus: "pending_upload",
    },
  });

  try {
    const frontPath = buildWardrobePhotoPath(userId, item.id, "front", frontImage.type);
    const backPath = buildWardrobePhotoPath(userId, item.id, "back", backImage.type);

    await Promise.all([
      uploadWardrobePhoto(frontImage, frontPath),
      uploadWardrobePhoto(backImage, backPath),
    ]);

    // v1: no AI processing pipeline yet — go straight to ready with the
    // raw front photo as the visual asset. When background-removal lands,
    // this branch flips to `processing` and a worker fills processedAssetPath.
    const updated = await db.wardrobeItem.update({
      where: { id: item.id },
      data: {
        frontImagePath: frontPath,
        backImagePath: backPath,
        processingStatus: "ready",
      },
      select: {
        id: true,
        category: true,
        nickname: true,
        processingStatus: true,
      },
    });

    return ok({ item: updated }, 201);
  } catch (e) {
    // Roll the row back to `failed` so the user sees the truth in the
    // wardrobe (rather than a pending item that never moves). We don't
    // delete the row entirely — keeping it lets the user retry without
    // re-entering metadata.
    await db.wardrobeItem
      .update({
        where: { id: item.id },
        data: { processingStatus: "failed" },
      })
      .catch(() => null);

    // Log the real error server-side for ops; show the user a clean
    // generic message. Previously we returned `e.message` directly,
    // which leaked internal details like missing-env-var names
    // ("SUPABASE_SERVICE_ROLE_KEY is not set…") straight into the UI.
    console.error("[/api/wardrobe/items/upload]", e);
    return err(
      "UPLOAD_FAILED",
      "We couldn't upload your photo. Please try again in a moment — if it keeps failing, get in touch.",
      500,
    );
  }
}
