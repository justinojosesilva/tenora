/*
  Warnings:

  - A unique constraint covering the columns `[asaas_charge_id]` on the table `billing_charges` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum (idempotent: production may already have this from a partially-applied removed migration)
DO $$ BEGIN
  CREATE TYPE "RepaymentStatus" AS ENUM ('pending', 'paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum (idempotent: ADD VALUE IF NOT EXISTS)
ALTER TYPE "BillingStatus" ADD VALUE IF NOT EXISTS 'refunded';

-- AlterTable (idempotent: column may already exist in production)
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "color" TEXT NOT NULL DEFAULT 'blue';

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "repayments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "period" TEXT NOT NULL,
    "status" "RepaymentStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repayments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "repayments_tenant_id_idx" ON "repayments"("tenant_id");

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "repayments_owner_id_idx" ON "repayments"("owner_id");

-- Replace partial unique index (from add_boleto_fields) with non-partial to match @unique in schema
DROP INDEX IF EXISTS "billing_charges_asaas_charge_id_key";
CREATE UNIQUE INDEX "billing_charges_asaas_charge_id_key" ON "billing_charges"("asaas_charge_id");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  ALTER TABLE "repayments" ADD CONSTRAINT "repayments_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "repayments" ADD CONSTRAINT "repayments_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
