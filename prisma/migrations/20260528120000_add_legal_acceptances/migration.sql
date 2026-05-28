-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('terms', 'privacy');

-- CreateTable
CREATE TABLE "legal_acceptances" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "document_type" "LegalDocumentType" NOT NULL,
    "document_version" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "legal_acceptances_user_id_idx" ON "legal_acceptances"("user_id");

-- CreateIndex
CREATE INDEX "legal_acceptances_user_id_document_type_idx" ON "legal_acceptances"("user_id", "document_type");

-- AddForeignKey
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Row Level Security (defense in depth) ──────────────────────────────────
-- Writes happen via the service-role client (server-side), which bypasses RLS.
-- Anon/auth Supabase clients may only read their own acceptance rows.
ALTER TABLE "legal_acceptances" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "legalacceptance_read_owner" ON "legal_acceptances";
CREATE POLICY "legalacceptance_read_owner" ON "legal_acceptances"
  FOR SELECT USING (auth.uid()::text = "user_id");
-- INSERT/UPDATE/DELETE: service-role only (no policy → no anon/auth access).
