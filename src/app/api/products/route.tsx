import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/api";
import { parseJsonBody, parseQuery, zCuid } from "@/lib/validate";

const createSchema = z
  .object({
    brandId: zCuid,
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    category: z.string().max(80).optional(),
    subcategory: z.string().max(80).optional(),
    imageUrl: z.string().url().max(2048).optional().or(z.literal("")),
    externalId: z.string().max(120).optional(),
    tags: z.array(z.string().min(1).max(40)).max(40).optional(),
  })
  .strict();

const listQuerySchema = z
  .object({
    brandId: zCuid,
    search: z.string().max(120).optional(),
    page: z.coerce.number().int().min(1).max(10_000).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

async function getBrandIdForUser(userId: string, requestedBrandId: string) {
  const membership = await db.brandUser.findUnique({
    where: { userId_brandId: { userId, brandId: requestedBrandId } },
  });
  return membership?.brandId ?? null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const q = parseQuery(req, listQuerySchema);
  if (!q.ok) return q.response;
  const { brandId, search = "", page = 1, pageSize = 20 } = q.data;

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

  const parsed = await parseJsonBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const authorised = await getBrandIdForUser(session.user.id, data.brandId);
  if (!authorised) return forbidden();

  const product = await db.product.create({
    data: {
      brandId: data.brandId,
      name: data.name,
      description: data.description,
      category: data.category,
      subcategory: data.subcategory,
      imageUrl: data.imageUrl || null,
      externalId: data.externalId,
      tags: data.tags ?? [],
    },
    include: { variants: true },
  });

  return ok(product, 201);
}
