-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BrandPlan" AS ENUM ('free', 'pro', 'enterprise');

-- CreateEnum
CREATE TYPE "BrandUserRole" AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('inStock', 'lowStock', 'outOfStock');

-- CreateEnum
CREATE TYPE "MeasurementProvider" AS ENUM ('stub', 'ThreeDLook', 'SizeStream', 'custom');

-- CreateEnum
CREATE TYPE "MeasurementMode" AS ENUM ('easy', 'advanced');

-- CreateEnum
CREATE TYPE "SessionContext" AS ENUM ('PDP', 'home', 'quiz', 'widget');

-- CreateEnum
CREATE TYPE "SessionSource" AS ENUM ('webWidget', 'app', 'api');

-- CreateEnum
CREATE TYPE "OutfitItemPosition" AS ENUM ('top', 'bottom', 'outerwear', 'shoes', 'accessory', 'fullbody');

-- CreateEnum
CREATE TYPE "TryOnProvider" AS ENUM ('fal_fashn', 'stub');

-- CreateEnum
CREATE TYPE "TryOnQualityMode" AS ENUM ('fast', 'balanced', 'quality');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#000000',
    "plan" "BrandPlan" NOT NULL DEFAULT 'free',
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "role" "BrandUserRole" NOT NULL DEFAULT 'viewer',

    CONSTRAINT "BrandUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "subcategory" TEXT,
    "tags" TEXT[],
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "externalId" TEXT,
    "sku" TEXT,
    "sizeLabel" TEXT,
    "color" TEXT,
    "additionalImages" TEXT[],
    "stockStatus" "StockStatus" NOT NULL DEFAULT 'inStock',
    "price" DECIMAL(10,2),

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SizeChart" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "gender" TEXT,
    "chartJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizeChart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "brandId" TEXT NOT NULL,
    "rawMeasurementsJson" JSONB NOT NULL,
    "bodyShapeSummary" TEXT,
    "provider" "MeasurementProvider" NOT NULL DEFAULT 'stub',
    "measurementMode" "MeasurementMode" NOT NULL DEFAULT 'easy',
    "frontImagePath" TEXT,
    "sideImagePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BodyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationSession" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "userId" TEXT,
    "bodyProfileId" TEXT,
    "context" "SessionContext" NOT NULL DEFAULT 'widget',
    "source" "SessionSource" NOT NULL DEFAULT 'webWidget',
    "ownerTokenHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outfit" (
    "id" TEXT NOT NULL,
    "recommendationSessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outfit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutfitItem" (
    "id" TEXT NOT NULL,
    "outfitId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productVariantId" TEXT,
    "position" "OutfitItemPosition" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OutfitItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TryOnResult" (
    "id" TEXT NOT NULL,
    "outfitItemId" TEXT NOT NULL,
    "bodyProfileId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "provider" "TryOnProvider" NOT NULL DEFAULT 'fal_fashn',
    "qualityMode" "TryOnQualityMode" NOT NULL DEFAULT 'balanced',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TryOnResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BrandUser_userId_brandId_key" ON "BrandUser"("userId", "brandId");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE INDEX "Product_brandId_isActive_idx" ON "Product"("brandId", "isActive");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "SizeChart_brandId_idx" ON "SizeChart"("brandId");

-- CreateIndex
CREATE INDEX "BodyProfile_brandId_idx" ON "BodyProfile"("brandId");

-- CreateIndex
CREATE INDEX "RecommendationSession_brandId_idx" ON "RecommendationSession"("brandId");

-- CreateIndex
CREATE INDEX "TryOnResult_outfitItemId_idx" ON "TryOnResult"("outfitItemId");

-- CreateIndex
CREATE INDEX "TryOnResult_bodyProfileId_idx" ON "TryOnResult"("bodyProfileId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandUser" ADD CONSTRAINT "BrandUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandUser" ADD CONSTRAINT "BrandUser_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SizeChart" ADD CONSTRAINT "SizeChart_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyProfile" ADD CONSTRAINT "BodyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyProfile" ADD CONSTRAINT "BodyProfile_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationSession" ADD CONSTRAINT "RecommendationSession_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationSession" ADD CONSTRAINT "RecommendationSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationSession" ADD CONSTRAINT "RecommendationSession_bodyProfileId_fkey" FOREIGN KEY ("bodyProfileId") REFERENCES "BodyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outfit" ADD CONSTRAINT "Outfit_recommendationSessionId_fkey" FOREIGN KEY ("recommendationSessionId") REFERENCES "RecommendationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitItem" ADD CONSTRAINT "OutfitItem_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitItem" ADD CONSTRAINT "OutfitItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitItem" ADD CONSTRAINT "OutfitItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TryOnResult" ADD CONSTRAINT "TryOnResult_outfitItemId_fkey" FOREIGN KEY ("outfitItemId") REFERENCES "OutfitItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TryOnResult" ADD CONSTRAINT "TryOnResult_bodyProfileId_fkey" FOREIGN KEY ("bodyProfileId") REFERENCES "BodyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- ============================================================================
-- Row Level Security policies (idempotent)
-- Applied here so fresh DBs inherit them automatically. The live DB already
-- has these from a manual rls.sql run; re-applying via this migration is a
-- no-op because the script uses DROP POLICY IF EXISTS before each CREATE.
-- ============================================================================

-- ============================================================================
-- Aplomb — Supabase Row Level Security (RLS) policies
-- ============================================================================
--
-- Run this in the Supabase SQL Editor (Project → SQL).
--
-- This is defense in depth. Our server code uses the service-role client for
-- privileged paths (private storage, AI providers) which bypasses RLS by
-- design. RLS only constrains anon/auth Supabase clients — i.e. anything that
-- might leak via the browser if someone reaches the DB directly.
--
-- The script is idempotent: it uses DROP POLICY IF EXISTS / ENABLE ROW LEVEL
-- SECURITY which is safe to re-run.
-- ============================================================================

-- ─── 1. Enable RLS on every table ──────────────────────────────────────────

ALTER TABLE "User"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Brand"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BrandUser"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductVariant"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SizeChart"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BodyProfile"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecommendationSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Outfit"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OutfitItem"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TryOnResult"           ENABLE ROW LEVEL SECURITY;

-- ─── 2. User-scoped tables ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "user_read_self"   ON "User";
DROP POLICY IF EXISTS "user_update_self" ON "User";
CREATE POLICY "user_read_self"   ON "User" FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "user_update_self" ON "User" FOR UPDATE USING (auth.uid()::text = id);
-- INSERT/DELETE: service-role only (no policy → no access for anon/auth roles).

-- Account / Session / VerificationToken: NextAuth-managed via the service-role
-- connection. No policy → anon/auth roles get zero access. Service role
-- bypasses RLS so server code keeps working.

DROP POLICY IF EXISTS "bodyprofile_read_owner"   ON "BodyProfile";
DROP POLICY IF EXISTS "bodyprofile_delete_owner" ON "BodyProfile";
CREATE POLICY "bodyprofile_read_owner"   ON "BodyProfile" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "bodyprofile_delete_owner" ON "BodyProfile" FOR DELETE USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "recsession_read_owner" ON "RecommendationSession";
CREATE POLICY "recsession_read_owner" ON "RecommendationSession"
  FOR SELECT USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "outfit_read_via_session" ON "Outfit";
CREATE POLICY "outfit_read_via_session" ON "Outfit"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "RecommendationSession" rs
      WHERE rs.id = "Outfit"."recommendationSessionId"
        AND rs."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "outfititem_read_via_outfit" ON "OutfitItem";
CREATE POLICY "outfititem_read_via_outfit" ON "OutfitItem"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Outfit" o
      JOIN "RecommendationSession" rs ON rs.id = o."recommendationSessionId"
      WHERE o.id = "OutfitItem"."outfitId"
        AND rs."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "tryon_read_owner" ON "TryOnResult";
CREATE POLICY "tryon_read_owner" ON "TryOnResult"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "BodyProfile" bp
      WHERE bp.id = "TryOnResult"."bodyProfileId"
        AND bp."userId" = auth.uid()::text
    )
  );

-- ─── 3. Brand-scoped tables ────────────────────────────────────────────────

DROP POLICY IF EXISTS "branduser_read_self" ON "BrandUser";
CREATE POLICY "branduser_read_self" ON "BrandUser"
  FOR SELECT USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "brand_read_public" ON "Brand";
DROP POLICY IF EXISTS "brand_update_owner_admin" ON "Brand";
CREATE POLICY "brand_read_public" ON "Brand" FOR SELECT USING (true);
CREATE POLICY "brand_update_owner_admin" ON "Brand"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "BrandUser" bu
      WHERE bu."brandId" = "Brand".id
        AND bu."userId" = auth.uid()::text
        AND bu.role IN ('owner','admin')
    )
  );

