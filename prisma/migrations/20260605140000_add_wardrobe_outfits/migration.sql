-- ─── Wardrobe Outfits ────────────────────────────────────────────────────────
-- Adds the server-stored equivalent of the old localStorage saved-outfits.
-- A WardrobeOutfit groups WardrobeItems into a named look; its items live in
-- WardrobeOutfitItem with a free-form "position" string (top/bottom/etc.).

-- ─── WardrobeOutfit ──────────────────────────────────────────────────────────

CREATE TABLE "wardrobe_outfits" (
  "id"        TEXT NOT NULL,
  "user_id"   TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "occasion"  TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "wardrobe_outfits_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "wardrobe_outfits"
  ADD CONSTRAINT "wardrobe_outfits_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "wardrobe_outfits_user_id_idx" ON "wardrobe_outfits"("user_id");

ALTER TABLE "wardrobe_outfits" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wardrobe_outfits_read_owner"
  ON "wardrobe_outfits"
  FOR SELECT
  USING (auth.uid()::text = "user_id");

CREATE POLICY "wardrobe_outfits_write_owner"
  ON "wardrobe_outfits"
  FOR ALL
  USING (auth.uid()::text = "user_id")
  WITH CHECK (auth.uid()::text = "user_id");

-- ─── WardrobeOutfitItem ──────────────────────────────────────────────────────

CREATE TABLE "wardrobe_outfit_items" (
  "id"               TEXT NOT NULL,
  "outfit_id"        TEXT NOT NULL,
  "wardrobe_item_id" TEXT NOT NULL,
  "position"         TEXT NOT NULL,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wardrobe_outfit_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "wardrobe_outfit_items"
  ADD CONSTRAINT "wardrobe_outfit_items_outfit_id_fkey"
  FOREIGN KEY ("outfit_id") REFERENCES "wardrobe_outfits"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wardrobe_outfit_items"
  ADD CONSTRAINT "wardrobe_outfit_items_wardrobe_item_id_fkey"
  FOREIGN KEY ("wardrobe_item_id") REFERENCES "wardrobe_items"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "wardrobe_outfit_items_outfit_id_idx" ON "wardrobe_outfit_items"("outfit_id");
CREATE INDEX "wardrobe_outfit_items_wardrobe_item_id_idx" ON "wardrobe_outfit_items"("wardrobe_item_id");

ALTER TABLE "wardrobe_outfit_items" ENABLE ROW LEVEL SECURITY;

-- Ownership is via the parent outfit. Same defence-in-depth posture: real
-- gatekeeper is application code (lib/wardrobe/outfits.ts).
CREATE POLICY "wardrobe_outfit_items_read_via_outfit"
  ON "wardrobe_outfit_items"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "wardrobe_outfits" wo
      WHERE wo."id" = "wardrobe_outfit_items"."outfit_id"
        AND auth.uid()::text = wo."user_id"
    )
  );

CREATE POLICY "wardrobe_outfit_items_write_via_outfit"
  ON "wardrobe_outfit_items"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "wardrobe_outfits" wo
      WHERE wo."id" = "wardrobe_outfit_items"."outfit_id"
        AND auth.uid()::text = wo."user_id"
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "wardrobe_outfits" wo
      WHERE wo."id" = "wardrobe_outfit_items"."outfit_id"
        AND auth.uid()::text = wo."user_id"
    )
  );
