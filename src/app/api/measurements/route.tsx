import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getMeasurementsFromMedia } from "@/lib/measurementProvider";
import { rateLimit } from "@/lib/rateLimit";
import { ok, err, notFound, serverError } from "@/lib/api";

const schema = z.object({
  brandSlug: z.string(),
  mediaUrl: z.string().min(1),
  heightCm: z.number().optional(),
  userId: z.string().optional(),
  context: z.enum(["PDP", "home", "quiz", "widget"]).optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const { allowed } = rateLimit(`measurements:${ip}`, 30, 60_000);
  if (!allowed) {
    return err("RATE_LIMITED", "Too many requests. Please try again in a minute.", 429);
  }

  const body = await req.json().catch(() => null);
  if (!body) return err("INVALID_JSON", "Invalid request body");

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { brandSlug, mediaUrl, heightCm, userId, context } = parsed.data;

  const brand = await db.brand.findUnique({ where: { slug: brandSlug } });
  if (!brand) return notFound("Brand");

  try {
    const measurementResponse = await getMeasurementsFromMedia({
      userId,
      brandId: brand.id,
      mediaUrl,
      heightCm,
    });

    const [bodyProfile, session] = await db.$transaction(async (tx) => {
      const bp = await tx.bodyProfile.create({
        data: {
          userId: userId ?? null,
          brandId: brand.id,
          rawMeasurementsJson: measurementResponse.measurements,
          provider: measurementResponse.providerName === "stub" ? "stub" : "custom",
        },
      });

      const s = await tx.recommendationSession.create({
        data: {
          brandId: brand.id,
          userId: userId ?? null,
          bodyProfileId: bp.id,
          context: (context ?? "widget") as "PDP" | "home" | "quiz" | "widget",
          source: "webWidget",
        },
      });

      return [bp, s];
    });

    return ok({
      measurements: measurementResponse.measurements,
      providerName: measurementResponse.providerName,
      bodyProfileId: bodyProfile.id,
      recommendationSessionId: session.id,
    });
  } catch (e) {
    console.error("[/api/measurements]", e);
    return serverError("Failed to process measurements");
  }
}
