import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, err, unauthorized } from "@/lib/api";
import { parseJsonBody } from "@/lib/validate";
import { LIMITS, enforceLimits, tooManyRequests } from "@/lib/rateLimit-upstash";
import { listWardrobeItems } from "@/lib/wardrobe/items";
import {
  isValidClientPlan,
  getClientPlanLimits,
} from "@/lib/planLimits";
import { generateWardrobeChatReply } from "@/lib/ai/wardrobeChat";
import { getMonthlyUsage, startOfBillingMonth } from "@/lib/wardrobe/usage";
import { listBrandCatalogForChat } from "@/lib/wardrobe/brandCatalog";

/**
 * AI Outfit Assistant — chat endpoint.
 *
 *   GET   /api/wardrobe/chat              → last N messages for the signed-in user
 *   POST  /api/wardrobe/chat { content }  → send a user message, get an AI reply
 *
 * Plan gating: refuses with 402 PLAN_REQUIRED unless the user's plan has
 * `hasOutfitAssistant === true` (Fashion + Model). UI hides the entry
 * point for ineligible plans too, but this is the authoritative gate.
 *
 * Per-day cap: the assistant also enforces `maxAssistantMessagesPerDay`
 * from planLimits. Counts USER messages in the last 24h (assistant
 * replies are not counted — the user pays per question, not per
 * answer length).
 *
 * Rate limit: reuses LIMITS.ai_minute + LIMITS.ai_daily — same posture
 * as the outfit-recommender endpoint that already uses Gemini text.
 */

export const maxDuration = 60;

const MAX_HISTORY_TURNS = 12; // 6 user + 6 assistant messages back
const SAFE_USER_MESSAGE_MAX = 2000;

const postSchema = z
  .object({
    content: z.string().trim().min(1).max(SAFE_USER_MESSAGE_MAX),
  })
  .strict();

// ─────────────────────────────────────────────────────────────────────────────
// GET — fetch history
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const messages = await db.wardrobeChatMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      content: true,
      recommendedItemIds: true,
      createdAt: true,
    },
    // Cap at 200 messages — UI shows a "load earlier" link if we ever
    // need to surface more.
    take: 200,
  });

  return ok({ messages });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — send a message
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  // Two-tier rate limit. ai_minute caps burst; ai_daily caps spend.
  const guard = await enforceLimits(`u:${userId}:chat`, [
    LIMITS.ai_minute,
    LIMITS.ai_daily,
  ]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  // Plan check — read the User row's `clientPlan` (durable webhook-
  // maintained source of truth). Refuse with 402 if the plan doesn't
  // include the assistant.
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { clientPlan: true },
  });
  const plan = isValidClientPlan(user?.clientPlan) ? user!.clientPlan : "essential";
  const limits = getClientPlanLimits(plan);
  if (!limits.hasOutfitAssistant) {
    return err(
      "PLAN_REQUIRED",
      "AI Outfit Assistant is available on plans 25.99 and above. Upgrade to unlock personalised outfit recommendations from your wardrobe.",
      402,
    );
  }

  // Monthly assistant-recommendation cap. Counts USER messages in the
  // current calendar month — assistant replies don't count (the user
  // pays per ask, not per answer length).
  if (limits.maxAssistantRecommendationsPerMonth !== Infinity) {
    const since = startOfBillingMonth();
    const usedThisMonth = await db.wardrobeChatMessage.count({
      where: { userId, role: "user", createdAt: { gte: since } },
    });
    if (usedThisMonth >= limits.maxAssistantRecommendationsPerMonth) {
      return err(
        "MONTHLY_LIMIT",
        plan === "fashion"
          ? `You've used all ${limits.maxAssistantRecommendationsPerMonth} AI outfit recommendations included in Fashion this month. Upgrade to Model for unlimited recommendations and cross-brand matches.`
          : `You've used your ${limits.maxAssistantRecommendationsPerMonth} assistant recommendations for this month. Upgrade for more.`,
        402,
      );
    }
  }

  const parsed = await parseJsonBody(req, postSchema);
  if (!parsed.ok) return parsed.response;

  // Pull the wardrobe + the last N turns of history in parallel.
  // For Model users, also pull a sample of the brand catalog so the
  // assistant can suggest pieces the user doesn't own yet (the Model
  // plan's headline differentiator). Fashion + Essential SKIP this load
  // entirely so there's zero chance of cross-brand leakage.
  const [wardrobe, recentMessages, brandCatalog] = await Promise.all([
    listWardrobeItems(userId),
    db.wardrobeChatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: MAX_HISTORY_TURNS,
      select: { role: true, content: true },
    }),
    limits.crossBrandRecommendations
      ? listBrandCatalogForChat()
      : Promise.resolve([]),
  ]);
  // findMany returned newest-first; flip so it reads oldest→newest.
  const history = recentMessages.reverse().map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  })) as Array<{ role: "user" | "assistant"; content: string }>;

  if (wardrobe.length === 0) {
    // Don't bother spending an AI call when the wardrobe is empty — give
    // the user a clean, deterministic prompt to add pieces first.
    const friendly =
      "Your wardrobe is empty so I don't have anything to mix yet. Add a few pieces (top, bottom, shoes — even just a couple) and I'll start recommending outfits.";
    // Persist both sides of this exchange so the chat history reflects it.
    await db.$transaction([
      db.wardrobeChatMessage.create({
        data: { userId, role: "user", content: parsed.data.content },
      }),
      db.wardrobeChatMessage.create({
        data: { userId, role: "assistant", content: friendly },
      }),
    ]);
    return ok({ reply: friendly, recommendedItemIds: [] }, 201);
  }

  // Persist the user message BEFORE the AI call so a slow / failed AI
  // doesn't lose the user's input from the history.
  const userMessageRow = await db.wardrobeChatMessage.create({
    data: { userId, role: "user", content: parsed.data.content },
    select: { id: true },
  });

  const result = await generateWardrobeChatReply({
    wardrobe,
    brandCatalog,
    crossBrandEnabled: limits.crossBrandRecommendations,
    history,
    userMessage: parsed.data.content,
  });

  if (!result.success) {
    // Persist a failure marker so the user sees "(assistant unavailable)"
    // in their history rather than a missing reply.
    await db.wardrobeChatMessage
      .create({
        data: {
          userId,
          role: "assistant",
          content: `(${result.reason})`,
        },
      })
      .catch(() => null);
    return err("AI_FAILED", result.reason, 502);
  }

  await db.wardrobeChatMessage.create({
    data: {
      userId,
      role: "assistant",
      content: result.reply,
      // We store BOTH wardrobe + brand product ids in the same column —
      // the UI looks them up against its own resolved maps. This avoids
      // a schema change just to split the two; the client component
      // decides how to render each.
      recommendedItemIds: [
        ...result.recommendedItemIds,
        ...result.recommendedBrandProductIds.map((id) => `brand:${id}`),
      ],
    },
  });

  return ok(
    {
      userMessageId: userMessageRow.id,
      reply: result.reply,
      recommendedItemIds: result.recommendedItemIds,
      recommendedBrandProductIds: result.recommendedBrandProductIds,
    },
    201,
  );
}
