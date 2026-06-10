/**
 * Client-side photo validation for the wardrobe flow. Limits + MIME list
 * are RE-EXPORTED from the canonical neutral module at
 * `src/lib/wardrobe/photoLimits.ts` so the client reject and the server
 * reject use the same values literally — change the constant there,
 * both sides update.
 *
 * Endpoints kept in sync via this shared module:
 *   - POST /api/wardrobe/items/upload   (front + back item photos)
 *   - POST /api/outfits/wardrobe/try-on (selfie + try-on, multipart)
 *   - POST /api/outfits/wardrobe/[id]/regenerate (selfie regenerate)
 */

import {
  MAX_PHOTO_BYTES,
  ACCEPTED_PHOTO_MIME,
  MAX_PHOTO_LABEL,
  isAcceptedPhotoMime,
} from "@/lib/wardrobe/photoLimits";

export { MAX_PHOTO_BYTES, ACCEPTED_PHOTO_MIME, MAX_PHOTO_LABEL };

export type PhotoValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Client-side guard before a File hits any upload-related state. Returns
 * a structured result so the caller can render the reason inline.
 *
 *   const r = validatePhotoFile(f);
 *   if (!r.ok) { setReject(r.reason); return; }
 *   onFile(f);
 */
export function validatePhotoFile(file: File): PhotoValidationResult {
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, reason: `Photo must be under ${MAX_PHOTO_LABEL}.` };
  }
  if (!isAcceptedPhotoMime(file.type)) {
    return { ok: false, reason: "Photo must be JPEG, PNG, or WebP." };
  }
  return { ok: true };
}
