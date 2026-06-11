import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listWardrobeItems } from "@/lib/wardrobe/items";
import { getMonthlyUsage } from "@/lib/wardrobe/usage";
import { isValidClientPlan } from "@/lib/planLimits";
import { ClientNav } from "@/components/client/ClientNav";
import { OutfitBuilder } from "@/components/client/wardrobe/OutfitBuilder";

export const metadata: Metadata = {
  title: "Build an outfit — Aplomb",
  description: "Mix wardrobe pieces into a new look.",
};

/**
 * Server shell — pulls the user's ready wardrobe items so the builder UI
 * can render the picker without an extra fetch. Items still processing are
 * intentionally excluded (they're not usable in outfits yet).
 */
export default async function NewOutfitPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/app/outfits/new");
  }

  // Fetch wardrobe + the user's saved height + monthly try-on usage in
  // parallel — usage lets the builder show "3 / 5 try-ons this month" and
  // block the Generate button if the cap is hit before the user wastes a
  // selfie upload.
  const [items, user] = await Promise.all([
    listWardrobeItems(session.user.id),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { heightCm: true, clientPlan: true },
    }),
  ]);
  const plan = isValidClientPlan(user?.clientPlan) ? user!.clientPlan : "essential";
  const usage = await getMonthlyUsage(session.user.id, plan);
  const usable = items.filter((i) => i.usableInOutfit);

  // Bail if the wardrobe is empty — no point rendering an empty picker.
  if (usable.length === 0) {
    redirect("/app/outfits?reason=no_items");
  }

  // Serialise Date so it crosses the boundary cleanly.
  const serialised = usable.map((i) => ({
    ...i,
    createdAt: i.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-[100dvh] bg-canvas">
      {/* Shared nav; the contextual "Back to outfits" + ready-item count
          slot in next to the logo via `leading`. */}
      <ClientNav
        active="outfits"
        leading={
          <>
            <Link href="/app/outfits" className="text-[12px] text-ink-subtle hover:text-ink transition-colors">
              ← Back to outfits
            </Link>
            <span aria-hidden className="h-3 w-px bg-hairline-strong" />
            <span className="text-[11px] text-ink-subtle">
              {usable.length} item{usable.length === 1 ? "" : "s"} ready in wardrobe
            </span>
          </>
        }
      />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <OutfitBuilder
          availableItems={serialised}
          initialHeightCm={user?.heightCm ?? null}
          tryOnUsage={{
            used: usage.tryOnsUsed,
            limit: usage.tryOnsLimit === Infinity ? null : usage.tryOnsLimit,
            canTryOn: usage.canTryOn,
          }}
        />
      </main>
    </div>
  );
}
