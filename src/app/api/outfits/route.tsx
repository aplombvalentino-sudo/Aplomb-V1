/**
 * POST /api/outfits
 *
 * Generates 1–3 complete outfits for a given recommendation session using
 * Gemini. The model is constrained to the brand's active catalog and returns
 * strict JSON. Generated outfits are persisted to the DB.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { ok, err, notFound, serverError } from "@/lib/api";
import {
  generateOutfitsWithGemini,
  type CatalogProductInput,
} from "@/lib/ai/gemini/outfits";
import type { NormalizedMeasurements } from "@/lib/ai/measurementProvider";

const schema = z
  .object({
    brandSlug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid brand slug"),
    recommendationSessionId: z.string().min(20).max(40).regex(/^c[a-z0-9]+$/, "Invalid id"),
    occasion: z.string().max(120).optional(),
    stylePreference: z.string().max(120).optional(),
    colorPalette: z.string().max(120).optional(),
    maxOutfits: z.number().int().min(1).max(3).optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const { allowed } = rateLimit(`outfits:${ip}`, 12, 60_000);
  if (!allowed) {
    return err("RATE_LIMITED", "Too many requests. Try again in a minute.", 429);
  }

  const body = await req.json().catch(() => null);
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return err("INVALID_JSON", "Request body must be a JSON object.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return err("VALIDATION_ERROR", `${first?.path?.join(".") ?? "input"}: ${first?.message ?? "Invalid input"}`);
  }
  const {
    brandSlug,
    recommendationSessionId,
    occasion,
    stylePreference,
    colorPalette,
    maxOutfits,
  } = parsed.data;

  // Load the session + brand + catalog
  const session = await db.recommendationSession.findUnique({
    where: { id: recommendationSessionId },
    include: {
      bodyProfile: true,
      brand: {
        include: {
          products: {
            where: { isActive: true },
            include: { variants: true },
          },
        },
      },
    },
  });
  if (!session || session.brand.slug !== brandSlug) {
    return notFound("Recommendation session");
  }
  if (session.brand.products.length === 0) {
    return err("EMPTY_CATALOG", "Brand has no active products.", 400);
  }

  // Shape catalog input for the model
  const catalog: CatalogProductInput[] = session.brand.products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    subcategory: p.subcategory,
    description: p.description,
    tags: p.tags,
    variants: p.variants.map((v) => ({
      id: v.id,
      sizeLabel: v.sizeLabel,
      color: v.color,
    })),
  }));

  const measurements = (session.bodyProfile?.rawMeasurementsJson ?? null) as
    | NormalizedMeasurements
    | null;
  if (!measurements) {
    return err(
      "MISSING_BODY_PROFILE",
      "This session has no measurements yet — run /api/measurements first.",
      400,
    );
  }

  try {
    const generated = await generateOutfitsWithGemini({
      brandName: session.brand.name,
      catalog,
      measurements,
      bodyShapeSummary: session.bodyProfile?.bodyShapeSummary ?? null,
      occasion,
      stylePreference,
      colorPalette,
      maxOutfits,
    });

    // Persist outfits + items in one transaction
    await db.$transaction(async (tx) => {
      for (const outfit of generated.outfits) {
        await tx.outfit.create({
          data: {
            recommendationSessionId: session.id,
            title: outfit.title.slice(0, 120),
            description: outfit.description?.slice(0, 280),
            rationale: outfit.rationale?.slice(0, 600),
            items: {
              create: outfit.items.map((it) => ({
                productId: it.productId,
                productVariantId: it.productVariantId,
                position: it.position,
                isRequired: it.isRequired ?? true,
              })),
            },
          },
        });
      }
    });

    // Re-fetch the newly-created outfits with nested product data
    const fullOutfits = await db.outfit.findMany({
      where: { recommendationSessionId: session.id },
      orderBy: { createdAt: "desc" },
      take: generated.outfits.length,
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, imageUrl: true, category: true },
            },
            productVariant: {
              select: { id: true, sizeLabel: true, color: true },
            },
          },
        },
      },
    });

    return ok({ outfits: fullOutfits });
  } catch (e) {
    console.error("[/api/outfits]", e);
    return serverError(e instanceof Error ? e.message : "Outfit generation failed");
  }
}
