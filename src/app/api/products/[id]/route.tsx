import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, unauthorized, forbidden, notFound } from "@/lib/api";
import { parseJsonBody, parseParam, zCuid } from "@/lib/validate";
import { requireBrandRole, ROLES_READ, ROLES_WRITE, ROLES_ADMIN } from "@/lib/brandRole";
import { LIMITS, enforceLimits, tooManyRequests } from "@/lib/rateLimit-upstash";
import type { BrandUserRole } from "@prisma/client";

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

/**
 * Loads the product and verifies the caller has the required role on its brand.
 * Returns the product on success, or a typed failure with the response to return.
 */
async function loadProductWithRole(
  productId: string,
  userId: string,
  allowed: BrandUserRole[],
) {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  });
  if (!product) return { ok: false as const, response: notFound("Product") };

  const role = await requireBrandRole(userId, product.brandId, allowed);
  if (!role.ok) return { ok: false as const, response: forbidden() };

  return { ok: true as const, product };
}

async function getValidId(params: Promise<{ id: string }>) {
  const { id: rawId } = await params;
  return parseParam(rawId, zCuid);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const idParsed = await getValidId(params);
  if (!idParsed.ok) return idParsed.response;

  const r = await loadProductWithRole(idParsed.data, session.user.id, ROLES_READ);
  if (!r.ok) return r.response;
  return ok(r.product);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const guard = await enforceLimits(`u:${session.user.id}`, [LIMITS.product_writes]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  const idParsed = await getValidId(params);
  if (!idParsed.ok) return idParsed.response;
  const id = idParsed.data;

  // Editors and above can update products.
  const r = await loadProductWithRole(id, session.user.id, ROLES_WRITE);
  if (!r.ok) return r.response;

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

  const guard = await enforceLimits(`u:${session.user.id}`, [LIMITS.product_writes]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  const idParsed = await getValidId(params);
  if (!idParsed.ok) return idParsed.response;
  const id = idParsed.data;

  // Destructive — admins and above only.
  const r = await loadProductWithRole(id, session.user.id, ROLES_ADMIN);
  if (!r.ok) return r.response;

  await db.product.delete({ where: { id } });
  return ok({ deleted: true });
}

