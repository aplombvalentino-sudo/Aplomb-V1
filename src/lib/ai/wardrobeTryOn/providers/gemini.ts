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

/**
 * Render one piece into a dense, model-readable bullet that names EVERY
 * known attribute the user saved at capture time. The more fields we
 * surface, the harder it is for the model to fall back to "echo image 1
 * unchanged" — each attribute is one more signal that the rendered
 * piece must visibly differ from whatever the person is wearing in the
 * selfie.
 *
 *   Image 3 is the bottom (slot: bottom, type: Jeans, label: "Levi's
 *   511", brand: "Levi's", color: Indigo, material: Denim, size: 32,
 *   notes: "slim leg, dark wash, ankle-cropped").
 */
function describeItem(it: TryOnInput["items"][number], i: number): string {
  const attrs: string[] = [`slot: ${it.position}`];
  if (it.type) attrs.push(`type: ${it.type}`);
  if (it.label) attrs.push(`label: "${it.label}"`);
  if (it.category && it.category !== it.position && it.category !== it.type) {
    attrs.push(`category: ${it.category}`);
  }
  if (it.color) attrs.push(`color: ${it.color}`);
  if (it.material) attrs.push(`material: ${it.material}`);
  if (it.size) attrs.push(`size: ${it.size}`);
  if (it.description) attrs.push(`notes: "${it.description}"`);
  return `Image ${i + 2} is the ${it.position} — ${attrs.join(", ")}.`;
}

function buildPrompt(input: TryOnInput): string {
  const pieces = input.items.map((it, i) => describeItem(it, i)).join("\n");

  const heightLine = input.userHeightCm
    ? `The person in image 1 is ${input.userHeightCm} cm tall — render garment proportions accordingly (length, sleeve drop, hem position).`
    : "";

  return `Image 1 is a real photograph of a person. Generate a NEW photorealistic image where the person is wearing the clothing items described below, all of which are also provided as reference photos. The person's face, body, pose, background, and lighting must stay identical; ONLY the clothing changes.

Items the person is now wearing (every attribute below is authoritative — render it):
${pieces}

${heightLine}

ABSOLUTELY MANDATORY behaviour:
- You MUST visibly change the clothing on the person. Returning the original photo unchanged, or with only minor tweaks, is a FAILURE. Every garment shown in images 2..N MUST replace what the person is wearing in image 1, even if the original outfit and the new outfit look superficially similar.
- KEEP the person's face, skin tone, hair, body proportions, and pose EXACTLY as in image 1.
- KEEP the original background and lighting from image 1.
- Render each piece truthfully to its declared attributes — match the stated COLOR, MATERIAL (drape, weight, sheen), TYPE (silhouette), SIZE (fit/looseness/length), and the notes field. The reference photos in images 2..N are the visual source of truth; the attributes above resolve ambiguity when the photo is unclear.
- Take SIZE into account: smaller sizes sit closer to the body, larger sizes drape looser with more fabric at hem and sleeves.
- Take HEIGHT into account when positioning hems, sleeve ends, trouser breaks, and overall proportion.
- Material matters: denim and cotton crease, satin and silk flow, leather creases at joints, knit clings. Use the stated material to set drape and shine.
- Do NOT invent new garments. Use only the pieces provided. If a piece looks awkward on the silhouette, scale it sensibly — never refuse the swap.

Quality requirements:
- Photorealistic. Sharp focus. Natural skin texture. Realistic fabric texture, folds, shadows, seams, and stitching.
- 4K-grade output: high resolution, fine detail, no soft blurriness, no plasticky surfaces.
- Lighting and white balance must match image 1. No additional lighting, no studio flatness if the source is candid.
- The final image must look like a real photograph of the person taken in image 1's setting, wearing the new clothes — not a render, not a collage.

Output: ONE image, nothing else. Do not return text.`;
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
