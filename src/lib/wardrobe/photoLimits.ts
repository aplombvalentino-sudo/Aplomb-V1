/**
 * SINGLE SOURCE OF TRUTH for the photo-upload limits used everywhere in
 * the wardrobe flow:
 *
 *   - POST /api/wardrobe/items/upload           (front + back item photos)
 *   - POST /api/outfits/wardrobe/try-on         (selfie + try-on)
 *   - POST /api/outfits/wardrobe/[id]/regenerate (selfie regenerate)
 *   - client: components/client/wardrobe/shared/validators.ts
 *     (capture flow PhotoSlot + outfit-builder SelfieStep)
 *
 * Change a limit here and BOTH the client-side reject (before the bytes
 * hit the wire) AND the server-side reject (415 / 413 responses) stay
 * in sync. No `"use client"` and no `server-only` marker — this file is
 * intentionally environment-neutral so it can be imported from either
 * side of the boundary.
 *
 * Keep this module SMALL. If you need React, Buffer, or Node fs, put
 * those in a separate module that imports this one — don't pollute the
 * neutral constants.
 */

/** Maximum size for any single photo, in bytes. 8 MB. */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/** MIME types accepted by every photo upload endpoint. */
export const ACCEPTED_PHOTO_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Human-readable limit string for help text + reject messages. */
export const MAX_PHOTO_LABEL = "8 MB";

/** Returns true when the MIME is one we accept. Hardened against the
 *  readonly-tuple type so call sites don't need to widen first. */
export function isAcceptedPhotoMime(mime: string): boolean {
  return (ACCEPTED_PHOTO_MIME as readonly string[]).includes(mime);
}
