import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, err, unauthorized, forbidden, notFound } from "@/lib/api";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  externalId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

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

  const { id } = await params;
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

  const { id } = await params;
  const { product, authorised } = await getProductAndCheckAccess(id, session.user.id);
  if (!product) return notFound("Product");
  if (!authorised) return forbidden();

  const body = await req.json().catch(() => null);
  if (!body) return err("INVALID_JSON", "Invalid request body");

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
  }

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

  const { id } = await params;
  const { product, authorised } = await getProductAndCheckAccess(id, session.user.id);
  if (!product) return notFound("Product");
  if (!authorised) return forbidden();

  await db.product.delete({ where: { id } });
  return ok({ deleted: true });
}
