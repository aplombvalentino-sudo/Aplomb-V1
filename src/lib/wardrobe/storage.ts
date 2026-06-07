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
 * Maximum number of paths handed to a single Supabase `createSignedUrls`
 * call. Supabase documents an upper bound on this endpoint; 100 is a safe
 * conservative chunk that's never been observed to fail in practice.
 *
 * If you need to raise it, also widen the test coverage in
 * `storage.test.ts` ("chunks at the configured BATCH_SIZE boundary").
 */
const SIGN_BATCH_SIZE = 100;

/**
 * Batch-sign many wardrobe photo paths with as few Supabase round-trips as
 * possible.
 *
 * Why this exists: rendering the wardrobe grid used to hammer Supabase with
 * one `createSignedUrl` per user_photo card (N+1). Supabase exposes a
 * `createSignedUrls` plural endpoint that signs an array of paths in one
 * call — collapsing N round-trips into ⌈N/BATCH⌉.
 *
 * Returns a Map<path, signedUrl> so callers can match URLs back to rows.
 * Paths that fail to sign are silently omitted from the map (callers should
 * treat a missing key as "no thumbnail available"). Empty input → empty map.
 *
 * Chunking: Supabase caps `createSignedUrls` at a fixed number of paths per
 * call (see SIGN_BATCH_SIZE). For a 100-slot wardrobe under the Model plan
 * that's exactly one call; for an Unlimited (∞) plan that crosses the
 * threshold the unique path set is sliced into BATCH-sized chunks and each
 * chunk is signed in parallel. A failure in one chunk is contained: the
 * other chunks still populate the map and the page renders with
 * placeholders for the failed chunk only — we never throw away the entire
 * batch for one upstream hiccup.
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

  // Slice the unique path list into BATCH-sized chunks. For most plans
  // this is one chunk; for Unlimited / Model wardrobes that exceed the
  // batch cap it's a small handful.
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += SIGN_BATCH_SIZE) {
    chunks.push(unique.slice(i, i + SIGN_BATCH_SIZE));
  }

  const svc = getSupabaseServiceClient();
  // Sign every chunk in parallel — they share the service client but the
  // underlying HTTP calls are independent, so wall-clock is one round-trip
  // not N. We use Promise.allSettled so one chunk failing doesn't drop
  // the URLs we already signed in the others.
  const results = await Promise.allSettled(
    chunks.map((chunk) =>
      svc.storage.from(WARDROBE_BUCKET).createSignedUrls(chunk, ttlSeconds),
    ),
  );

  for (const settled of results) {
    if (settled.status === "rejected") {
      // Network / runtime exception. Log and skip; the other chunks may
      // still populate the map.
      console.warn(
        "[wardrobe.storage] batch sign chunk threw:",
        settled.reason instanceof Error ? settled.reason.message : settled.reason,
      );
      continue;
    }
    const { data, error } = settled.value;
    if (error || !data) {
      // Supabase-reported error for one chunk. Same posture: log + skip.
      console.warn("[wardrobe.storage] batch sign chunk failed:", error?.message);
      continue;
    }
    for (const row of data) {
      if (row.signedUrl && row.path) out.set(row.path, row.signedUrl);
    }
  }
  return out;
}

// Exported only for tests — lets us assert chunking behaviour against the
// authoritative constant rather than hard-coding 100 in two places.
export const _SIGN_BATCH_SIZE_FOR_TESTS = SIGN_BATCH_SIZE;

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
