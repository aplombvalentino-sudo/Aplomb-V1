-- ─── AI try-on extension for WardrobeOutfit ─────────────────────────────────
-- Adds the columns that make an outfit a real artefact: the selfie the user
-- uploaded, the AI-generated image of them wearing the selected pieces, the
-- pipeline state, and the provider that produced the image. See
-- prisma/schema.prisma for the column-level documentation.

CREATE TYPE "wardrobe_outfit_generation_status" AS ENUM (
  'none', 'pending', 'generating', 'ready', 'failed'
);

ALTER TABLE "wardrobe_outfits"
  ADD COLUMN "selfie_image_path"     TEXT,
  ADD COLUMN "generated_image_path"  TEXT,
  ADD COLUMN "generation_status"     "wardrobe_outfit_generation_status" NOT NULL DEFAULT 'none',
  ADD COLUMN "generation_error"      TEXT,
  ADD COLUMN "generation_provider"   TEXT,
  ADD COLUMN "generated_at"          TIMESTAMP(3);

-- Index for "show me only outfits with a finished try-on" queries the UI
-- needs once the list view starts grouping rendered vs draft outfits.
CREATE INDEX "wardrobe_outfits_user_status_idx"
  ON "wardrobe_outfits" ("user_id", "generation_status");

-- RLS posture is unchanged — the existing owner-only read/write policies
-- on wardrobe_outfits cover the new columns automatically (they're column
-- additions, not new tables).
