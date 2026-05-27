import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/api";
import { parseJsonBody } from "@/lib/validate";

// ─── GET /api/brand — list caller's brands ────────────────────────────────────
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const memberships = await db.brandUser.findMany({
    where: { userId: session.user.id },
    include: { brand: true },
    orderBy: { brand: { createdAt: "asc" } },
  });

  if (memberships.length === 0) return forbidden();

  return ok({
    brands: memberships.map((m) => ({ ...m.brand, role: m.role })),
  });
}

// ─── POST /api/brand — create brand for the current user (onboarding) ─────────
const createSchema = z
  .object({
    name: z.string().min(1).max(100),
  })
  .strict();

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  const parsed = await parseJsonBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const { name } = parsed.data;

  const baseSlug = slugify(name);
  let slug = baseSlug;
  let i = 1;
  while (await db.brand.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${i++}`;
  }

  const brand = await db.$transaction(async (tx) => {
    const b = await tx.brand.create({ data: { name, slug } });
    await tx.brandUser.create({
      data: { userId, brandId: b.id, role: "owner" },
    });
    return b;
  });

  return ok({ brand }, 201);
}

// ─── PATCH /api/brand — update current user's primary brand ───────────────────
const updateSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    slug: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, digits, and hyphens")
      .optional(),
    logoUrl: z.string().url().max(2048).nullable().optional(),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex colour").optional(),
    configuration: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const membership = await db.brandUser.findFirst({
    where: { userId: session.user.id, role: { in: ["owner", "admin"] } },
    include: { brand: true },
    orderBy: { brand: { createdAt: "asc" } },
  });

  if (!membership) return forbidden();

  const parsed = await parseJsonBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  const { name, slug, logoUrl, primaryColor, configuration } = parsed.data;

  // Check slug uniqueness if changing it
  if (slug && slug !== membership.brand.slug) {
    const existing = await db.brand.findUnique({ where: { slug } });
    if (existing) return err("SLUG_IN_USE", "This slug is already taken.", 409);
  }

  const updated = await db.brand.update({
    where: { id: membership.brand.id },
    data: {
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(primaryColor !== undefined && { primaryColor }),
      ...(configuration !== undefined && {
        configuration: {
          ...(membership.brand.configuration as Record<string, unknown>),
          ...configuration,
        } as Prisma.InputJsonValue,
      }),
    },
  });

  return ok({ brand: updated });
}
