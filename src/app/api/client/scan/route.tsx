import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getMeasurementsFromMedia } from "@/lib/measurementProvider";
import { rateLimit } from "@/lib/rateLimit";
import { ok, err, notFound, serverError } from "@/lib/api";

const schema = z.object({
  brandSlug: z.string(),
  heightCm: z.number().min(100).max(250),
  stylePreference: z.enum(["casual", "formal", "sport"]).optional(),
  occasion: z.string().max(80).optional(),
});

/**
 * POST /api/client/scan
 * Client-facing endpoint — no media required, uses heightCm + stub provider.
 * Returns measurements, size recommendations per SizeChart category, sessionId.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const { allowed } = rateLimit(`scan:${ip}`, 30, 60_000);
  if (!allowed) return err("RATE_LIMITED", "Too many requests.", 429);

  const body = await req.json().catch(() => null);
  if (!body) return err("INVALID_JSON", "Invalid request body");

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { brandSlug, heightCm, stylePreference, occasion } = parsed.data;

  const brand = await db.brand.findUnique({
    where: { slug: brandSlug },
    include: {
      sizeCharts: true,
      products: {
        where: { isActive: true },
        include: { variants: { take: 3, orderBy: { sizeLabel: "asc" } } },
        orderBy: { category: "asc" },
      },
    },
  });

  if (!brand) return notFound("Brand");

  try {
    const measurementResponse = await getMeasurementsFromMedia({
      brandId: brand.id,
      mediaUrl: "stub",
      heightCm,
    });

    // Compute size recommendations from SizeCharts
    const sizeRecommendations: Record<string, string> = {};
    for (const chart of brand.sizeCharts) {
      const recommended = recommendSize(
        chart.chartJson as ChartJson,
        measurementResponse.measurements
      );
      if (recommended) {
        const key = [chart.category, chart.gender].filter(Boolean).join(" / ");
        sizeRecommendations[key] = recommended;
      }
    }

    const [bodyProfile, session] = await db.$transaction(async (tx) => {
      const bp = await tx.bodyProfile.create({
        data: {
          brandId: brand.id,
          rawMeasurementsJson: measurementResponse.measurements,
          provider: "stub",
        },
      });
      const s = await tx.recommendationSession.create({
        data: {
          brandId: brand.id,
          bodyProfileId: bp.id,
          context: "widget",
          source: "webWidget",
        },
      });
      return [bp, s];
    });

    return ok({
      measurements: measurementResponse.measurements,
      sizeRecommendations,
      bodyProfileId: bodyProfile.id,
      sessionId: session.id,
      products: brand.products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        imageUrl: p.imageUrl,
        variants: p.variants.map((v) => ({
          id: v.id,
          sizeLabel: v.sizeLabel,
          color: v.color,
          price: v.price,
          stockStatus: v.stockStatus,
        })),
      })),
      stylePreference: stylePreference ?? null,
      occasion: occasion ?? null,
    });
  } catch (e) {
    console.error("[/api/client/scan]", e);
    return serverError("Scan failed. Please try again.");
  }
}

// ─── Size recommendation helper ───────────────────────────────────────────────

type SizeEntry = {
  label: string;
  chest?: [number, number];
  waist?: [number, number];
  hips?: [number, number];
  inseam?: [number, number];
};

type ChartJson = { sizes?: SizeEntry[] } | SizeEntry[];

function recommendSize(
  chartJson: ChartJson,
  measurements: Record<string, number>
): string | null {
  const sizes: SizeEntry[] = Array.isArray(chartJson)
    ? chartJson
    : chartJson.sizes ?? [];

  if (sizes.length === 0) return null;

  const chest = measurements.chest;
  const waist = measurements.waist;
  const hips = measurements.hips;

  for (const size of sizes) {
    const chestOk = !size.chest || (chest >= size.chest[0] && chest <= size.chest[1]);
    const waistOk = !size.waist || (waist >= size.waist[0] && waist <= size.waist[1]);
    const hipsOk  = !size.hips  || (hips  >= size.hips[0]  && hips  <= size.hips[1]);
    if (chestOk && waistOk && hipsOk) return size.label;
  }

  // Fallback: nearest chest match
  if (chest && sizes.some((s) => s.chest)) {
    const best = sizes
      .filter((s) => s.chest)
      .sort((a, b) => {
        const midA = (a.chest![0] + a.chest![1]) / 2;
        const midB = (b.chest![0] + b.chest![1]) / 2;
        return Math.abs(midA - chest) - Math.abs(midB - chest);
      })[0];
    return best?.label ?? null;
  }

  return sizes[0]?.label ?? null;
}
