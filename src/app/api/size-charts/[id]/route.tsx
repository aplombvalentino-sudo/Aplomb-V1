import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, unauthorized, forbidden, notFound } from "@/lib/api";
import { parseJsonBody, parseParam, zCuid } from "@/lib/validate";
import { requireBrandRole, ROLES_READ, ROLES_WRITE, ROLES_ADMIN } from "@/lib/brandRole";
import { LIMITS, enforceLimits, tooManyRequests } from "@/lib/rateLimit-upstash";
import type { BrandUserRole } from "@prisma/client";

const updateSchema = z
  .object({
    category: z.string().min(1).max(100).optional(),
    gender: z.enum(["male", "female", "unisex"]).optional().nullable(),
    chartJson: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

async function loadChartWithRole(
  chartId: string,
  userId: string,
  allowed: BrandUserRole[],
) {
  const chart = await db.sizeChart.findUnique({ where: { id: chartId } });
  if (!chart) return { ok: false as const, response: notFound("SizeChart") };

  const role = await requireBrandRole(userId, chart.brandId, allowed);
  if (!role.ok) return { ok: false as const, response: forbidden() };

  return { ok: true as const, chart };
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

  const r = await loadChartWithRole(idParsed.data, session.user.id, ROLES_READ);
  if (!r.ok) return r.response;
  return ok(r.chart);
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

  // Editors and above can update size charts.
  const r = await loadChartWithRole(id, session.user.id, ROLES_WRITE);
  if (!r.ok) return r.response;

  const parsed = await parseJsonBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;

  const updated = await db.sizeChart.update({
    where: { id },
    data: {
      ...(parsed.data.category && { category: parsed.data.category }),
      gender: parsed.data.gender,
      ...(parsed.data.chartJson !== undefined && {
        chartJson: parsed.data.chartJson as Prisma.InputJsonValue,
      }),
    },
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
  const r = await loadChartWithRole(id, session.user.id, ROLES_ADMIN);
  if (!r.ok) return r.response;

  await db.sizeChart.delete({ where: { id } });
  return ok({ deleted: true });
}
