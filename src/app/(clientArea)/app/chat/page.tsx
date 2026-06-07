import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Logo } from "@/components/brand/Logo";
import { ClientSignOutLink } from "@/components/client/ClientSignOutLink";
import {
  isValidClientPlan,
  getClientPlanLimits,
  type ClientPlan,
} from "@/lib/planLimits";
import { listWardrobeItems } from "@/lib/wardrobe/items";
import { getMonthlyUsage } from "@/lib/wardrobe/usage";
import { WardrobeChat } from "@/components/client/wardrobe/WardrobeChat";
import { ChatUpgradeLock } from "@/components/client/wardrobe/ChatUpgradeLock";

export const metadata: Metadata = {
  title: "AI Outfit Assistant — Aplomb",
  description: "Get personalised outfit suggestions from your saved wardrobe.",
};

/**
 * AI Outfit Assistant page. Premium-gated (Fashion + Model plans only;
 * Essential sees an upgrade lock card).
 *
 * Server fetches in parallel:
 *   - the user's plan (for the gate)
 *   - the wardrobe items (so the chat can render thumbs for items the
 *     assistant cites)
 *   - the chat history (for hydration without an extra round-trip)
 *
 * Below the plan check the wardrobe + history are NOT fetched — saves a
 * DB round-trip when an Essential shopper lands here and bounces.
 */
export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/app/chat");
  }
  const userId = session.user.id;

  // Plan first — short-circuit before pulling wardrobe / history.
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { clientPlan: true },
  });
  const plan: ClientPlan = isValidClientPlan(user?.clientPlan) ? user!.clientPlan : "essential";
  const limits = getClientPlanLimits(plan);

  const shell = (children: React.ReactNode) => (
    <div className="min-h-[100dvh] bg-canvas">
      <header className="border-b border-hairline bg-canvas/90 backdrop-blur-md
                          sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <Link href="/app/wardrobe" aria-label="Aplomb — wardrobe" className="text-ink hover:opacity-60 transition-opacity duration-200">
          <Logo className="text-[17px]" />
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/app/wardrobe" className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200">Wardrobe</Link>
          <Link href="/app/outfits" className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200">Outfits</Link>
          <Link href="/app/chat" className="text-[12px] font-medium text-ink transition-colors">Assistant</Link>
          <Link href="/app/account" className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200">Profile</Link>
          <span aria-hidden className="h-3 w-px bg-hairline-strong" />
          <ClientSignOutLink />
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );

  if (!limits.hasOutfitAssistant) {
    return shell(<ChatUpgradeLock currentPlan={plan} />);
  }

  // Eligible plan — load the wardrobe + history + usage in parallel.
  const [wardrobe, messages, usage] = await Promise.all([
    listWardrobeItems(userId),
    db.wardrobeChatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        content: true,
        recommendedItemIds: true,
        createdAt: true,
      },
      take: 200,
    }),
    getMonthlyUsage(userId, plan),
  ]);

  // Trim wardrobe payload to what the chat UI needs for chip thumbs.
  const wardrobeForUi = wardrobe
    .filter((w) => w.usableInOutfit)
    .map((w) => ({
      id: w.id,
      type: w.type,
      category: w.category,
      color: w.color,
      brand: w.brand,
      nickname: w.nickname,
      thumbUrl: w.thumbUrl,
    }));

  return shell(
    <WardrobeChat
      wardrobe={wardrobeForUi}
      initialMessages={messages.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      }))}
      plan={plan}
      crossBrandEnabled={limits.crossBrandRecommendations}
      usage={{
        recsUsed: usage.assistantRecsUsed,
        recsLimit:
          usage.assistantRecsLimit === Infinity ? null : usage.assistantRecsLimit,
        canAsk: usage.canAskAssistant,
      }}
    />,
  );
}
