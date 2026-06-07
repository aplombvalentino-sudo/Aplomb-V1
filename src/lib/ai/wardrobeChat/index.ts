import "server-only";

/**
 * AI Outfit Assistant — wardrobe-aware chatbot.
 *
 * Uses Gemini's text model (gemini-2.5-flash by default, configurable via
 * GEMINI_MODEL — the same text model used by the brand-side outfit
 * recommender) to answer the user's free-form wardrobe questions. The
 * prompt embeds:
 *
 *   - a compact JSON representation of every ready item in the user's
 *     wardrobe (id, type, category, color, material, description, size,
 *     brand), so the model can recommend BY ID
 *   - the conversation history so the chat feels stateful
 *   - the latest user message
 *
 * The model is asked to return JSON with two fields:
 *   { reply: string; recommendedItemIds: string[] }
 *
 * - `reply` is what the chat surfaces to the user
 * - `recommendedItemIds` references actual wardrobe items so the UI can
 *   render thumbnail chips beneath the message
 *
 * Hallucinated item ids are stripped before returning.
 *
 * No streaming today — Gemini's text model returns a complete response in
 * a couple of seconds, which is acceptable here. If volume calls for
 * lower latency / progressive rendering later, swap to streaming without
 * changing the public function signature.
 */

import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini/client";
import type { WardrobeItemListEntry } from "@/lib/wardrobe/items";
import type { BrandCatalogEntry } from "@/lib/wardrobe/brandCatalog";

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type WardrobeChatInput = {
  wardrobe: WardrobeItemListEntry[];
  /** Brand catalog sample for Model-plan cross-brand recommendations.
   *  Empty array for Fashion / Essential. */
  brandCatalog: BrandCatalogEntry[];
  /** True only for Model. Toggles the prompt mode + whether the brand
   *  catalog is embedded in the system prompt at all. */
  crossBrandEnabled: boolean;
  history: ChatHistoryMessage[];
  userMessage: string;
};

export type WardrobeChatResult =
  | {
      success: true;
      reply: string;
      /** Wardrobe item ids the assistant cited — always validated against
       *  the user's saved items before being returned. */
      recommendedItemIds: string[];
      /** Brand product ids the assistant cited from the cross-brand
       *  catalog. ALWAYS empty when crossBrandEnabled is false. */
      recommendedBrandProductIds: string[];
    }
  | {
      success: false;
      reason: string;
    };

/** Compact, prompt-friendly JSON describing one wardrobe item. Kept tight
 *  to stay within the model context window even at Model-plan scale. */
function serialiseItemForPrompt(it: WardrobeItemListEntry): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: it.id,
    category: it.category,
  };
  if (it.type) out.type = it.type;
  if (it.color) out.color = it.color;
  if (it.material) out.material = it.material;
  if (it.size) out.size = it.size;
  if (it.brand) out.brand = it.brand;
  if (it.nickname) out.nickname = it.nickname;
  if (it.description) out.description = it.description;
  out.source = it.sourceType === "user_photo" ? "owned" : "certified";
  return out;
}

function serialiseBrandProduct(b: BrandCatalogEntry): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: b.id,
    name: b.name,
    brand: b.brand,
  };
  if (b.category) out.category = b.category;
  if (b.subcategory) out.subcategory = b.subcategory;
  if (b.description) out.description = b.description;
  return out;
}

function buildSystemPrompt(
  wardrobe: WardrobeItemListEntry[],
  brandCatalog: BrandCatalogEntry[],
  crossBrandEnabled: boolean,
): string {
  const items = wardrobe
    .filter((i) => i.usableInOutfit)
    .map(serialiseItemForPrompt);

  // Fashion / Essential branch — wardrobe-only.
  if (!crossBrandEnabled) {
    return `You are the Aplomb AI Outfit Assistant. Your ONLY job is to help the user build outfits FROM THE PIECES ALREADY IN THEIR DIGITAL WARDROBE, listed below as JSON. Never recommend pieces that aren't in this list. You are on the Fashion plan: cross-brand suggestions are NOT available — only the user's saved wardrobe.

Their wardrobe (${items.length} ready pieces):
${JSON.stringify(items)}

How to think:
- Use the type, color, material, description, size, and brand to reason about combinations.
- Prefer color harmony or considered contrast; check material compatibility (denim + cotton easy, satin + chunky knit fussy); balance silhouette (slim + relaxed, or matched volumes); consider dress code.
- When the user is vague ("what should I wear"), propose 2 or 3 concrete outfits rather than one — variety is more useful than a single guess.
- Reference pieces by name (nickname or "the {color} {type}") so the user can find them in their wardrobe.
- When you cite specific pieces, ALSO put their ids in recommendedItemIds so the UI can render thumbnails.
- Briefly explain WHY each outfit works (1 sentence). Don't lecture.
- If the wardrobe genuinely can't support what the user wants, say so honestly and suggest what type of missing piece would help — DO NOT invent items, DO NOT recommend specific brands.

OUTPUT FORMAT — strict JSON, no prose around it:
{
  "reply": "your conversational message to the user, 1–4 short paragraphs, no markdown lists, no item ids in the text",
  "recommendedItemIds": ["<wardrobe item id>", "..."],
  "recommendedBrandProductIds": []
}

recommendedBrandProductIds MUST be an empty array — cross-brand is locked on this plan. The reply field is what the user reads; the id arrays are invisible side-channels for the UI to render thumbnails.`;
  }

  // Model branch — wardrobe + cross-brand catalog.
  const brandSamples = brandCatalog.map(serialiseBrandProduct);
  return `You are the Aplomb AI Outfit Assistant on the Model plan. You help the user build the best outfits by mixing TWO sources of pieces:

  1. The user's saved WARDROBE (pieces they already own).
  2. The platform's BRAND CATALOG (pieces they could add — across every active brand on Aplomb).

You may recommend from EITHER source. Prefer the wardrobe when something already in it works; only suggest brand pieces when they fill a real gap or genuinely improve a look the user couldn't build from their wardrobe alone.

User's wardrobe (${items.length} ready pieces):
${JSON.stringify(items)}

Brand catalog (${brandSamples.length} sampled pieces across all active brands):
${JSON.stringify(brandSamples)}

How to think:
- Use type, color, material, description, size, and brand to reason about combinations.
- Color harmony or considered contrast; material compatibility; silhouette balance; dress code.
- When the user is vague, propose 2 or 3 concrete outfits — variety beats a single guess.
- Reference each piece by name (nickname for wardrobe, "the [brand] [name]" for brand pieces).
- When citing wardrobe pieces, put their ids in recommendedItemIds. When citing brand pieces, put theirs in recommendedBrandProductIds. UI uses both arrays to render the right chip variant ("From your wardrobe" vs "Suggested from brands").
- Briefly explain WHY each outfit works — 1 short sentence per outfit.
- Be honest if neither the wardrobe nor the catalog has what's needed.

OUTPUT FORMAT — strict JSON, no prose around it:
{
  "reply": "your conversational message to the user, 1–4 short paragraphs, no markdown lists, no ids in the text",
  "recommendedItemIds": ["<wardrobe item id>", "..."],
  "recommendedBrandProductIds": ["<brand product id>", "..."]
}

The reply field is what the user reads — warm, useful, concrete. The id arrays are invisible side-channels; ONLY put real ids from the JSON above into them.`;
}

