import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProductsClient } from "@/components/dashboard/ProductsClient";

export default async function ProductsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.brandUser.findFirst({
    where: { userId: session.user.id },
    include: { brand: true },
  });
  if (!membership) redirect("/login");

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">
            Your <em className="italic">catalog</em>
            <span className="text-accent">.</span>
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Manage your catalog. Products are used by the AI stylist to build outfits.
          </p>
        </div>
      </div>
      <ProductsClient brandId={membership.brand.id} />
    </div>
  );
}
