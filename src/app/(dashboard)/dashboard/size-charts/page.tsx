import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { SizeChartsClient } from "@/components/dashboard/SizeChartsClient";

export default async function SizeChartsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.brandUser.findFirst({
    where: { userId: session.user.id },
    include: { brand: true },
  });
  if (!membership) redirect("/login");

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">
        Size <em className="italic">charts</em>
        <span className="text-accent">.</span>
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Define measurement-to-size mappings per garment category and gender.
      </p>
      <SizeChartsClient brandId={membership.brand.id} />
    </div>
  );
}