DROP POLICY IF EXISTS "product_read_public" ON "Product";
DROP POLICY IF EXISTS "product_write_member" ON "Product";
CREATE POLICY "product_read_public" ON "Product"
  FOR SELECT USING ("isActive" = true);
CREATE POLICY "product_write_member" ON "Product"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "BrandUser" bu
      WHERE bu."brandId" = "Product"."brandId"
        AND bu."userId" = auth.uid()::text
        AND bu.role IN ('owner','admin','editor')
    )
  );

DROP POLICY IF EXISTS "productvariant_read_public" ON "ProductVariant";
DROP POLICY IF EXISTS "productvariant_write_member" ON "ProductVariant";
CREATE POLICY "productvariant_read_public" ON "ProductVariant" FOR SELECT USING (true);
CREATE POLICY "productvariant_write_member" ON "ProductVariant"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Product" p
      JOIN "BrandUser" bu ON bu."brandId" = p."brandId"
      WHERE p.id = "ProductVariant"."productId"
        AND bu."userId" = auth.uid()::text
        AND bu.role IN ('owner','admin','editor')
    )
  );

DROP POLICY IF EXISTS "sizechart_read_member" ON "SizeChart";
DROP POLICY IF EXISTS "sizechart_write_member" ON "SizeChart";
CREATE POLICY "sizechart_read_member" ON "SizeChart"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "BrandUser" bu
      WHERE bu."brandId" = "SizeChart"."brandId"
        AND bu."userId" = auth.uid()::text
    )
  );
