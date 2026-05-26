/**
 * fal.ai SDK client.
 *
 * Required env var:
 *   FAL_KEY  — provided by you (format: <key_id>:<key_secret>)
 *
 * We initialise on first use so the import doesn't crash builds without keys.
 */

import { fal } from "@fal-ai/client";

let _configured = false;

export function getFalClient() {
  if (!_configured) {
    const key = process.env.FAL_KEY;
    if (!key) {
      throw new Error(
        "FAL_KEY is not set. Add it to .env.local and Vercel environment variables.",
      );
    }
    fal.config({ credentials: key });
    _configured = true;
  }
  return fal;
}
