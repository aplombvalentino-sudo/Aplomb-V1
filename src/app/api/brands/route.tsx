import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";

/** GET /api/brands — public list of brands that have at least one active product. */
export async function GET(_req: NextRequest) {
  const brands = await db.brand.findMany({
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

  return ok({ brands });
}
