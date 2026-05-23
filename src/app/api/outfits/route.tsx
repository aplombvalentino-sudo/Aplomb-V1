import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateOutfits } from "@/lib/outfitGenerator";
import { rateLimit } from "@/lib/rateLimit";
import { ok, err, notFound, serverError } from "@/lib/api";

const schema = z.object({
  brandSlug: z.string(),
  recommendationSessionId: z.string(),
  context: z
    .object({
      occasion: z.string().optional(),
      stylePreferences: z.array(z.string()).optional(),
      maxItems: z.number().int().min(1).max(8).optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const { allowed } = rateLimit(`outfits:${ip}`, 20, 60_000);
  if (!allowed) {
    return err("RATE_LIMITED", "Too many requests. Please try again in a minute.", 429);
  }

  const body = await req.json().catch(() => null);
  if (!body) return err("INVALID_JSON", "Invalid request body");

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { brandSlug, recommendationSessionId, context } = parsed.data;

  const brand = await db.brand.findUnique({ where: { slug: brandSlug } });
  if (!brand) return notFound("Brand");

  const session = await db.recommendationSession.findUnique({
    where: { id: recommendationSessionId },
    include: { bodyProfile: true },
  });

  if (!session || session.brandId !== brand.id) return notFound("Session");
  if (!session.bodyProfile) {
    return err("NO_BODY_PROFILE", "No body measurements found for this session");
  }

  const rawMeasurements = session.bodyProfile.rawMeasurementsJson as Record<string, number>;

  try {
    const result = await generateOutfits({
      brandId: brand.id,
      bodyProfile: {
        measurements: rawMeasurements,
        providerName: session.bodyProfile.provider,
        bodyShapeSummary: session.bodyProfile.bodyShapeSummary ?? undefined,
      },
      context,
    });

    const savedOutfits = await db.$transaction(async (tx) => {
      return Promise.all(
        result.outfits.map(async (o) => {
          const outfit = await tx.outfit.create({
            data: {
              recommendationSessionId,
              title: o.title,
              description: o.description,
              rationale: o.rationale,
            },
          });

          await tx.outfitItem.createMany({
            data: o.items.map((item) => ({
              outfitId: outfit.id,
              productId: item.productId,
              productVariantId: item.productVariantId ?? null,
              position: item.position,
              isRequired: true,
            })),
          });

          return tx.outfit.findUnique({
            where: { id: outfit.id },
            include: {
              items: {
                include: { product: true, productVariant: true },
              },
            },
          });
        })
      );
    });

    return ok({
      outfits: savedOutfits.filter(Boolean),
      sessionId: recommendationSessionId,
    });
  } catch (e) {
    console.error("[/api/outfits]", e);
    return serverError("Failed to generate outfits");
  }
}
