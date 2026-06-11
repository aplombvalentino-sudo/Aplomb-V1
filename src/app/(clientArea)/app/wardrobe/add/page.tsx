import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWardrobeQuota } from "@/lib/wardrobe/items";
import { isValidClientPlan } from "@/lib/planLimits";
import { ClientNav } from "@/components/client/ClientNav";
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
      {/* Shared shopper-area nav; back affordance preserved in the leading slot */}
      <ClientNav
        active="wardrobe"
        leading={
          <Link
            href="/app/wardrobe"
            className="text-[12px] text-ink-subtle hover:text-ink transition-colors"
          >
            ← Back to wardrobe
          </Link>
        }
      />

      <main className="mx-auto max-w-2xl px-6 py-12">
        {/* Quota counter — moved out of the (now shared) header, kept verbatim */}
        <p className="mb-6 text-right text-[11px] text-ink-subtle tabular-nums">
          {quota.personalPhotosUsed} / {quota.maxPersonalPhotos === Infinity ? "∞" : quota.maxPersonalPhotos} pieces from your closet
        </p>
        <CaptureFlow plan={plan} remaining={quota.maxPersonalPhotos - quota.personalPhotosUsed} />
      </main>
    </div>
  );
}
