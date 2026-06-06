import "server-only";

/**
 * Storage helpers for the user-photo wardrobe-items bucket.
 *
 * Mirror of `src/lib/ai/storage.ts` but for personal clothing photos rather
 * than body scans. Same posture: private bucket, signed URLs handed out one
 * at a time, never expose paths to the client.
 *
 * Manual setup required once in Supabase dashboard:
 *   1. Create bucket "wardrobe-items" with Public = OFF.
 *   2. Default RLS = service-role-only (we never use the anon client here).
 *   3. (Optional) configure object lifecycle to auto-delete after N days
 *      for orphaned uploads (createdAt < N days AND no WardrobeItem row).
 */

import { getSupabaseServiceClient } from "@/lib/supabase";

export const WARDROBE_BUCKET = "wardrobe-items";

/** Default lifetime of a signed URL handed to a browser client (seconds). */
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 30; // 30 minutes

export type UploadedWardrobePhoto = {
  /** Path inside the bucket, e.g. "users/<userId>/<itemId>/front.jpg" */
  path: string;
};

export async function uploadWardrobePhoto(
  file: File,
  pathInsideBucket: string,
): Promise<UploadedWardrobePhoto> {
  const svc = getSupabaseServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await svc.storage
    .from(WARDROBE_BUCKET)
    .upload(pathInsideBucket, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });
  if (error) {
    throw new Error(`Wardrobe photo upload failed: ${error.message}`);
  }
  return { path: pathInsideBucket };
}

export async function getSignedWardrobeUrl(
  path: string,
  ttlSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS,
): Promise<string> {
  const svc = getSupabaseServiceClient();
  const { data, error } = await svc.storage
    .from(WARDROBE_BUCKET)
    .createSignedUrl(path, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to sign wardrobe-photo URL: ${error?.message ?? "unknown"}`);
  }
  return data.signedUrl;
}

/**
 * Batch-sign many wardrobe photo paths in a single Supabase round-trip.
 *
 * Why this exists: rendering the wardrobe grid used to hammer Supabase with
 * one `createSignedUrl` per user_photo card (N+1). Supabase exposes a
 * `createSignedUrls` plural endpoint that signs an array of paths server-side
 * in one call — collapsing N round-trips into 1.
 *
 * Returns a Map<path, signedUrl> so callers can match URLs back to rows.
 * Paths that fail to sign are silently omitted from the map (callers should
 * treat a missing key as "no thumbnail available"). Empty input → empty map.
 *
 * Caveat: Supabase caps `createSignedUrls` at ~100 paths per call. If we
 * ever ship Unlimited (Model) wardrobes that exceed this in one view, chunk
 * here. For now the 40-slot Fashion cap keeps every page well under.
 */
export async function getSignedWardrobeUrls(
  paths: string[],
  ttlSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;

  // De-dupe so the same path (e.g. the same item referenced from two outfits)
  // never gets signed twice in one request.
  const unique = Array.from(new Set(paths));

  const svc = getSupabaseServiceClient();
  const { data, error } = await svc.storage
    .from(WARDROBE_BUCKET)
    .createSignedUrls(unique, ttlSeconds);

  if (error || !data) {
    // Don't blow up the whole page render if a single signing call fails —
    // log + return empty so consumers fall back to placeholders.
    console.warn("[wardrobe.storage] batch sign failed:", error?.message);
    return out;
  }

  for (const row of data) {
    if (row.signedUrl && row.path) out.set(row.path, row.signedUrl);
  }
  return out;
}

/**
 * Delete a wardrobe photo. Called when a user removes an item from their
 * wardrobe (or when their account is erased — see lib/userErasure.ts).
 */
export async function deleteWardrobePhoto(path: string): Promise<void> {
  const svc = getSupabaseServiceClient();
  await svc.storage.from(WARDROBE_BUCKET).remove([path]).catch(() => null);
}

/**
 * Build the canonical bucket path for one of a wardrobe item's photos.
 * `users/<userId>/<itemId>/{front|back|processed}.<ext>`
 *
 * Scoping by userId makes admin cleanups easier and gives us a free
 * "all photos for user X" listing if we ever need it.
 */
export function buildWardrobePhotoPath(
  userId: string,
  itemId: string,
  kind: "front" | "back" | "processed",
  mimeType: string,
): string {
  const ext = mimeType.includes("png")
    ? "png"
    : mimeType.includes("webp")
      ? "webp"
      : "jpg";
  return `users/${userId}/${itemId}/${kind}.${ext}`;
}
