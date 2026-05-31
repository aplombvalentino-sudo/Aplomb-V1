import { db } from "@/lib/db";

/**
 * Brands that have at least one active product — the public discovery list.
 * Shared by GET /api/brands and the shopper /app page so the page can query
 * the data layer directly instead of doing an HTTP round-trip to its own API.
 */
export function listActiveBrands() {
  return db.brand.findMany({
    where: {
      products: { some: { isActive: true } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      primaryColor: true,
      _count: { select: { products: true } },
    },
    orderBy: { name: "asc" },
  });
}

export type ActiveBrand = Awaited<ReturnType<typeof listActiveBrands>>[number];
