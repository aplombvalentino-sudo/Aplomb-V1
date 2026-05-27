import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, unauthorized, forbidden } from "@/lib/api";
import { parseJsonBody, parseQuery, zCuid } from "@/lib/validate";
import { requireBrandRole, ROLES_READ, ROLES_WRITE } from "@/lib/brandRole";
import { LIMITS, enforceLimits, tooManyRequests } from "@/lib/rateLimit-upstash";

const createSchema = z
  .object({
    brandId: zCuid,
    category: z.string().min(1).max(100),
    gender: z.enum(["male", "female", "unisex"]).optional().nullable(),
    chartJson: z.record(z.string(), z.unknown()),
  })
  .strict();

const listQuerySchema = z.object({ brandId: zCuid }).strict();

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const q = parseQuery(req, listQuerySchema);
  if (!q.ok) return q.response;

  const role = await requireBrandRole(session.user.id, q.data.brandId, ROLES_READ);
  if (!role.ok) return forbidden();

  const items = await db.sizeChart.findMany({
    where: { brandId: q.data.brandId },
    orderBy: { category: "asc" },
  });

  return ok({ items, total: items.length });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const guard = await enforceLimits(`u:${session.user.id}`, [LIMITS.product_writes]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  const parsed = await parseJsonBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  // Editors and above can create size charts.
  const role = await requireBrandRole(session.user.id, data.brandId, ROLES_WRITE);
  if (!role.ok) return forbidden();

  const chart = await db.sizeChart.create({
    data: {
      brandId: data.brandId,
      category: data.category,
      gender: data.gender ?? null,
      chartJson: data.chartJson as Prisma.InputJsonValue,
    },
  });

  return ok(chart, 201);
}
