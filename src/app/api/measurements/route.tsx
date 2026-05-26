/**
 * POST /api/measurements
 *
 * The customer-facing measurement endpoint. Accepts multipart/form-data with
 * two body-scan photos plus typed measurements. Stores photos privately,
 * runs the measurement provider, persists the body profile, and creates a
 * recommendation session in one transaction.
 *
 * Body photos are never returned to the client — only derived measurements.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { ok, err, notFound, serverError } from "@/lib/api";
import { runMeasurement, buildBodyShapeSummary } from "@/lib/ai/measurementProvider";
import { recommendSizes } from "@/lib/ai/sizing/recommendSizes";
import {
  uploadBodyScan,
  getSignedBodyScanUrl,
  buildScanPath,
} from "@/lib/ai/storage";

// ─── Schema (parsed AFTER multipart extraction) ─────────────────────────────

const fieldsSchema = z.object({
  brandSlug: z.string().min(1),
  measurementMode: z.enum(["easy", "advanced"]),
  heightCm: z.coerce.number().min(120).max(230),
  weightKg: z.coerce.number().min(30).max(250),
  chestCm: z.coerce.number().min(60).max(180).optional(),
  waistCm: z.coerce.number().min(45).max(180).optional(),
  hipsCm: z.coerce.number().min(70).max(200).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
});

const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  // Rate-limit by IP — measurement is an expensive path.
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const { allowed } = rateLimit(`measurements:${ip}`, 12, 60_000);
  if (!allowed) {
    return err("RATE_LIMITED", "Too many requests. Try again in a minute.", 429);
  }

  // Multipart parse
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return err("INVALID_FORM", "Expected multipart/form-data body.", 400);
  }

  const fieldsParsed = fieldsSchema.safeParse({
    brandSlug: form.get("brandSlug"),
    measurementMode: form.get("measurementMode"),
    heightCm: form.get("heightCm"),
    weightKg: form.get("weightKg"),
    chestCm: form.get("chestCm") || undefined,
    waistCm: form.get("waistCm") || undefined,
    hipsCm: form.get("hipsCm") || undefined,
    gender: form.get("gender") || undefined,
  });
  if (!fieldsParsed.success) {
    return err("VALIDATION_ERROR", fieldsParsed.error.issues[0]?.message ?? "Invalid input");
  }
  const fields = fieldsParsed.data;

  if (fields.measurementMode === "advanced") {
    if (!fields.chestCm || !fields.waistCm || !fields.hipsCm) {
      return err(
        "VALIDATION_ERROR",
        "Advanced mode requires chest, waist, and hips measurements.",
      );
    }
  }

  const frontImage = form.get("frontImage");
  const sideImage = form.get("sideImage");
  if (!(frontImage instanceof File) || !(sideImage instanceof File)) {
    return err("VALIDATION_ERROR", "Front and side photos are required.");
  }
  for (const f of [frontImage, sideImage]) {
    if (f.size > MAX_PHOTO_BYTES) {
      return err("PHOTO_TOO_LARGE", "Photos must be under 8 MB each.", 413);
    }
    if (!ACCEPTED_MIME.includes(f.type)) {
      return err("PHOTO_TYPE", "Photos must be JPEG, PNG, or WebP.", 415);
    }
  }

  // Brand lookup
  const brand = await db.brand.findUnique({
    where: { slug: fields.brandSlug },
    include: { sizeCharts: true },
  });
  if (!brand) return notFound("Brand");

  // Session (auth optional — anonymous shoppers allowed)
  const session = await auth();
  const userId = session?.user?.id ?? null;

  try {
    // Upload photos to private bucket under a generated session id
    const tempSessionId = cryptoRandomId();
    const frontPath = buildScanPath(tempSessionId, "front", frontImage.type);
    const sidePath = buildScanPath(tempSessionId, "side", sideImage.type);

    await Promise.all([
      uploadBodyScan(frontImage, frontPath),
      uploadBodyScan(sideImage, sidePath),
    ]);

    // Short-lived signed URLs for the measurement provider
    const [frontUrl, sideUrl] = await Promise.all([
      getSignedBodyScanUrl(frontPath),
      getSignedBodyScanUrl(sidePath),
    ]);

    // Run measurement (stub today, 3DLOOK later)
    const measurements = await runMeasurement({
      measurementMode: fields.measurementMode,
      heightCm: fields.heightCm,
      weightKg: fields.weightKg,
      chestCm: fields.chestCm,
      waistCm: fields.waistCm,
      hipsCm: fields.hipsCm,
      frontImageUrl: frontUrl,
      sideImageUrl: sideUrl,
      gender: fields.gender,
    });

    // Strip raw provider payload before persisting / returning
    const { rawProviderResponse: _omit, ...measurementsToStore } = measurements;
    void _omit;

    const bodyShapeSummary = buildBodyShapeSummary(measurements);

    // Persist BodyProfile + RecommendationSession atomically
    const [bodyProfile, recommendationSession] = await db.$transaction(async (tx) => {
      const bp = await tx.bodyProfile.create({
        data: {
          userId,
          brandId: brand.id,
          rawMeasurementsJson: measurementsToStore,
          bodyShapeSummary,
          provider: measurements.providerName === "stub" ? "stub" : "custom",
          measurementMode: fields.measurementMode,
          frontImagePath: frontPath,
          sideImagePath: sidePath,
        },
      });
      const rs = await tx.recommendationSession.create({
        data: {
          brandId: brand.id,
          userId,
          bodyProfileId: bp.id,
          context: "widget",
          source: "app",
        },
      });
      return [bp, rs];
    });

    // Deterministic size recommendation
    const sizeRecommendations = recommendSizes(measurements, brand.sizeCharts);

    return ok({
      bodyProfileId: bodyProfile.id,
      recommendationSessionId: recommendationSession.id,
      measurements: measurementsToStore,
      bodyShapeSummary,
      sizeRecommendations,
    });
  } catch (e) {
    console.error("[/api/measurements]", e);
    return serverError(
      e instanceof Error ? e.message : "Failed to process measurements",
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function cryptoRandomId(): string {
  // 16 hex chars — enough entropy for a 30-minute lifetime
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return Math.random().toString(36).slice(2, 18);
}