CREATE POLICY "sizechart_write_member" ON "SizeChart"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "BrandUser" bu
      WHERE bu."brandId" = "SizeChart"."brandId"
        AND bu."userId" = auth.uid()::text
        AND bu.role IN ('owner','admin','editor')
    )
  );

-- ─── 4. Storage bucket: body-scans ────────────────────────────────────────

-- The bucket itself must be private. Verify in Supabase dashboard → Storage →
-- body-scans → Settings → "Public bucket" = OFF.
--
-- The policies below restrict the storage.objects rows for that bucket to
-- service-role access only. Our server code uses the service-role client
-- (lib/supabase.ts → getSupabaseServiceClient) which bypasses RLS, so uploads
-- and signed-URL generation continue to work; nothing else can read the photos.

DROP POLICY IF EXISTS "bodyscans_service_select" ON storage.objects;
DROP POLICY IF EXISTS "bodyscans_service_all"    ON storage.objects;
CREATE POLICY "bodyscans_service_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'body-scans' AND auth.role() = 'service_role');
CREATE POLICY "bodyscans_service_all" ON storage.objects
  FOR ALL USING (bucket_id = 'body-scans' AND auth.role() = 'service_role');

-- ─── Done ─────────────────────────────────────────────────────────────────
-- Verify policies are in place:
--   SELECT schemaname, tablename, policyname, cmd FROM pg_policies
--   WHERE schemaname = 'public' ORDER BY tablename, policyname;
