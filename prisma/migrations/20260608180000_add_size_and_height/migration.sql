-- ─── Size + height extension ─────────────────────────────────────────────
-- The wardrobe-driven try-on needs the SIZE of each picked piece and the
-- USER'S HEIGHT to be useful — without those two, "trying on the M" looks
-- identical to "trying on the XXL". This migration adds the columns that
-- carry both, plus snapshot copies on the outfit + outfit-item so a
-- re-render of an old outfit uses historical values not current ones.
-- See prisma/schema.prisma for column-level documentation.

-- User: optional self-reported height. UI prompts on first try-on if null.
ALTER TABLE "User"
  ADD COLUMN "height_cm" INTEGER;

-- WardrobeItem: the size THIS user owns the piece in. Nullable so existing
-- rows (pre-this-column) stay valid; new uploads require it via the form.
ALTER TABLE "wardrobe_items"
  ADD COLUMN "size" TEXT;

-- WardrobeOutfit: snapshot of user's height at generation time.
ALTER TABLE "wardrobe_outfits"
  ADD COLUMN "user_height_cm" INTEGER;

-- WardrobeOutfitItem: snapshot of the item's size at outfit-build time.
ALTER TABLE "wardrobe_outfit_items"
  ADD COLUMN "size" TEXT;

-- No new indexes — these columns are read alongside their parent rows by id.
-- RLS is unchanged: column additions are covered by the existing
-- owner-only policies on the parent tables.
