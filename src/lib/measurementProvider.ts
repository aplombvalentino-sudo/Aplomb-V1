/**
 * Pluggable body-measurement provider.
 *
 * This module is the ONLY place that talks to an external measurement API.
 * Swap the implementation inside getMeasurementsFromMedia() to change providers.
 * The rest of the app must never import a provider SDK directly.
 *
 * Environment variables (add to .env):
 *   MEASUREMENT_PROVIDER=stub|3dlook|sizestream
 *   MEASUREMENT_PROVIDER_API_KEY=<key>
 *   MEASUREMENT_PROVIDER_BASE_URL=<url>
 */

export type MeasurementRequest = {
  userId?: string;
  brandId?: string;
  mediaUrl: string;
  heightCm?: number;
  hints?: Record<string, unknown>;
};

export type MeasurementResponse = {
  measurements: Record<string, number>;
  providerName: string;
  rawProviderResponse?: unknown;
};

// ─── Stub implementation ──────────────────────────────────────────────────────

function stubMeasurements(req: MeasurementRequest): MeasurementResponse {
  const seed = req.userId ?? req.brandId ?? "default";
  const hash = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);

  // Deterministic but slightly varied measurements based on the seed
  const offset = (hash % 20) - 10;

  return {
    measurements: {
      height: req.heightCm ?? 170 + offset,
      chest: 94 + offset,
      waist: 78 + offset,
      hips: 98 + offset,
      inseam: 80 + Math.abs(offset),
      shoulder: 44 + (offset / 2),
      sleeve: 62 + (offset / 3),
      neck: 38 + (offset / 4),
      thigh: 58 + offset,
    },
    providerName: "stub",
    rawProviderResponse: { stub: true, input: req },
  };
}

// ─── Real provider router ─────────────────────────────────────────────────────

async function callThreeDLook(req: MeasurementRequest): Promise<MeasurementResponse> {
  // TODO: implement 3DLOOK API call
  // const apiKey = process.env.MEASUREMENT_PROVIDER_API_KEY;
  // const baseUrl = process.env.MEASUREMENT_PROVIDER_BASE_URL ?? 'https://api.3dlook.ai';
  throw new Error("3DLOOK provider not yet implemented");
}

async function callSizeStream(req: MeasurementRequest): Promise<MeasurementResponse> {
  // TODO: implement SizeStream API call
  throw new Error("SizeStream provider not yet implemented");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getMeasurementsFromMedia(
  req: MeasurementRequest
): Promise<MeasurementResponse> {
  const provider = process.env.MEASUREMENT_PROVIDER ?? "stub";

  switch (provider) {
    case "3dlook":
      return callThreeDLook(req);
    case "sizestream":
      return callSizeStream(req);
    case "stub":
    default:
      return stubMeasurements(req);
  }
}
