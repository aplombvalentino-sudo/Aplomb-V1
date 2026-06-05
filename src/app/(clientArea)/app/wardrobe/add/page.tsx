import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWardrobeQuota } from "@/lib/wardrobe/items";
import { isValidClientPlan } from "@/lib/planLimits";
import { Logo } from "@/components/brand/Logo";
import { CaptureFlow } from "@/components/client/wardrobe/CaptureFlow";

export const metadata: Metadata = {
  title: "Add a clothing item — Aplomb",
  description: "Photograph a piece you own to add it to your wardrobe.",
};

/**
 * Server shell: auth gate + quota pre-check. If the personal-photo cap is
 * already reached we redirect back to /app/wardrobe rather than render a
 * dead-end form. The actual capture state machine is a client component.
 */
export default async function AddWardrobeItemPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/app/wardrobe/add");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { clientPlan: true },
  });
  const plan = isValidClientPlan(user?.clientPlan) ? user!.clientPlan : "essential";
  const quota = await getWardrobeQuota(session.user.id, plan);

  // Refuse early. Wardrobe page surfaces the upgrade prompt with full context.
  if (
    quota.itemsUsed >= quota.maxItems ||
    quota.personalPhotosUsed >= quota.maxPersonalPhotos
  ) {
    redirect("/app/wardrobe?reason=full");
  }

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <header className="border-b border-hairline bg-canvas/90 backdrop-blur-md
                          sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <Link href="/app/wardrobe" aria-label="Aplomb — wardrobe" className="flex items-center gap-3 text-ink">
          <Logo className="text-[17px]" />
          <span className="text-[12px] text-ink-subtle hover:text-ink transition-colors">
            ← Back to wardrobe
          </span>
        </Link>
        <span className="text-[11px] text-ink-subtle tabular-nums">
          {quota.personalPhotosUsed} / {quota.maxPersonalPhotos === Infinity ? "∞" : quota.maxPersonalPhotos} pieces from your closet
        </span>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <CaptureFlow plan={plan} remaining={quota.maxPersonalPhotos - quota.personalPhotosUsed} />
      </main>
    </div>
  );
}
