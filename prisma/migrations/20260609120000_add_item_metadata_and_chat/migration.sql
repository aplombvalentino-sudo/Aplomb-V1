-- ─── Wardrobe item metadata expansion + chat ────────────────────────────────
-- Adds the columns the AI outfit assistant needs to reason about wardrobe
-- pieces (specific type beyond category, free-text description, fabric
-- material) plus the chat-message table that holds the user ↔ assistant
-- conversation history. See prisma/schema.prisma for column docs.

-- ── WardrobeItem: new optional metadata fields ──────────────────────────────
-- All nullable so existing rows pre-this-migration stay valid; the
-- CaptureFlow gradually fills them as users add new pieces.
ALTER TABLE "wardrobe_items"
  ADD COLUMN "type"        TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "material"    TEXT;

-- ── WardrobeChatMessage: rolling assistant history per user ─────────────────
CREATE TABLE "wardrobe_chat_messages" (
  "id"                      TEXT NOT NULL,
  "user_id"                 TEXT NOT NULL,
  "role"                    TEXT NOT NULL,
  "content"                 TEXT NOT NULL,
  "recommended_item_ids"    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wardrobe_chat_messages_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "wardrobe_chat_messages"
  ADD CONSTRAINT "wardrobe_chat_messages_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "wardrobe_chat_messages_user_id_created_at_idx"
  ON "wardrobe_chat_messages" ("user_id", "created_at");

-- ── Row Level Security (defense in depth) ──────────────────────────────────
-- Same posture as the rest of the wardrobe surface: writes happen via the
-- service-role client (bypasses RLS); reads through auth.uid() match owner.
ALTER TABLE "wardrobe_chat_messages" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wardrobe_chat_messages_read_owner"
  ON "wardrobe_chat_messages"
  FOR SELECT
  USING (auth.uid()::text = "user_id");

CREATE POLICY "wardrobe_chat_messages_write_owner"
  ON "wardrobe_chat_messages"
  FOR ALL
  USING (auth.uid()::text = "user_id")
  WITH CHECK (auth.uid()::text = "user_id");
