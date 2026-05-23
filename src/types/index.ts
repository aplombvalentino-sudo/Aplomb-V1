import type {
  Brand,
  BrandUser,
  Product,
  ProductVariant,
  SizeChart,
  BodyProfile,
  RecommendationSession,
  Outfit,
  OutfitItem,
  BrandUserRole,
  BrandPlan,
  StockStatus,
  MeasurementProvider,
  SessionContext,
  SessionSource,
  OutfitItemPosition,
} from "@prisma/client";

export type {
  Brand,
  BrandUser,
  Product,
  ProductVariant,
  SizeChart,
  BodyProfile,
  RecommendationSession,
  Outfit,
  OutfitItem,
  BrandUserRole,
  BrandPlan,
  StockStatus,
  MeasurementProvider,
  SessionContext,
  SessionSource,
  OutfitItemPosition,
};

// Extended types with relations
export type ProductWithVariants = Product & {
  variants: ProductVariant[];
};

export type OutfitWithItems = Outfit & {
  items: (OutfitItem & {
    product: Product;
    productVariant: ProductVariant | null;
  })[];
};

export type SessionWithOutfits = RecommendationSession & {
  outfits: OutfitWithItems[];
  bodyProfile: BodyProfile | null;
};

// Pagination helper
export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// Brand context from session
export type BrandContext = {
  brand: Brand;
  role: BrandUserRole;
};

// Widget session (no auth)
export type WidgetContext = {
  brandSlug: string;
  productExternalId?: string;
};

// Size chart flexible JSON shape
export type SizeChartJson = {
  headers: string[];
  rows: Array<{
    sizeLabel: string;
    measurements: Record<string, number | string>;
  }>;
};

// Configuration JSON shape for Brand
export type BrandConfiguration = {
  widget?: {
    primaryColor?: string;
    accentColor?: string;
    borderRadius?: string;
    showLogo?: boolean;
  };
  features?: {
    outfitGeneration?: boolean;
    sizingOnly?: boolean;
    anonymousSessions?: boolean;
  };
  integrations?: {
    shopifyShopDomain?: string;
  };
};
