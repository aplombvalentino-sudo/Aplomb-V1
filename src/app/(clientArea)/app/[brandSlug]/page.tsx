import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { BrandScanWizard } from "@/components/client/BrandScanWizard";
import { isValidClientPlan, CLIENT_PLAN_COOKIE } from "@/lib/planLimits";
import { Metadata } from "next";

type Props = { params: Promise<{ brandSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brandSlug } = await params;
  const brand = await db.brand.findUnique({ where: { slug: brandSlug } });
  return brand
    ? { title: `${brand.name} — AI Fit` }
    : { title: "Brand not found" };
}

export default async function BrandClientPage({ params }: Props) {
  const { brandSlug } = await params;

  const brand = await db.brand.findUnique({
    where: { slug: brandSlug },
    include: {
      products: {
        where: { isActive: true },
        include: { variants: { orderBy: { sizeLabel: "asc" } } },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      },
    },
  });

  if (!brand) notFound();

  const cookieStore = await cookies();
  const rawPlan = cookieStore.get(CLIENT_PLAN_COOKIE)?.value;
  const clientPlan = isValidClientPlan(rawPlan) ? rawPlan : "essential";

  // Serialize products — convert Prisma Decimal to string for client component
  const serializedProducts = brand.products.map((p) => ({
    ...p,
    variants: p.variants.map((v) => ({
      ...v,
      price: v.price != null ? v.price.toString() : null,
    })),
  }));

  // Group products by category
  const byCategory: Record<string, typeof serializedProducts> = {};
  for (const p of serializedProducts) {
    const cat = p.category ?? "Other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(p);
  }

  return (
    <BrandScanWizard
      brand={{
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        logoUrl: brand.logoUrl ?? null,
        primaryColor: brand.primaryColor,
      }}
      productsByCategory={byCategory}
      clientPlan={clientPlan}
    />
  );
}
