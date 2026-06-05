-- ─── Digital Wardrobe — repositioning shift ──────────────────────────────────
-- Aplomb is now wardrobe-first (sizing is secondary). This migration adds the
-- WardrobeItem model that holds both CERTIFIED items (linked to Brand catalog)
-- and USER_PHOTO items (clothing the shopper photographs themselves).

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "WardrobeItemSourceType" AS ENUM ('certified', 'user_photo');

CREATE TYPE "WardrobeItemProcessingStatus" AS ENUM (
  'pending_upload',
  'processing',
  'needs_review',
  'ready',
  'failed'
);

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE "wardrobe_items" (
  "id"                  TEXT NOT NULL,
  "user_id"             TEXT NOT NULL,
  "source_type"         "WardrobeItemSourceType" NOT NULL,
  "product_id"          TEXT,
  "product_variant_id"  TEXT,
  "front_image_path"    TEXT,
  "back_image_path"     TEXT,
  "processed_asset_path" TEXT,
  "category"            TEXT NOT NULL,
  "subcategory"         TEXT,
  "color"               TEXT,
  "brand"               TEXT,
  "nickname"            TEXT,
  "processing_status"   "WardrobeItemProcessingStatus" NOT NULL DEFAULT 'ready',
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "wardrobe_items_pkey" PRIMARY KEY ("id")
);

-- ─── FKs ──────────────────────────────────────────────────────────────────────
-- User CASCADE → wardrobe items are deleted with the account (Art 17 erasure).
-- Product / Variant SET NULL → if a brand removes a catalog product, the user
-- doesn't lose the wardrobe item; it just loses its catalog link.

ALTER TABLE "wardrobe_items"
  ADD CONSTRAINT "wardrobe_items_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wardrobe_items"
  ADD CONSTRAINT "wardrobe_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "Product"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "wardrobe_items"
  ADD CONSTRAINT "wardrobe_items_product_variant_id_fkey"
  FOREIGN KEY ("product_variant_id") REFERENCES "ProductVariant"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Indices ──────────────────────────────────────────────────────────────────

CREATE INDEX "wardrobe_items_user_id_idx" ON "wardrobe_items"("user_id");
CREATE INDEX "wardrobe_items_user_id_source_type_idx" ON "wardrobe_items"("user_id", "source_type");
CREATE INDEX "wardrobe_items_user_id_processing_status_idx" ON "wardrobe_items"("user_id", "processing_status");

-- ─── Row-Level Security ───────────────────────────────────────────────────────
-- Defence-in-depth only — the app connects via the service-role connection
-- which bypasses RLS (see SECURITY.md). These policies catch any future code
-- that uses the Supabase anon/auth client by mistake. The real ownership
-- gatekeeper is `lib/wardrobe/*` + the API route handlers.

ALTER TABLE "wardrobe_items" ENABLE ROW LEVEL SECURITY;

-- A user can read only their own wardrobe items (when accessed via Supabase JWT).
CREATE POLICY "wardrobe_items_read_owner"
  ON "wardrobe_items"
  FOR SELECT
  USING (auth.uid()::text = "user_id");

-- A user can insert / update / delete only their own wardrobe items.
CREATE POLICY "wardrobe_items_write_owner"
  ON "wardrobe_items"
  FOR ALL
  USING (auth.uid()::text = "user_id")
  WITH CHECK (auth.uid()::text = "user_id");

-- ─── Storage bucket reminder (manual setup in Supabase dashboard) ────────────
-- A new bucket `wardrobe-items` must exist (Public = OFF, like body-scans).
-- See docs/handoff or operator runbook. Without it, /api/wardrobe/items/upload
-- will fail with a storage error and the app surfaces a clear message to the
-- operator.
