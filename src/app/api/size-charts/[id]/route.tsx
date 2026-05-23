import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, err, unauthorized, forbidden, notFound } from "@/lib/api";

const updateSchema = z.object({
  category: z.string().min(1).max(100).optional(),
  gender: z.string().optional().nullable(),
  chartJson: z.unknown().optional(),
});

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

  const { id } = await params;
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

  const { id } = await params;
  const { chart, authorised } = await getChartAndCheckAccess(id, session.user.id);
  if (!chart) return notFound("SizeChart");
  if (!authorised) return forbidden();

  const body = await req.json().catch(() => null);
  if (!body) return err("INVALID_JSON", "Invalid request body");

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const updated = await db.sizeChart.update({
    where: { id },
    data: {
      ...(parsed.data.category && { category: parsed.data.category }),
      gender: parsed.data.gender,
      ...(parsed.data.chartJson !== undefined && {
        chartJson: parsed.data.chartJson as object,
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

  const { id } = await params;
  const { chart, authorised } = await getChartAndCheckAccess(id, session.user.id);
  if (!chart) return notFound("SizeChart");
  if (!authorised) return forbidden();

  await db.sizeChart.delete({ where: { id } });
  return ok({ deleted: true });
}
