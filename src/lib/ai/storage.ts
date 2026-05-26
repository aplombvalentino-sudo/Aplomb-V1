/**
 * Body-scan photo storage helpers.
 *
 * Photos go into a PRIVATE Supabase Storage bucket (`body-scans`). Nothing
 * here is exposed to clients — they only receive the signed URL during the
 * upstream AI call, never in API responses.
 *
 * One-time setup required in Supabase dashboard:
 *   1. Create bucket "body-scans" with Public = OFF.
 *   2. Add RLS policy: only the service role can read/write (default for private buckets).
 *   3. (Optional) configure object lifecycle to auto-delete after N hours.
 */

import { getSupabaseServiceClient } from "@/lib/supabase";

export const BODY_SCAN_BUCKET = "body-scans";

/** Default lifetime of a signed URL handed to AI providers (seconds). */
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 30; // 30 minutes

export type UploadedScan = {
  /** Path inside the bucket (e.g. "scans/<sessionId>/front.jpg") */
  path: string;
};

export async function uploadBodyScan(
  file: File,
  pathInsideBucket: string,
): Promise<UploadedScan> {
  const svc = getSupabaseServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await svc.storage
    .from(BODY_SCAN_BUCKET)
    .upload(pathInsideBucket, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });
  if (error) {
    throw new Error(`Body scan upload failed: ${error.message}`);
  }
  return { path: pathInsideBucket };
}

export async function getSignedBodyScanUrl(
  path: string,
  ttlSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS,
): Promise<string> {
  const svc = getSupabaseServiceClient();
  const { data, error } = await svc.storage
    .from(BODY_SCAN_BUCKET)
    .createSignedUrl(path, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to sign body-scan URL: ${error?.message ?? "unknown"}`);
  }
  return data.signedUrl;
}

/**
 * Delete a stored body-scan photo. Call after derived measurements are
 * persisted if your retention policy requires no raw photo storage.
 */
export async function deleteBodyScan(path: string): Promise<void> {
  const svc = getSupabaseServiceClient();
  await svc.storage.from(BODY_SCAN_BUCKET).remove([path]).catch(() => null);
}

/** Build a stable path: scans/<sessionId>/{front|side}.<ext> */
export function buildScanPath(sessionId: string, kind: "front" | "side", mimeType: string) {
  const ext = mimeType.includes("png") ? "png" : "jpg";
  return `scans/${sessionId}/${kind}.${ext}`;
}
