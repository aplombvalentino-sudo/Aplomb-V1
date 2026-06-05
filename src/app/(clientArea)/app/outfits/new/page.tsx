import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listWardrobeItems } from "@/lib/wardrobe/items";
import { Logo } from "@/components/brand/Logo";
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

  const items = await listWardrobeItems(session.user.id);
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
      <header className="border-b border-hairline bg-canvas/90 backdrop-blur-md
                          sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <Link href="/app/outfits" aria-label="Aplomb — outfits" className="flex items-center gap-3 text-ink">
          <Logo className="text-[17px]" />
          <span className="text-[12px] text-ink-subtle hover:text-ink transition-colors">
            ← Back to outfits
          </span>
        </Link>
        <span className="text-[11px] text-ink-subtle">
          {usable.length} item{usable.length === 1 ? "" : "s"} ready in wardrobe
        </span>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <OutfitBuilder availableItems={serialised} />
      </main>
    </div>
  );
}
