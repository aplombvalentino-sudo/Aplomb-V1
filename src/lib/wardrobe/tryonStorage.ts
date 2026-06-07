import "server-only";

/**
 * Storage helpers for the wardrobe-driven outfit try-on flow.
 *
 * Two object kinds live in this bucket per outfit:
 *   1. selfie.<ext>     — the user's input photo
 *   2. generated.png    — the AI-rendered image of the user in that outfit
 *
 * Same posture as wardrobe-items + body-scans buckets:
 *   - Private = ON.
 *   - service-role only writes; reads only via signed URLs minted server-side.
 *   - Manual setup needed in Supabase dashboard:
 *       1. Create bucket "outfit-tryons" with Public = OFF.
 *       2. Default RLS = service-role only.
 *
 * Why a dedicated bucket and not wardrobe-items? Different lifecycle
 * (an outfit might outlive any single wardrobe item the user owns), and
 * different access pattern (one signed URL per outfit row, not per item).
 */

import { getSupabaseServiceClient } from "@/lib/supabase";

export const TRYON_BUCKET = "outfit-tryons";

/** Default lifetime of a signed URL handed to a browser client (seconds). */
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 30; // 30 minutes

/** Upload arbitrary image bytes (selfie or generated) into the bucket. */
export async function uploadOutfitTryonObject(
  buffer: Buffer,
  pathInsideBucket: string,
  contentType: string,
): Promise<void> {
  const svc = getSupabaseServiceClient();
  const { error } = await svc.storage
    .from(TRYON_BUCKET)
    .upload(pathInsideBucket, buffer, {
      contentType,
      upsert: true,
    });
  if (error) {
    throw new Error(`Outfit try-on upload failed: ${error.message}`);
  }
}

/** Mint a short-lived signed URL for a path inside the try-on bucket. */
export async function getSignedTryonUrl(
  path: string,
  ttlSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS,
): Promise<string> {
  const svc = getSupabaseServiceClient();
  const { data, error } = await svc.storage
    .from(TRYON_BUCKET)
    .createSignedUrl(path, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to sign try-on URL: ${error?.message ?? "unknown"}`);
  }
  return data.signedUrl;
}

/**
 * Batch-sign many try-on paths in one round-trip — used by the outfits-list
 * page so we don't fire one signing call per outfit thumbnail.
 *
 * Same chunking + failure-isolation posture as `getSignedWardrobeUrls`.
 */
const SIGN_BATCH_SIZE = 100;
export async function getSignedTryonUrls(
  paths: string[],
  ttlSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;

  const unique = Array.from(new Set(paths));
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += SIGN_BATCH_SIZE) {
    chunks.push(unique.slice(i, i + SIGN_BATCH_SIZE));
  }

  let svc: ReturnType<typeof getSupabaseServiceClient>;
  try {
    svc = getSupabaseServiceClient();
  } catch (e) {
    console.warn(
      "[tryon.storage] service client unavailable, skipping batch sign:",
      e instanceof Error ? e.message : e,
    );
    return out;
  }

  const results = await Promise.allSettled(
    chunks.map((chunk) =>
      svc.storage.from(TRYON_BUCKET).createSignedUrls(chunk, ttlSeconds),
    ),
  );
  for (const settled of results) {
    if (settled.status === "rejected") {
      console.warn(
        "[tryon.storage] batch sign chunk threw:",
        settled.reason instanceof Error ? settled.reason.message : settled.reason,
      );
      continue;
    }
    const { data, error } = settled.value;
    if (error || !data) {
      console.warn("[tryon.storage] batch sign chunk failed:", error?.message);
      continue;
    }
    for (const row of data) {
      if (row.signedUrl && row.path) out.set(row.path, row.signedUrl);
    }
  }
  return out;
}

/** Delete every object the bucket holds for a given outfit. Called on outfit
 *  removal AND from eraseUser so right-to-erasure stays watertight. */
export async function deleteOutfitTryonObjects(
  userId: string,
  outfitId: string,
): Promise<void> {
  const svc = getSupabaseServiceClient();
  const prefix = `users/${userId}/outfits/${outfitId}/`;
  const { data: listing } = await svc.storage.from(TRYON_BUCKET).list(prefix).catch(() => ({ data: null }));
  if (!listing || listing.length === 0) return;
  const paths = listing.map((o) => `${prefix}${o.name}`);
  await svc.storage.from(TRYON_BUCKET).remove(paths).catch(() => null);
}

// ─── Path builders ──────────────────────────────────────────────────────────

export function buildSelfiePath(
  userId: string,
  outfitId: string,
  mimeType: string,
): string {
  const ext = mimeType.includes("png")
    ? "png"
    : mimeType.includes("webp")
      ? "webp"
      : "jpg";
  return `users/${userId}/outfits/${outfitId}/selfie.${ext}`;
}

export function buildGeneratedPath(
  userId: string,
  outfitId: string,
  mimeType: string = "image/png",
): string {
  const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
  return `users/${userId}/outfits/${outfitId}/generated.${ext}`;
}
