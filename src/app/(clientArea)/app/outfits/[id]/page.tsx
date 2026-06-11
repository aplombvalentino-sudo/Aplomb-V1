import Link from "next/link";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getWardrobeOutfit } from "@/lib/wardrobe/outfits";
import { ClientNav } from "@/components/client/ClientNav";
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
      <ClientNav
        active="outfits"
        leading={
          <Link
            href="/app/outfits"
            className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200"
          >
            ← All outfits
          </Link>
        }
      />

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
