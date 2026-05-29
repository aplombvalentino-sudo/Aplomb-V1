-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused');

-- AlterTable: User billing fields
ALTER TABLE "User" ADD COLUMN "stripe_customer_id" TEXT;
ALTER TABLE "User" ADD COLUMN "client_plan" TEXT NOT NULL DEFAULT 'essential';
CREATE UNIQUE INDEX "User_stripe_customer_id_key" ON "User"("stripe_customer_id");

-- AlterTable: Brand billing field
ALTER TABLE "Brand" ADD COLUMN "stripe_customer_id" TEXT;
CREATE UNIQUE INDEX "Brand_stripe_customer_id_key" ON "Brand"("stripe_customer_id");

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "brand_id" TEXT,
    "stripe_customer_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "stripe_price_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");
CREATE UNIQUE INDEX "subscriptions_brand_id_key" ON "subscriptions"("brand_id");
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");
CREATE INDEX "subscriptions_stripe_customer_id_idx" ON "subscriptions"("stripe_customer_id");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Row Level Security (defense in depth) ──────────────────────────────────
-- Writes happen via the service-role client (webhook), which bypasses RLS.
-- A shopper may read their own subscription; brand members may read theirs.
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
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
-- INSERT/UPDATE/DELETE: service-role only (no policy → no anon/auth access).
