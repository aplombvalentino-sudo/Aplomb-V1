import Link from "next/link";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getWardrobeOutfit } from "@/lib/wardrobe/outfits";
import { Logo } from "@/components/brand/Logo";
import { ClientSignOutLink } from "@/components/client/ClientSignOutLink";
import { OutfitResultView } from "@/components/client/wardrobe/OutfitResultView";

export const metadata: Metadata = {
  title: "Outfit",
  description: "Your AI-generated try-on for this outfit.",
};

/**
 * Outfit detail page — the result view of the AI try-on flow. Shows the
 * generated image as the hero, the items that went into the outfit, and
 * "Try again with a new selfie" / delete affordances.
 *
 * Status handling:
 *   - ready:      hero image + items + actions
 *   - generating: live spinner (the AI call is in-flight from another tab
 *                 or a slow server response)
 *   - failed:     plain card showing the error + "Try again" CTA
 *   - none:       legacy outfits saved before AI try-on shipped — show the
 *                 items as a fallback "recipe" view
 */
export default async function OutfitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/app/outfits");
  }

  const { id } = await params;
  const outfit = await getWardrobeOutfit(session.user.id, id);
  if (!outfit) notFound();

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <header className="border-b border-hairline bg-canvas/90 backdrop-blur-md
                          sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/app/wardrobe" aria-label="Aplomb — wardrobe" className="text-ink hover:opacity-60 transition-opacity duration-200">
            <Logo className="text-[17px]" />
          </Link>
          <Link
            href="/app/outfits"
            className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200"
          >
            ← All outfits
          </Link>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/app/wardrobe" className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200">Wardrobe</Link>
          <Link href="/app/outfits" className="text-[12px] font-medium text-ink transition-colors">Outfits</Link>
          <Link href="/app/discover" className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200">Discover</Link>
          <Link href="/app/account" className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200">Profile</Link>
          <span aria-hidden className="h-3 w-px bg-hairline-strong" />
          <ClientSignOutLink />
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <OutfitResultView
          outfit={{
            ...outfit,
            createdAt: outfit.createdAt.toISOString(),
          }}
        />
      </main>
    </div>
  );
}
