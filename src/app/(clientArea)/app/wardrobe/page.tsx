import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listWardrobeItems, getWardrobeQuota } from "@/lib/wardrobe/items";
import { isValidClientPlan } from "@/lib/planLimits";
import { Logo } from "@/components/brand/Logo";
import { ClientSignOutLink } from "@/components/client/ClientSignOutLink";
import { WardrobeGrid } from "@/components/client/wardrobe/WardrobeGrid";

export const metadata: Metadata = {
  title: "My wardrobe — Aplomb",
  description:
    "Your digital wardrobe — add the clothes you own, mix with brand pieces, try outfits on yourself.",
};

/**
 * Wardrobe is now the primary surface of the shopper experience. This page
 * loads the user's items + quota server-side, then hands off to the client
 * grid for interactivity (delete, navigate to /add, etc.). Sizing access
 * lives in the secondary "Profile" link, never on this page.
 */
export default async function WardrobePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/app/wardrobe");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { clientPlan: true, name: true },
  });
  const plan = isValidClientPlan(user?.clientPlan) ? user!.clientPlan : "essential";

  // Two cheap queries; parallelised.
  const [items, quota] = await Promise.all([
    listWardrobeItems(session.user.id),
    getWardrobeQuota(session.user.id, plan),
  ]);

  // The grid receives plain data (no async, no DB types). createdAt is
  // serialised to ISO so it crosses the server→client boundary cleanly.
  const serialisedItems = items.map((i) => ({
    ...i,
    createdAt: i.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-[100dvh] bg-canvas">
      {/* Header — wardrobe-first nav */}
      <header className="border-b border-hairline bg-canvas/90 backdrop-blur-md
                          sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <Link href="/app/wardrobe" aria-label="Aplomb — wardrobe" className="text-ink hover:opacity-60 transition-opacity duration-200">
          <Logo className="text-[17px]" />
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/app/wardrobe"
            className="text-[12px] font-medium text-ink transition-colors"
          >
            Wardrobe
          </Link>
          <Link
            href="/app/outfits"
            className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200"
          >
            Outfits
          </Link>
          <Link
            href="/app/discover"
            className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200"
          >
            Discover
          </Link>
          <Link
            href="/app/account"
            className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200"
          >
            Profile
          </Link>
          <span aria-hidden className="h-3 w-px bg-hairline-strong" />
          <ClientSignOutLink />
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {/* Page intro */}
        <div className="mb-10 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
              {user?.name ? `${user.name}'s` : "Your"} rotation
            </p>
            <h1 className="mt-2 font-serif text-[clamp(2rem,4vw,2.6rem)] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
              My <em className="italic">rotation</em>
              <span className="text-accent">.</span>
            </h1>
          </div>

          {/* Slot counter — quiet, right-aligned. Personal pieces shown
              alongside total so the Essential 3-piece cap is legible. */}
          <div className="flex items-center gap-5 text-[12px] text-ink-muted tabular-nums">
            <div>
              <span className="text-ink font-medium">{quota.itemsUsed}</span>
              {" / "}
              {quota.maxItems === Infinity ? "∞" : quota.maxItems}
              {" "}
              <span className="text-ink-subtle">pieces</span>
            </div>
            <div>
              <span className="text-ink font-medium">{quota.personalPhotosUsed}</span>
              {" / "}
              {quota.maxPersonalPhotos === Infinity ? "∞" : quota.maxPersonalPhotos}
              {" "}
              <span className="text-ink-subtle">from your closet</span>
            </div>
          </div>
        </div>

        <WardrobeGrid items={serialisedItems} quota={quota} plan={plan} />
      </main>
    </div>
  );
}
