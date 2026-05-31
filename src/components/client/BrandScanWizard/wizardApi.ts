/**
 * Typed fetch wrappers for the three AI-fitting-room endpoints the wizard
 * calls. Kept side-effect-free (no React state, no localStorage, no logging)
 * so the wizard owns all UI decisions and these are unit-testable in isolation.
 *
 * Each call returns the raw `ApiResult<T>` envelope from the backend. The
 * caller branches on `success`; the caller also wraps in try/catch for
 * network failures (these helpers don't swallow fetch rejections).
 */

import type {
  MeasurementMode,
  MeasurementResponse,
  OutfitDTO,
} from "./types";

// ─── Envelope ────────────────────────────────────────────────────────────────

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error?: { message?: string } };

// ─── Headers ─────────────────────────────────────────────────────────────────

/**
 * Build request headers for JSON-bodied calls. When we have an anonymous
 * session token (Safari / 3rd-party-iframe contexts where the cookie was
 * blocked by ITP), echo it via X-Aplomb-Session so the server can still
 * verify ownership.
 */
export function authedHeaders(sessionToken: string | null | undefined): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (sessionToken) h["X-Aplomb-Session"] = sessionToken;
  return h;
}

// ─── POST /api/measurements ─────────────────────────────────────────────────

export type MeasurementsInput = {
  brandSlug: string;
  mode: MeasurementMode;
  heightCm: number;
  weightKg: number;
  /** Only sent when mode === "advanced" */
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  gender?: "male" | "female" | "other";
  frontImage: File;
  sideImage: File;
};

export async function postMeasurements(
  input: MeasurementsInput,
): Promise<ApiResult<MeasurementResponse>> {
  const form = new FormData();
  form.set("brandSlug", input.brandSlug);
  form.set("measurementMode", input.mode);
  form.set("heightCm", String(input.heightCm));
  form.set("weightKg", String(input.weightKg));
  if (input.mode === "advanced") {
    if (input.chestCm !== undefined) form.set("chestCm", String(input.chestCm));
    if (input.waistCm !== undefined) form.set("waistCm", String(input.waistCm));
    if (input.hipsCm !== undefined) form.set("hipsCm", String(input.hipsCm));
  }
  if (input.gender) form.set("gender", input.gender);
  form.set("frontImage", input.frontImage);
  form.set("sideImage", input.sideImage);

  // NB: do NOT set Content-Type for FormData — the browser sets multipart
  // boundaries automatically. Setting it manually breaks the upload.
  const res = await fetch("/api/measurements", { method: "POST", body: form });
  return res.json();
}

// ─── POST /api/outfits ───────────────────────────────────────────────────────

export type OutfitsInput = {
  brandSlug: string;
  recommendationSessionId: string;
  occasion?: string;
  stylePreference?: "casual" | "formal" | "sport";
  maxOutfits?: number;
  sessionToken: string | null | undefined;
};

export async function postOutfits(
  input: OutfitsInput,
): Promise<ApiResult<{ outfits: OutfitDTO[] }>> {
  const res = await fetch("/api/outfits", {
    method: "POST",
    headers: authedHeaders(input.sessionToken),
    body: JSON.stringify({
      brandSlug: input.brandSlug,
      recommendationSessionId: input.recommendationSessionId,
      occasion: input.occasion || undefined,
      stylePreference: input.stylePreference || undefined,
      maxOutfits: input.maxOutfits ?? 3,
    }),
  });
  return res.json();
}

// ─── POST /api/tryon ─────────────────────────────────────────────────────────

export type TryOnInput = {
  outfitItemId: string;
  bodyProfileId: string;
  sessionToken: string | null | undefined;
};

export async function postTryOn(
  input: TryOnInput,
): Promise<ApiResult<{ imageUrl: string }>> {
  const res = await fetch("/api/tryon", {
    method: "POST",
    headers: authedHeaders(input.sessionToken),
    body: JSON.stringify({
      outfitItemId: input.outfitItemId,
      bodyProfileId: input.bodyProfileId,
    }),
  });
  return res.json();
}
