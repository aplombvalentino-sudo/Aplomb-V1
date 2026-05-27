import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, unauthorized, forbidden, notFound } from "@/lib/api";
import { parseJsonBody, parseParam, zCuid } from "@/lib/validate";

const updateSchema = z
  .object({
    category: z.string().min(1).max(100).optional(),
    gender: z.enum(["male", "female", "unisex"]).optional().nullable(),
    chartJson: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

async function getChartAndCheckAccess(chartId: string, userId: string) {
  const chart = await db.sizeChart.findUnique({ where: { id: chartId } });
  if (!chart) return { chart: null, authorised: false };

  const m = await db.brandUser.findUnique({
    where: { userId_brandId: { userId, brandId: chart.brandId } },
  });
  return { chart, authorised: !!m };
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
  const { chart, authorised } = await getChartAndCheckAccess(id, session.user.id);
  if (!chart) return notFound("SizeChart");
  if (!authorised) return forbidden();

  return ok(chart);
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
  const { chart, authorised } = await getChartAndCheckAccess(id, session.user.id);
  if (!chart) return notFound("SizeChart");
  if (!authorised) return forbidden();

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

  const { id: rawId } = await params;
  const idParsed = parseParam(rawId, zCuid);
  if (!idParsed.ok) return idParsed.response;
  const id = idParsed.data;
  const { chart, authorised } = await getChartAndCheckAccess(id, session.user.id);
  if (!chart) return notFound("SizeChart");
  if (!authorised) return forbidden();

  await db.sizeChart.delete({ where: { id } });
  return ok({ deleted: true });
}
