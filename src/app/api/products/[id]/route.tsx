import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, unauthorized, forbidden, notFound } from "@/lib/api";
import { parseJsonBody, parseParam, zCuid } from "@/lib/validate";

const updateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    category: z.string().max(80).optional(),
    subcategory: z.string().max(80).optional(),
    imageUrl: z.string().url().max(2048).optional().or(z.literal("")),
    externalId: z.string().max(120).optional(),
    tags: z.array(z.string().min(1).max(40)).max(40).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

async function getProductAndCheckAccess(productId: string, userId: string) {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  });
  if (!product) return { product: null, authorised: false };

  const membership = await db.brandUser.findUnique({
    where: { userId_brandId: { userId, brandId: product.brandId } },
  });
  return { product, authorised: !!membership };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id: rawId } = await params;
  const idParsed = parseParam(rawId, zCuid);
  if (!idParsed.ok) return idParsed.response;
  const id = idParsed.data;
  const { product, authorised } = await getProductAndCheckAccess(id, session.user.id);
  if (!product) return notFound("Product");
  if (!authorised) return forbidden();

  return ok(product);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id: rawId } = await params;
  const idParsed = parseParam(rawId, zCuid);
  if (!idParsed.ok) return idParsed.response;
  const id = idParsed.data;
  const { product, authorised } = await getProductAndCheckAccess(id, session.user.id);
  if (!product) return notFound("Product");
  if (!authorised) return forbidden();

  const parsed = await parseJsonBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;

  const updated = await db.product.update({
    where: { id },
    data: {
      ...parsed.data,
      imageUrl: parsed.data.imageUrl || null,
    },
    include: { variants: true },
  });

  return ok(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id: rawId } = await params;
  const idParsed = parseParam(rawId, zCuid);
  if (!idParsed.ok) return idParsed.response;
  const id = idParsed.data;
  const { product, authorised } = await getProductAndCheckAccess(id, session.user.id);
  if (!product) return notFound("Product");
  if (!authorised) return forbidden();

  await db.product.delete({ where: { id } });
  return ok({ deleted: true });
}
