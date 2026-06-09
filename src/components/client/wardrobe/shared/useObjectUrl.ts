"use client";

import { useEffect, useState } from "react";

/**
 * Memoised `URL.createObjectURL` for a File — created on the supplied
 * file changing, revoked on unmount. Returns null when no file is set.
 *
 * Why every consumer renders the result via a raw `<img>` (and NOT
 * next/image): the URL is a `blob:` from `URL.createObjectURL()`. It
 * isn't a network resource — there's no host to add to
 * next.config.ts `remotePatterns`, no upstream to fetch from, and the
 * blob lifecycle is tied to the consuming component's mount.
 * next/image with `unoptimized` would technically render it but adds
 * zero value (no optimization happens for blob URLs, no caching, no
 * CDN). The raw `<img>` is the right tool here.
 *
 * Call sites today (all with the matching
 * `// eslint-disable-next-line @next/next/no-img-element` comment):
 *   - capture flow ReviewSlot (front + back review tiles)
 *   - capture flow PhotoSlot   (the active picker preview)
 *   - outfit-builder SelfieStep (the selfie picker preview)
 */
export function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}
