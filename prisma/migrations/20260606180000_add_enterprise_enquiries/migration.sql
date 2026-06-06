-- ─── Enterprise sales enquiries ──────────────────────────────────────────────
-- Captured from the "Contact team" CTA on the Premier (Enterprise) brand plan
-- card. Persisted so ops can follow up without depending on email plumbing.
-- See prisma/schema.prisma for the column-level documentation.

CREATE TABLE "enterprise_enquiries" (
    "id"         TEXT NOT NULL,
    "user_id"    TEXT,
    "name"       TEXT NOT NULL,
    "email"      TEXT NOT NULL,
    "company"    TEXT NOT NULL,
    "message"    TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_enquiries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "enterprise_enquiries_created_at_idx" ON "enterprise_enquiries"("created_at");
CREATE INDEX "enterprise_enquiries_email_idx" ON "enterprise_enquiries"("email");

-- ─── Row Level Security (defense in depth) ──────────────────────────────────
-- Writes happen via the service-role client (server-side), which bypasses RLS.
-- No anon/auth read policy: enquiries are an internal sales record, never
-- read back from the client. The only authorised reader is ops with direct DB
-- access (or a future admin route that uses the service-role client).
ALTER TABLE "enterprise_enquiries" ENABLE ROW LEVEL SECURITY;
-- INSERT/UPDATE/DELETE/SELECT: service-role only (no policy → no anon/auth access).
