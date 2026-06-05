import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listWardrobeOutfits } from "@/lib/wardrobe/outfits";
import { db } from "@/lib/db";
import { Logo } from "@/components/brand/Logo";
import { ClientSignOutLink } from "@/components/client/ClientSignOutLink";
import { OutfitsList } from "@/components/client/wardrobe/OutfitsList";

export const metadata: Metadata = {
  title: "My outfits — Aplomb",
  description: "Looks you built from your wardrobe.",
};

export default async function OutfitsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/app/outfits");
  }

  const [outfits, wardrobeItemCount] = await Promise.all([
    listWardrobeOutfits(session.user.id),
    db.wardrobeItem.count({ where: { userId: session.user.id } }),
  ]);

  const serialised = outfits.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <header className="border-b border-hairline bg-canvas/90 backdrop-blur-md
                          sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <Link href="/app/wardrobe" aria-label="Aplomb — wardrobe" className="text-ink hover:opacity-60 transition-opacity duration-200">
          <Logo className="text-[17px]" />
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/app/wardrobe" className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200">Wardrobe</Link>
          <Link href="/app/outfits" className="text-[12px] font-medium text-ink transition-colors">Outfits</Link>
          <Link href="/app/discover" className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200">Discover</Link>
          <Link href="/app/account" className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200">Profile</Link>
          <span aria-hidden className="h-3 w-px bg-hairline-strong" />
          <ClientSignOutLink />
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
              My
            </p>
            <h1 className="mt-2 font-serif text-[clamp(2rem,4vw,2.6rem)] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
              <em className="italic">Fits</em>
              <span className="text-accent">.</span>
            </h1>
          </div>

          {wardrobeItemCount > 0 && (
            <Link
              href="/app/outfits/new"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5
                         text-[13px] font-medium text-white hover:bg-[#2a2622] transition-colors"
            >
              Build a new fit
            </Link>
          )}
        </div>

        <OutfitsList outfits={serialised} wardrobeItemCount={wardrobeItemCount} />
      </main>
    </div>
  );
}
