/**
 * Provider-agnostic measurement abstraction.
 *
 * Today: runMeasurement() returns a sensible stub derived from inputs.
 * Tomorrow: drop in 3DLOOK (or another vendor) by implementing the
 * `provider3DLook` function and switching on MEASUREMENT_PROVIDER env var.
 *
 * Nothing in the rest of the app depends on the chosen vendor — they all
 * consume `NormalizedMeasurements`.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type MeasurementMode = "easy" | "advanced";

export type MeasurementSource = "manual" | "ai" | "none";

export type NormalizedMeasurements = {
  measurementMode: MeasurementMode;
  sourceConfidence: {
    chest: MeasurementSource;
    waist: MeasurementSource;
    hips: MeasurementSource;
    shoulders: MeasurementSource;
    inseam: MeasurementSource;
  };
  heightCm: number;
  weightKg?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  shouldersCm?: number;
  inseamCm?: number;
  /** Provider identifier, e.g. "stub", "3dlook" */
  providerName: string;
  /** Raw response from the upstream provider, if any. Never returned to clients. */
  rawProviderResponse?: unknown;
};

export type MeasurementInput = {
  measurementMode: MeasurementMode;
  heightCm: number;
  weightKg?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  /** Pre-signed URL the AI provider can read once. */
  frontImageUrl: string;
  /** Pre-signed URL the AI provider can read once. */
  sideImageUrl: string;
  gender?: "male" | "female" | "other";
};

// ─── Public entrypoint ──────────────────────────────────────────────────────

export async function runMeasurement(input: MeasurementInput): Promise<NormalizedMeasurements> {
  // TODO: wire 3DLOOK once the API key (THREEDLOOK_API_KEY) lands in env.
  //       The signature stays stable so swapping vendors is one return statement away.
  // const provider = process.env.MEASUREMENT_PROVIDER ?? "stub";
  // if (provider === "3dlook") return provider3DLook(input);
  return provideStub(input);
}

// ─── Heuristic stub (good enough until 3DLOOK is wired) ─────────────────────

function provideStub(input: MeasurementInput): NormalizedMeasurements {
  const { measurementMode, heightCm, weightKg, gender } = input;

  // Naïve allometric heuristics derived from height/weight/gender. Not a
  // medical claim — just a placeholder so the rest of the flow has values.
  const bmi = weightKg ? weightKg / Math.pow(heightCm / 100, 2) : 22;
  const isFemale = gender === "female";
  const stockyFactor = clamp((bmi - 18) / 14, 0, 1); // 0=slim, 1=heavier

  const chestBase = isFemale ? 84 : 92;
  const waistBase = isFemale ? 70 : 80;
  const hipsBase = isFemale ? 95 : 95;
  const shoulderBase = isFemale ? 38 : 44;
  const inseamBase = heightCm * (isFemale ? 0.46 : 0.47);

  const chestAi = round(chestBase + stockyFactor * 22 + (heightCm - 170) * 0.15);
  const waistAi = round(waistBase + stockyFactor * 28 + (heightCm - 170) * 0.1);
  const hipsAi = round(hipsBase + stockyFactor * 18 + (heightCm - 170) * 0.12);
  const shouldersAi = round(shoulderBase + stockyFactor * 4 + (heightCm - 170) * 0.07);
  const inseamAi = round(inseamBase);

  const useManual = measurementMode === "advanced";

  return {
    measurementMode,
    sourceConfidence: {
      chest: useManual && input.chestCm ? "manual" : "ai",
      waist: useManual && input.waistCm ? "manual" : "ai",
      hips: useManual && input.hipsCm ? "manual" : "ai",
      shoulders: "ai",
      inseam: "ai",
    },
    heightCm,
    weightKg,
    chestCm: useManual && input.chestCm ? input.chestCm : chestAi,
    waistCm: useManual && input.waistCm ? input.waistCm : waistAi,
    hipsCm: useManual && input.hipsCm ? input.hipsCm : hipsAi,
    shouldersCm: shouldersAi,
    inseamCm: inseamAi,
    providerName: "stub",
  };
}

// ─── Body shape summary (for prompt context downstream) ─────────────────────

export function buildBodyShapeSummary(m: NormalizedMeasurements): string {
  const parts: string[] = [];
  if (m.heightCm) parts.push(`${m.heightCm}cm tall`);
  if (m.weightKg) parts.push(`${m.weightKg}kg`);
  if (m.chestCm && m.waistCm && m.hipsCm) {
    parts.push(`chest ${m.chestCm}/ waist ${m.waistCm}/ hips ${m.hipsCm}cm`);
  }
  return parts.join(", ");
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function round(n: number) {
  return Math.round(n);
}
