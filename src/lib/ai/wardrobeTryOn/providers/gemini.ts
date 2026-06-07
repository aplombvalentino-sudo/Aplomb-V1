import "server-only";

/**
 * Gemini provider for the wardrobe-driven outfit try-on.
 *
 * Uses Google's image-capable model (Nano Banana family, model id
 * "gemini-2.5-flash-image-preview" / overridable via GEMINI_TRYON_MODEL).
 * The text-only `GEMINI_MODEL` used by `src/lib/ai/gemini/outfits.ts` is
 * NOT the right model here — that one is gemini-2.5-flash, which cannot
 * return image bytes.
 *
 * Prompt strategy:
 *   - Image 1 = the user's selfie.
 *   - Image 2..N = each clothing piece, in slot order.
 *   - The text part asks the model to render the SAME person, same pose,
 *     same lighting and background, wearing the supplied pieces.
 *
 * When the API key is missing or the model returns no image, we surface a
 * sanitised failure reason — never the raw provider error (which can
 * contain API keys, request IDs, and other internals).
 *
 * If this provider ever moves to the streaming/async API, the wrapper still
 * returns one TryOnResult; the route handler doesn't need to know.
 */

import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import type { TryOnInput, TryOnProvider, TryOnResult } from "../types";

const DEFAULT_MODEL = "gemini-2.5-flash-image-preview";

function buildPrompt(input: TryOnInput): string {
  const pieces = input.items
    .map((it, i) => {
      const tag = it.label ?? it.category ?? it.position;
      return `Image ${i + 2} is the ${it.position}${tag && tag !== it.position ? ` ("${tag}")` : ""}.`;
    })
    .join(" ");

  return `Image 1 is a real photograph of a person. Replace the clothing they are wearing with the items shown in the following images, keeping every other aspect of the photograph the same.

${pieces}

Hard requirements:
- KEEP the person's face, skin tone, body proportions, hair, and pose EXACTLY as they are in image 1.
- KEEP the original background and lighting from image 1.
- The clothing items must fit the person's body naturally — realistic folds, shadows, drape, and seams.
- Do not invent new garments. Use only the pieces shown in the supplied item images. If a piece does not naturally fit the person's silhouette (e.g. a child-sized item on an adult), scale it sensibly rather than refusing.
- Produce a single, photorealistic image at high quality.

Output: one image. No text.`;
}

export const geminiTryOnProvider: TryOnProvider = {
  name: "gemini",

  async generate(input: TryOnInput): Promise<TryOnResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        reason: "AI provider not configured. Try again later.",
      };
    }

    const modelId = process.env.GEMINI_TRYON_MODEL ?? DEFAULT_MODEL;
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
      const response = await model.generateContent({
        contents: [{ role: "user", parts }],
      });

      // The image-capable model returns inlineData parts on the candidate.
      // Pull the first one with image bytes; ignore any text parts.
      const candidate = response.response?.candidates?.[0];
      const out = candidate?.content?.parts?.find(
        (p) =>
          "inlineData" in p &&
          p.inlineData?.data &&
          p.inlineData.mimeType?.startsWith("image/"),
      );

      if (!out || !("inlineData" in out) || !out.inlineData?.data) {
        // The model often returns just a safety verdict here. Don't echo
        // the raw text — sanitise.
        return {
          success: false,
          reason: "The AI couldn't produce an image for this outfit. Try a clearer selfie or different items.",
        };
      }

      return {
        success: true,
        imageBuffer: Buffer.from(out.inlineData.data, "base64"),
        imageMime: out.inlineData.mimeType ?? "image/png",
        providerMeta: { model: modelId },
      };
    } catch (e) {
      // Log the real error server-side for ops; return a clean reason to
      // the caller.
      console.error("[wardrobeTryOn.gemini] generate failed", e);
      return {
        success: false,
        reason: "The AI try-on service is busy. Please try again in a moment.",
      };
    }
  },
};
