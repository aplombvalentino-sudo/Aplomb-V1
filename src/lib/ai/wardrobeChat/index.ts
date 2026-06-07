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

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type WardrobeChatInput = {
  wardrobe: WardrobeItemListEntry[];
  history: ChatHistoryMessage[];
  userMessage: string;
};

export type WardrobeChatResult =
  | {
      success: true;
      reply: string;
      recommendedItemIds: string[];
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

function buildSystemPrompt(wardrobe: WardrobeItemListEntry[]): string {
  const items = wardrobe
    .filter((i) => i.usableInOutfit)
    .map(serialiseItemForPrompt);

  return `You are the Aplomb AI Outfit Assistant. Your ONLY job is to help the user build outfits FROM THE PIECES ALREADY IN THEIR DIGITAL WARDROBE, listed below as JSON. Never recommend pieces that aren't in this list.

Their wardrobe (${items.length} ready pieces):
${JSON.stringify(items)}

How to think:
- Use the type, color, material, description, size, and brand to reason about combinations.
- Prefer color harmony or considered contrast; check material compatibility (denim + cotton easy, satin + chunky knit fussy); balance silhouette (slim + relaxed, or matched volumes); consider dress code.
- When the user is vague ("what should I wear"), propose 2 or 3 concrete outfits rather than one — variety is more useful than a single guess.
- Reference pieces by name (nickname or "the {color} {type}") so the user can find them in their wardrobe.
- When you cite specific pieces, ALSO put their ids in recommendedItemIds so the UI can render thumbnails.
- Briefly explain WHY each outfit works (1 sentence). Don't lecture.
- If the wardrobe genuinely can't support what the user wants, say so honestly and suggest the missing piece type — don't invent items.

OUTPUT FORMAT — strict JSON, no prose around it:
{
  "reply": "your conversational message to the user, 1–4 short paragraphs, no markdown lists, no item ids in the text",
  "recommendedItemIds": ["<wardrobe item id>", "..."]
}

The reply field is what the user reads — it must be warm, useful, and concrete. The recommendedItemIds field is invisible to the user; it lets the UI render the pieces you cited.`;
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

  const systemPrompt = buildSystemPrompt(input.wardrobe);

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

    let parsed: { reply?: unknown; recommendedItemIds?: unknown };
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

    // Filter hallucinated ids: only keep ones that actually exist in the
    // user's wardrobe. Stops the UI rendering chips for fake items.
    const validIds = new Set(input.wardrobe.map((w) => w.id));
    const recommendedItemIds = Array.isArray(parsed.recommendedItemIds)
      ? parsed.recommendedItemIds
          .filter((x): x is string => typeof x === "string")
          .filter((id) => validIds.has(id))
          .slice(0, 12) // cap at 12 chips per reply for sane UI
      : [];

    return { success: true, reply, recommendedItemIds };
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
