import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, err, unauthorized, forbidden } from "@/lib/api";

const createSchema = z.object({
  brandId: z.string(),
  category: z.string().min(1).max(100),
  gender: z.string().optional().nullable(),
  chartJson: z.unknown(),
});

async function checkBrandAccess(userId: string, brandId: string) {
  const m = await db.brandUser.findUnique({
    where: { userId_brandId: { userId, brandId } },
  });
  return !!m;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) return err("MISSING_BRAND", "brandId is required");

  const ok_ = await checkBrandAccess(session.user.id, brandId);
  if (!ok_) return forbidden();

  const items = await db.sizeChart.findMany({
    where: { brandId },
    orderBy: { category: "asc" },
  });

  return ok({ items, total: items.length });
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

  const ok_ = await checkBrandAccess(session.user.id, parsed.data.brandId);
  if (!ok_) return forbidden();

  const chart = await db.sizeChart.create({
    data: {
      brandId: parsed.data.brandId,
      category: parsed.data.category,
      gender: parsed.data.gender ?? null,
      chartJson: parsed.data.chartJson as object,
    },
  });

  return ok(chart, 201);
}
