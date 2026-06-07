import "server-only";

/**
 * Gemini provider for the wardrobe-driven outfit try-on.
 *
 * Uses Google's image-capable Nano Banana model (defaults to
 * `gemini-2.5-flash-image`, overridable via GEMINI_TRYON_MODEL). The
 * text-only `GEMINI_MODEL` used by `src/lib/ai/gemini/outfits.ts` is the
 * WRONG model here — it cannot return image bytes.
 *
 * Two non-obvious requirements for image output to actually return image
 * data from the SDK:
 *   1. `responseModalities` MUST include "IMAGE". Without it the model
 *      either refuses or returns a text-only response.
 *   2. The model name must be a current image-capable id. As of writing
 *      that's `gemini-2.5-flash-image`. The earlier `-preview` suffix
 *      was retired; passing it returns a 404 NOT_FOUND.
 *
 * Prompt strategy:
 *   - Image 1 = the user's selfie.
 *   - Image 2..N = each clothing piece, in slot order.
 *   - The text part asks the model to render the SAME person, same pose,
 *     same lighting and background, wearing the supplied pieces.
 *
 * Error surface: we extract Google's status/message when present and
 * forward a TRUNCATED version on the failure reason so the user (and the
 * outfit row's `generationError`) sees something diagnostic instead of
 * the generic "the AI is busy" fallback. Setting AI_DEBUG_ERRORS=1 in
 * env additionally bypasses the safety truncation so ops can see the
 * raw provider text during debugging.
 */

import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import type { TryOnInput, TryOnProvider, TryOnResult } from "../types";

/**
 * Default model id.
 *
 * The ONLY image-capable Gemini model still available on Google's API as
 * of late 2025 is `gemini-2.5-flash-image` (the GA Nano Banana). Both
 * `gemini-2.5-flash-image-preview` and `gemini-2.0-flash-exp` were
 * retired and now return 404 NOT_FOUND regardless of account tier.
 *
 * REQUIRES BILLING ENABLED on the Google Cloud project tied to the
 * API key. Free tier (no billing) sets the per-project image-gen quota
 * to 0, so the first call returns 429 RESOURCE_EXHAUSTED ("limit usage")
 * even with a brand-new key. Enabling billing flips the quota to the
 * standard rate-limit and the model starts working.
 *
 * Cost: ~$0.039 per image (€0.036 at current rates). Existing rate
 * limiter (LIMITS.tryon_minute + LIMITS.tryon_daily) covers per-user
 * caps so one shopper can't burn the credits.
 *
 * If billing isn't an option, switch to fal.ai by setting
 * TRYON_PROVIDER=fal — the provider is fully implemented in
 * src/lib/ai/wardrobeTryOn/providers/fal.ts.
 */
const DEFAULT_MODEL = "gemini-2.5-flash-image";

function buildPrompt(input: TryOnInput): string {
  const pieces = input.items
    .map((it, i) => {
      const tag = it.label ?? it.category ?? it.position;
      const sizeBit = it.size ? `, owned in size ${it.size}` : "";
      return `Image ${i + 2} is the ${it.position}${tag && tag !== it.position ? ` ("${tag}")` : ""}${sizeBit}.`;
    })
    .join(" ");

  // Height is a strong fit signal: a "M" on 165cm hangs short; on 195cm
  // the same M is cropped. Surface it so the model can adjust drape +
  // proportion. If unknown, we just omit the line.
  const heightLine = input.userHeightCm
    ? `The person in image 1 is ${input.userHeightCm} cm tall — render garment proportions accordingly (length, sleeve drop, hem position).`
    : "";

  return `Image 1 is a real photograph of a person. Replace the clothing they are wearing with the items shown in the following images, keeping every other aspect of the photograph the same.

${pieces}

${heightLine}

Hard requirements:
- KEEP the person's face, skin tone, body proportions, hair, and pose EXACTLY as they are in image 1.
- KEEP the original background and lighting from image 1.
- The clothing items must fit the person's body naturally — realistic folds, shadows, drape, and seams.
- Take the stated SIZE of each piece into account when rendering fit: a smaller size sits closer to the body, larger sizes drape looser with more excess fabric at the hem and sleeves.
- Take the stated HEIGHT of the person into account when positioning hems, sleeve ends, and overall proportion.
- Do not invent new garments. Use only the pieces shown in the supplied item images. If a piece does not naturally fit the person's silhouette, scale it sensibly rather than refusing.
- Produce a single, photorealistic image at high quality.

Output: one image. No text.`;
}

/** Extract something user-readable from a Google SDK error. The SDK throws
 *  Error subclasses with a JSON-encoded body in `message`; we try to fish
 *  out the {status, message} from that, else fall back to the raw message. */
function describeGoogleError(e: unknown): string {
  if (!(e instanceof Error)) return String(e);
  const raw = e.message ?? "";
  // The SDK wraps the API response in a long string that contains a JSON
  // object with `error.status` and `error.message`. Match defensively.
  const jsonMatch = raw.match(/\{[\s\S]*"error"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        error?: { code?: number; status?: string; message?: string };
      };
      const code = parsed.error?.code;
      const status = parsed.error?.status;
      const message = parsed.error?.message;
      if (status && message) return `${status}${code ? ` ${code}` : ""}: ${message}`;
      if (message) return message;
    } catch {
      /* fall through */
    }
  }
  return raw;
}