export async function generateWardrobeChatReply(
  input: WardrobeChatInput,
): Promise<WardrobeChatResult> {
  if (!process.env.GEMINI_API_KEY) {
    return { success: false, reason: "AI provider not configured." };
  }

  let client: ReturnType<typeof getGeminiClient>;
  try {
    client = getGeminiClient();
  } catch (e) {
    return {
      success: false,
      reason: e instanceof Error ? e.message : "AI client unavailable.",
    };
  }

  const systemPrompt = buildSystemPrompt(
    input.wardrobe,
    input.brandCatalog,
    input.crossBrandEnabled,
  );

  // Gemini's chat API takes alternating user/model turns. We pass the
  // SYSTEM prompt as the first user message (Gemini doesn't expose a
  // dedicated system role on getGenerativeModel) and the conversation
  // history after it. The latest userMessage is appended last.
  const contents = [
    { role: "user", parts: [{ text: systemPrompt }] },
    {
      role: "model",
      parts: [
        {
          text: 'Understood — I will only recommend pieces from the wardrobe JSON, return strict JSON with reply + recommendedItemIds, and explain combinations briefly.',
        },
      ],
    },
    ...input.history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: input.userMessage }] },
  ];

  try {
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });
    const result = await model.generateContent({ contents });
    const text = result.response?.text() ?? "";

    let parsed: {
      reply?: unknown;
      recommendedItemIds?: unknown;
      recommendedBrandProductIds?: unknown;
    };
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      return {
        success: false,
        reason: "The AI returned a malformed response. Try rephrasing.",
      };
    }

    const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
    if (!reply) {
      return {
        success: false,
        reason: "The AI returned an empty reply. Try rephrasing.",
      };
    }

    // Validate both id arrays against the source sets:
    //   - wardrobe ids must match the user's saved items
    //   - brand ids must match the catalog we sent in the prompt
    // Anything else is hallucination — drop silently.
    const validWardrobeIds = new Set(input.wardrobe.map((w) => w.id));
    const validBrandIds = new Set(input.brandCatalog.map((b) => b.id));

    const recommendedItemIds = Array.isArray(parsed.recommendedItemIds)
      ? parsed.recommendedItemIds
          .filter((x): x is string => typeof x === "string")
          .filter((id) => validWardrobeIds.has(id))
          .slice(0, 12)
      : [];

    // Even if the model returned brand ids on a non-cross-brand plan
    // (it shouldn't — the prompt forbids it — but defence in depth),
    // we drop them. The plan gate is the source of truth.
    const recommendedBrandProductIds = input.crossBrandEnabled
      ? Array.isArray(parsed.recommendedBrandProductIds)
        ? parsed.recommendedBrandProductIds
            .filter((x): x is string => typeof x === "string")
            .filter((id) => validBrandIds.has(id))
            .slice(0, 12)
        : []
      : [];

    return {
      success: true,
      reply,
      recommendedItemIds,
      recommendedBrandProductIds,
    };
  } catch (e) {
    console.error("[wardrobeChat.gemini] generate failed", e);
    const description = e instanceof Error ? e.message : String(e);
    const lower = description.toLowerCase();
    if (lower.includes("quota") || lower.includes("429") || lower.includes("resource_exhausted")) {
      return {
        success: false,
        reason: "AI quota exhausted. Try again later or upgrade.",
      };
    }
    if (lower.includes("not_found") || lower.includes("404")) {
      return {
        success: false,
        reason: `Model ${GEMINI_MODEL} isn't available to your account.`,
      };
    }
    return {
      success: false,
      reason: "The AI assistant is temporarily unavailable. Please try again.",
    };
  }
}
