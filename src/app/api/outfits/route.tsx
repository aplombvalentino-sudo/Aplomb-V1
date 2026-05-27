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
import { auth } from "@/lib/auth";
import { ok, err, notFound, serverError } from "@/lib/api";
import { parseJsonBody, zCuid } from "@/lib/validate";
import { authorizeSession } from "@/lib/ownership";
import { LIMITS, enforceLimits, tooManyRequests } from "@/lib/rateLimit-upstash";
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
    recommendationSessionId: zCuid,
    occasion: z.string().max(120).optional(),
    stylePreference: z.string().max(120).optional(),
    colorPalette: z.string().max(120).optional(),
    maxOutfits: z.number().int().min(1).max(3).optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const {
    brandSlug,
    recommendationSessionId,
    occasion,
    stylePreference,
    colorPalette,
    maxOutfits,
  } = parsed.data;

  // Authorise the caller BEFORE rate-limiting — so attackers can't bypass
  // the ownership check by burning rate-limit credits on random session ids.
  const ownership = await authorizeSession(req, recommendationSessionId);
  if (!ownership.ok) {
    return err(
      ownership.status === 401 ? "UNAUTHORIZED" : ownership.status === 403 ? "FORBIDDEN" : "NOT_FOUND",
      ownership.reason,
      ownership.status,
    );
  }

  // Rate limit per identity. Logged-in user → user.id; anonymous shopper →
  // recommendation session id (already proven theirs).
  const authSession = await auth();
  const identity = authSession?.user?.id ?? `rs:${recommendationSessionId}`;
  const guard = await enforceLimits(identity, [LIMITS.ai_daily, LIMITS.ai_minute]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  // Re-fetch with the nested data we need for the prompt
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