/** Map a raw provider description to a short user-readable hint.
 *  We append the attempted model id so the user can see which model
 *  Google actually rejected — saves a round-trip when diagnosing. */
function userHint(description: string, modelId: string): string {
  const lower = description.toLowerCase();
  if (lower.includes("not_found") || lower.includes("404")) {
    return `Model "${modelId}" isn't available to your account (NOT_FOUND). Set GEMINI_TRYON_MODEL to a different image-capable model (try gemini-2.5-flash-image-preview or gemini-2.5-flash-image).`;
  }
  if (lower.includes("permission") || lower.includes("403")) {
    return `The Gemini API key doesn't have access to model "${modelId}". Enable image generation in Google AI Studio or Cloud Console.`;
  }
  if (lower.includes("quota") || lower.includes("rate") || lower.includes("429") || lower.includes("resource_exhausted")) {
    return `Image-gen quota exhausted for "${modelId}". Either enable billing on the Gemini project or set GEMINI_TRYON_MODEL to a different model with available quota.`;
  }
  if (lower.includes("invalid_argument") || lower.includes("400")) {
    return `Gemini rejected the request to "${modelId}" (${description.slice(0, 140)}). Try a clearer selfie or fewer items.`;
  }
  if (lower.includes("safety") || lower.includes("blocked")) {
    return "The AI safety filter blocked this try-on. Try a different selfie or items.";
  }
  // Fallback — surface a short snippet so the user can act, not a generic
  // "service is busy".
  return `AI generation failed on "${modelId}": ${description.slice(0, 160)}`;
}

export const geminiTryOnProvider: TryOnProvider = {
  name: "gemini",

  async generate(input: TryOnInput): Promise<TryOnResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        reason: "AI provider not configured. Set GEMINI_API_KEY in env.",
      };
    }

    const modelId = process.env.GEMINI_TRYON_MODEL ?? DEFAULT_MODEL;
    const debug = process.env.AI_DEBUG_ERRORS === "1";
    const ai = new GoogleGenerativeAI(apiKey);

    // Order matters — image 1 is the selfie, then each item in slot order.
    const parts: Part[] = [
      { text: buildPrompt(input) },
      {
        inlineData: {
          mimeType: input.selfieMime,
          data: input.selfieBuffer.toString("base64"),
        },
      },
      ...input.items.map((it) => ({
        inlineData: {
          mimeType: it.imageMime,
          data: it.imageBuffer.toString("base64"),
        },
      })),
    ];

    try {
      const model = ai.getGenerativeModel({ model: modelId });

      // `responseModalities` is required for image output but isn't in the
      // v0.24 SDK's typed config. Cast through `unknown` so TS doesn't fight
      // us; the runtime accepts and forwards it to the REST API.
      const response = await model.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        } as unknown as Record<string, unknown>,
      });

      // Pull the FIRST image part on any candidate. Defensive walk because
      // the model occasionally returns the image on candidate[1] when the
      // first candidate is a refusal text.
      const candidates = response.response?.candidates ?? [];
      let imagePart: Part | undefined;
      let textHint = "";
      for (const c of candidates) {
        for (const p of c.content?.parts ?? []) {
          if (
            "inlineData" in p &&
            p.inlineData?.data &&
            p.inlineData.mimeType?.startsWith("image/")
          ) {
            imagePart = p as Part;
            break;
          }
          if ("text" in p && p.text) textHint = p.text.slice(0, 240);
        }
        if (imagePart) break;
      }

      if (!imagePart || !("inlineData" in imagePart) || !imagePart.inlineData?.data) {
        // Log full response for ops; user message hints at the cause.
        console.warn(
          "[wardrobeTryOn.gemini] no image in response",
          JSON.stringify({
            model: modelId,
            candidates: candidates.length,
            firstFinishReason: candidates[0]?.finishReason,
            promptFeedback: response.response?.promptFeedback,
            textHint,
          }),
        );
        const reason = textHint
          ? `The AI returned text instead of an image: "${textHint.slice(0, 120)}…"`
          : "The AI couldn't produce an image for this outfit. Try a clearer selfie or different items.";
        return { success: false, reason };
      }

      return {
        success: true,
        imageBuffer: Buffer.from(imagePart.inlineData.data, "base64"),
        imageMime: imagePart.inlineData.mimeType ?? "image/png",
        providerMeta: { model: modelId },
      };
    } catch (e) {
      const description = describeGoogleError(e);
      // Log the full error server-side for ops.
      console.error("[wardrobeTryOn.gemini] generate failed", {
        model: modelId,
        description,
        raw: e instanceof Error ? e.message : String(e),
      });
      // User-facing message: short, actionable. Includes the attempted
      // model + a snippet of the real cause unless AI_DEBUG_ERRORS=1
      // surfaces it in full.
      const reason = debug
        ? `[debug] model=${modelId} :: ${description}`
        : userHint(description, modelId);
      return { success: false, reason };
    }
  },
};
