/**
 * /widget — the embeddable iframe that brand product pages load via widget.js.
 *
 * Brand-locked by design:
 *   - The `?brand=<slug>` query param fixes the brand for the entire flow.
 *   - All API calls inside the wizard carry that brandSlug, so outfits and
 *     try-on can only reference this brand's products.
 *   - widgetMode={true} hides every cross-brand link (← All brands, Browse
 *     more brands, View wardrobe, Sign out) so the shopper never leaves the
 *     host brand's experience.
 *
 * Loading via widget.js:
 *   <script src=".../widget.js" data-brand="atelier-noir" async></script>
 *   The loader appends an iframe to /widget?brand=atelier-noir.
 */

import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { Metadata } from "next";
import { BrandScanWizard } from "@/components/client/BrandScanWizard";
import { isValidClientPlan, CLIENT_PLAN_COOKIE } from "@/lib/planLimits";

export const metadata: Metadata = {
  title: "Fit & style",
  // Keep the iframe out of any search index
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ brand?: string; product?: string }>;
};

export default async function WidgetPage({ searchParams }: Props) {
  const { brand: brandSlug } = await searchParams;

  if (!brandSlug) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-6 text-center">
        <div>
          <p className="font-serif text-[1.4rem] font-semibold text-ink">
            Configuration error
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            The widget is missing the <code className="rounded bg-stone px-1.5 py-0.5 nums">data-brand</code> attribute.
          </p>
        </div>
      </div>
    );
  }

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

  if (!brand) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-6 text-center">
        <div>
          <p className="font-serif text-[1.4rem] font-semibold text-ink">
            Brand not configured
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            We couldn&apos;t find a brand with slug{" "}
            <code className="rounded bg-stone px-1.5 py-0.5 nums">{brandSlug}</code>.
          </p>
        </div>
      </div>
    );
  }

  const cookieStore = await cookies();
  const rawPlan = cookieStore.get(CLIENT_PLAN_COOKIE)?.value;
  const clientPlan = isValidClientPlan(rawPlan) ? rawPlan : "essential";

  // Serialize Prisma Decimal -> string for the client component
  const serializedProducts = brand.products.map((p) => ({
    ...p,
    variants: p.variants.map((v) => ({
      ...v,
      price: v.price != null ? v.price.toString() : null,
    })),
  }));

  // Group products by category for the wizard
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
      widgetMode={true}
    />
  );
}
