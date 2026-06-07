import "server-only";

/**
 * Monthly usage counters for plan-gated features.
 *
 * Cycle is the calendar month (1st of the month at 00:00 UTC → 1st of the
 * next month). Stripe billing cycles can shift independently of this; the
 * brief asks for monthly quotas which are simpler for the user to reason
 * about ("X / Y this month") than rolling 30-day windows. If we later want
 * to align with the subscription anchor day, swap startOfBillingMonth()
 * below — no callers need to change.
 *
 * - `monthlyTryOnCount`              = WardrobeOutfit rows created since
 *                                      the start of this calendar month
 *                                      (counts every AI try-on call,
 *                                      including failed and regenerated
 *                                      ones — they all consumed credits).
 * - `monthlyAssistantRecCount`       = user-role WardrobeChatMessage rows
 *                                      since the start of this calendar
 *                                      month (one per recommendation
 *                                      request).
 */

import { db } from "@/lib/db";
import { getClientPlanLimits, type ClientPlan } from "@/lib/planLimits";

/** First day of this calendar month at 00:00 UTC. */
export function startOfBillingMonth(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
}

export type MonthlyUsage = {
  tryOnsUsed: number;
  tryOnsLimit: number;
  tryOnsRemaining: number;
  assistantRecsUsed: number;
  assistantRecsLimit: number;
  assistantRecsRemaining: number;
  /** Whether the user can perform another try-on this month. */
  canTryOn: boolean;
  /** Whether the user can ask the assistant another question this month. */
  canAskAssistant: boolean;
  /** ISO timestamp for the start of the current usage window — useful to
   *  surface "resets on X" copy without recomputing on the client. */
  windowStart: string;
};

/** Returns -1 when the limit is Infinity (use as a "no cap" sentinel in UI). */
function remaining(used: number, limit: number): number {
  if (limit === Infinity) return Infinity;
  return Math.max(0, limit - used);
}

export async function getMonthlyUsage(
  userId: string,
  plan: ClientPlan,
): Promise<MonthlyUsage> {
  const since = startOfBillingMonth();
  const limits = getClientPlanLimits(plan);

  const [tryOnsUsed, assistantRecsUsed] = await Promise.all([
    db.wardrobeOutfit.count({
      where: { userId, createdAt: { gte: since } },
    }),
    db.wardrobeChatMessage.count({
      where: { userId, role: "user", createdAt: { gte: since } },
    }),
  ]);

  const tryOnsRemaining = remaining(tryOnsUsed, limits.maxTryOnsPerMonth);
  const assistantRecsRemaining = remaining(
    assistantRecsUsed,
    limits.maxAssistantRecommendationsPerMonth,
  );

  return {
    tryOnsUsed,
    tryOnsLimit: limits.maxTryOnsPerMonth,
    tryOnsRemaining,
    assistantRecsUsed,
    assistantRecsLimit: limits.maxAssistantRecommendationsPerMonth,
    assistantRecsRemaining,
    canTryOn: tryOnsRemaining === Infinity || tryOnsRemaining > 0,
    canAskAssistant:
      limits.hasOutfitAssistant &&
      (assistantRecsRemaining === Infinity || assistantRecsRemaining > 0),
    windowStart: since.toISOString(),
  };
}
