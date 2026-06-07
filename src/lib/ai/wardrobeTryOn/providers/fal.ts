import "server-only";

/**
 * fal.ai provider for the wardrobe-driven outfit try-on — STUB.
 *
 * Today this returns "not implemented" — see geminiTryOnProvider for the
 * shipping path. The reason this file exists at all is so that the moment
 * we swap providers, it's a one-line change (`TRYON_PROVIDER=fal` env var)
 * and not a code refactor.
 *
 * When wiring this for real:
 *   1. Pick the fal model — most likely fashn/tryon (single-item) repeatedly
 *      for multi-item, OR a newer multi-garment endpoint if one exists.
 *   2. Pass through public/signed URLs for selfie + each item image (fal
 *      requires hosted URLs; consult `getSignedTryonUrl` for the selfie
 *      and `getSignedWardrobeUrl` for items).
 *   3. Map the multi-call result into a single TryOnResult.imageBuffer —
 *      fal returns hosted URLs, so download the final image and convert.
 *   4. Add an integration test once the live keys are configured.
 *
 * The pre-existing `src/lib/ai/fal/tryon.ts` handles the SINGLE-garment
 * brand-widget flow and should NOT be repurposed here — different inputs,
 * different ownership boundary, different ratelimit.
 */

import type { TryOnProvider, TryOnResult } from "../types";

export const falTryOnProvider: TryOnProvider = {
  name: "fal",
  async generate(): Promise<TryOnResult> {
    return {
      success: false,
      reason:
        "The fal.ai try-on provider is not yet wired. Set TRYON_PROVIDER=gemini or implement this stub.",
    };
  },
};
