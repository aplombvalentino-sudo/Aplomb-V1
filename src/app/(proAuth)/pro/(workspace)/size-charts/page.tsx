import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { SizeChartsClient } from "@/components/dashboard/SizeChartsClient";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Size Charts" };

export default async function ProSizeChartsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.brandUser.findFirst({
    where: { userId: session.user.id },
    include: { brand: true },
  });
  if (!membership) redirect("/pro/onboarding");

  return (
    <div>
      <div className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-subtle">
          Size Charts
        </p>
        <h1 className="mt-1 font-serif text-[1.8rem] font-semibold leading-tight
                       tracking-[-0.025em] text-ink">
          Size <em className="italic">mapping</em><span className="text-accent">.</span>
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Define measurement ranges per garment category and gender.
        </p>
      </div>
      <SizeChartsClient brandId={membership.brand.id} />
    </div>
  );
}
