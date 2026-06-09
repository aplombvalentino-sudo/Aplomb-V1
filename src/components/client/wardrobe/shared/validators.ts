/**
 * Photo upload validators shared across the wardrobe flow (wardrobe-item
 * capture + outfit-builder selfie). The limits MUST match the server's
 * Zod schemas in:
 *   - POST /api/wardrobe/items/upload   (front + back, 8 MB cap)
 *   - POST /api/outfits/wardrobe/try-on (selfie, 8 MB cap)
 * If either route's cap changes, change it here too — keep the client's
 * client-side block consistent with the server's reject so the user
 * never sees an upload start only to get rejected after the bytes hit
 * the wire.
 */

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB

export const ACCEPTED_PHOTO_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PhotoValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Client-side guard before a File hits any upload-related state. Returns
 * a structured result so the caller can render the reason inline.
 *
 * Caller usage:
 *   const r = validatePhotoFile(f);
 *   if (!r.ok) { setReject(r.reason); return; }
 *   onFile(f);
 */
export function validatePhotoFile(file: File): PhotoValidationResult {
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, reason: "Photo must be under 8 MB." };
  }
  if (!(ACCEPTED_PHOTO_MIME as readonly string[]).includes(file.type)) {
    return { ok: false, reason: "Photo must be JPEG, PNG, or WebP." };
  }
  return { ok: true };
}
