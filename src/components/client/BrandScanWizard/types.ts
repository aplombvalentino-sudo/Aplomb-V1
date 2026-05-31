/**
 * DTOs exchanged with the AI fitting room backend.
 *
 * These shape what /api/measurements, /api/outfits and /api/tryon return,
 * and what BrandScanWizard renders. Kept in their own module so the wizard
 * and its sub-components can import them without pulling in the whole
 * orchestrator (and so tests on the API client can typecheck cleanly).
 */

export type Brand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
};

export type Variant = {
  id: string;
  sizeLabel: string | null;
  color: string | null;
  price: string | null;
  stockStatus: string;
};

export type Product = {
  id: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  variants: Variant[];
};

export type SizeRec = {
  category: string;
  recommendedSize: string;
  confidence: "low" | "medium" | "high";
  explanation: string;
};

export type MeasurementResponse = {
  bodyProfileId: string;
  recommendationSessionId: string;
  measurements: {
    heightCm: number;
    weightKg?: number;
    chestCm?: number;
    waistCm?: number;
    hipsCm?: number;
    shouldersCm?: number;
    inseamCm?: number;
    measurementMode: "easy" | "advanced";
    sourceConfidence: Record<string, "manual" | "ai" | "none">;
  };
  bodyShapeSummary: string;
  sizeRecommendations: SizeRec[];
  /** Anonymous-shopper session token — echoed back via X-Aplomb-Session header. */
  sessionToken: string | null;
};

export type OutfitItemDTO = {
  id: string;
  position: string;
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
    category: string | null;
  };
  productVariant: {
    id: string;
    sizeLabel: string | null;
    color: string | null;
  } | null;
};

export type OutfitDTO = {
  id: string;
  title: string;
  description: string | null;
  rationale: string | null;
  items: OutfitItemDTO[];
};

export type MeasurementMode = "easy" | "advanced";
