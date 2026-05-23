import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/api";

const createSchema = z.object({
  brandId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  externalId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

async function getBrandIdForUser(userId: string, requestedBrandId: string) {
  const membership = await db.brandUser.findUnique({
    where: { userId_brandId: { userId, brandId: requestedBrandId } },
  });
  return membership?.brandId ?? null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { searchParams } = req.nextUrl;
  const brandId = searchParams.get("brandId");
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") ?? "20"), 100);

  if (!brandId) return err("MISSING_BRAND", "brandId is required");

  const authorised = await getBrandIdForUser(session.user.id, brandId);
  if (!authorised) return forbidden();

  const where = {
    brandId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { category: { contains: search, mode: "insensitive" as const } },
            { externalId: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      include: { variants: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.product.count({ where }),
  ]);

  return ok({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body) return err("INVALID_JSON", "Invalid request body");

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const authorised = await getBrandIdForUser(session.user.id, parsed.data.brandId);
  if (!authorised) return forbidden();

  const product = await db.product.create({
    data: {
      brandId: parsed.data.brandId,
      name: parsed.data.name,
      description: parsed.data.description,
      category: parsed.data.category,
      subcategory: parsed.data.subcategory,
      imageUrl: parsed.data.imageUrl || null,
      externalId: parsed.data.externalId,
      tags: parsed.data.tags ?? [],
    },
    include: { variants: true },
  });

  return ok(product, 201);
}
