import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProductsClient } from "@/components/dashboard/ProductsClient";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Catalogue" };

export default async function ProCataloguePage() {
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
          Catalogue
        </p>
        <h1 className="mt-1 font-serif text-[1.8rem] font-semibold leading-tight
                       tracking-[-0.025em] text-ink">
          <em className="italic">Products</em><span className="text-accent">.</span>
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Manage your catalogue. Products drive the AI stylist outfit engine.
        </p>
      </div>
      <ProductsClient brandId={membership.brand.id} />
    </div>
  );
}
