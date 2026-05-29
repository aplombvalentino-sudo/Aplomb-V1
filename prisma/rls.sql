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
ALTER TABLE "legal_acceptances"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions"         ENABLE ROW LEVEL SECURITY;

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

-- Legal acceptances: append-only audit. Owner may read; writes are service-role
-- only (no INSERT/UPDATE/DELETE policy → anon/auth roles get zero write access).
DROP POLICY IF EXISTS "legalacceptance_read_owner" ON "legal_acceptances";
CREATE POLICY "legalacceptance_read_owner" ON "legal_acceptances"
  FOR SELECT USING (auth.uid()::text = "user_id");

-- Subscriptions: shopper reads own; brand members read theirs; writes are
-- service-role only (webhook). No INSERT/UPDATE/DELETE policy for anon/auth.
DROP POLICY IF EXISTS "subscription_read_owner" ON "subscriptions";
CREATE POLICY "subscription_read_owner" ON "subscriptions"
  FOR SELECT USING (
    auth.uid()::text = "user_id"
    OR EXISTS (
      SELECT 1 FROM "BrandUser" bu
      WHERE bu."brandId" = "subscriptions"."brand_id"
        AND bu."userId" = auth.uid()::text
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
