-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('active', 'suspended', 'cancelled');

-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('starter', 'pro', 'scale');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'financeiro', 'operacional', 'visualizador');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('residential', 'commercial', 'mixed');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('available', 'rented', 'maintenance');

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('active', 'ended', 'renewing', 'overdue');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('credit', 'debit');

-- CreateEnum
CREATE TYPE "TransactionOrigin" AS ENUM ('bank_sync', 'manual', 'import');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'categorized', 'reviewed');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('pending', 'paid', 'overdue', 'cancelled');

-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('pix', 'boleto', 'transfer');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('requested', 'approved', 'in_progress', 'done');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "slug" TEXT NOT NULL,
    "plan" "TenantPlan" NOT NULL DEFAULT 'starter',
    "status" "TenantStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "clerk_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'visualizador',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owners" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf_cnpj" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "code" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "zip_code" TEXT,
    "type" "PropertyType" NOT NULL,
    "area" DECIMAL(8,2),
    "status" "PropertyStatus" NOT NULL DEFAULT 'available',
    "admin_fee_pct" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "rent_amount" DECIMAL(14,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "tenant_name" TEXT NOT NULL,
    "tenant_cpf" TEXT,
    "tenant_email" TEXT,
    "tenant_phone" TEXT,
    "rent_amount" DECIMAL(14,2) NOT NULL,
    "admin_fee_pct" DECIMAL(5,2) NOT NULL,
    "readjust_index" TEXT NOT NULL DEFAULT 'IGPM',
    "due_day_of_month" INTEGER NOT NULL DEFAULT 5,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "LeaseStatus" NOT NULL DEFAULT 'active',
    "signed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bank_code" TEXT NOT NULL,
    "agency" TEXT,
    "account_number" TEXT,
    "account_type" TEXT NOT NULL DEFAULT 'checking',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_connections" (
    "id" TEXT NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "pluggy_item_id" TEXT NOT NULL,
    "pluggy_account_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "group" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "bank_account_id" TEXT,
    "lease_id" TEXT,
    "category_id" TEXT,
    "pluggy_transaction_id" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "origin" "TransactionOrigin" NOT NULL DEFAULT 'manual',
    "status" "TransactionStatus" NOT NULL DEFAULT 'pending',
    "date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_splits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "party" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_charges" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "lease_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "paid_amount" DECIMAL(14,2),
    "status" "BillingStatus" NOT NULL DEFAULT 'pending',
    "type" "BillingType" NOT NULL DEFAULT 'pix',
    "pix_code" TEXT,
    "boleto_code" TEXT,
    "reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'requested',
    "cost" DECIMAL(14,2),
    "supplier" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_cnpj_key" ON "tenants"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_id_key" ON "users"("clerk_id");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "users_clerk_id_idx" ON "users"("clerk_id");

-- CreateIndex
CREATE INDEX "owners_tenant_id_idx" ON "owners"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "owner_accounts_owner_id_key" ON "owner_accounts"("owner_id");

-- CreateIndex
CREATE INDEX "owner_accounts_tenant_id_idx" ON "owner_accounts"("tenant_id");

-- CreateIndex
CREATE INDEX "properties_tenant_id_idx" ON "properties"("tenant_id");

-- CreateIndex
CREATE INDEX "properties_owner_id_idx" ON "properties"("owner_id");

-- CreateIndex
CREATE INDEX "leases_tenant_id_idx" ON "leases"("tenant_id");

-- CreateIndex
CREATE INDEX "leases_property_id_idx" ON "leases"("property_id");

-- CreateIndex
CREATE INDEX "bank_accounts_tenant_id_idx" ON "bank_accounts"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_connections_bank_account_id_key" ON "bank_connections"("bank_account_id");

-- CreateIndex
CREATE INDEX "categories_tenant_id_idx" ON "categories"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_pluggy_transaction_id_key" ON "transactions"("pluggy_transaction_id");

-- CreateIndex
CREATE INDEX "transactions_tenant_id_idx" ON "transactions"("tenant_id");

-- CreateIndex
CREATE INDEX "transactions_lease_id_idx" ON "transactions"("lease_id");

-- CreateIndex
CREATE INDEX "transactions_pluggy_transaction_id_idx" ON "transactions"("pluggy_transaction_id");

-- CreateIndex
CREATE INDEX "transaction_splits_tenant_id_idx" ON "transaction_splits"("tenant_id");

-- CreateIndex
CREATE INDEX "transaction_splits_transaction_id_idx" ON "transaction_splits"("transaction_id");

-- CreateIndex
CREATE INDEX "billing_charges_tenant_id_idx" ON "billing_charges"("tenant_id");

-- CreateIndex
CREATE INDEX "billing_charges_lease_id_idx" ON "billing_charges"("lease_id");

-- CreateIndex
CREATE INDEX "billing_charges_due_date_idx" ON "billing_charges"("due_date");

-- CreateIndex
CREATE INDEX "maintenance_orders_tenant_id_idx" ON "maintenance_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "maintenance_orders_property_id_idx" ON "maintenance_orders"("property_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owners" ADD CONSTRAINT "owners_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_accounts" ADD CONSTRAINT "owner_accounts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_charges" ADD CONSTRAINT "billing_charges_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_charges" ADD CONSTRAINT "billing_charges_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Função helper com cast explícito uuid
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '');
$$ LANGUAGE sql STABLE;

-- Habilita RLS nas tabelas
ALTER TABLE "users"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "properties"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "owners"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "owner_accounts"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leases"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_accounts"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_connections"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transaction_splits"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "billing_charges"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_orders"  ENABLE ROW LEVEL SECURITY;

-- Policies usando a função helper (já retorna uuid — sem erro de tipo)
CREATE POLICY tenant_select ON "users"
  FOR SELECT USING ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_insert ON "users"
  FOR INSERT WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_update ON "users"
  FOR UPDATE USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_delete ON "users"
  FOR DELETE USING ("tenant_id" = current_tenant_id());

CREATE POLICY tenant_select ON "properties"
  FOR SELECT USING ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_insert ON "properties"
  FOR INSERT WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_update ON "properties"
  FOR UPDATE USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_delete ON "properties"
  FOR DELETE USING ("tenant_id" = current_tenant_id());

CREATE POLICY tenant_select ON "owners"
  FOR SELECT USING ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_insert ON "owners"
  FOR INSERT WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_update ON "owners"
  FOR UPDATE USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_delete ON "owners"
  FOR DELETE USING ("tenant_id" = current_tenant_id());

CREATE POLICY tenant_select ON "owner_accounts"
  FOR SELECT USING ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_insert ON "owner_accounts"
  FOR INSERT WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_update ON "owner_accounts"
  FOR UPDATE USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_delete ON "owner_accounts"
  FOR DELETE USING ("tenant_id" = current_tenant_id());

CREATE POLICY tenant_select ON "leases"
  FOR SELECT USING ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_insert ON "leases"
  FOR INSERT WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_update ON "leases"
  FOR UPDATE USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_delete ON "leases"
  FOR DELETE USING ("tenant_id" = current_tenant_id());

CREATE POLICY tenant_select ON "bank_accounts"
  FOR SELECT USING ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_insert ON "bank_accounts"
  FOR INSERT WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_update ON "bank_accounts"
  FOR UPDATE USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_delete ON "bank_accounts"
  FOR DELETE USING ("tenant_id" = current_tenant_id());

CREATE POLICY tenant_select ON "categories"
  FOR SELECT USING ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_insert ON "categories"
  FOR INSERT WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_update ON "categories"
  FOR UPDATE USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_delete ON "categories"
  FOR DELETE USING ("tenant_id" = current_tenant_id());

CREATE POLICY tenant_select ON "transactions"
  FOR SELECT USING ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_insert ON "transactions"
  FOR INSERT WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_update ON "transactions"
  FOR UPDATE USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_delete ON "transactions"
  FOR DELETE USING ("tenant_id" = current_tenant_id());

CREATE POLICY tenant_select ON "transaction_splits"
  FOR SELECT USING ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_insert ON "transaction_splits"
  FOR INSERT WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_update ON "transaction_splits"
  FOR UPDATE USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_delete ON "transaction_splits"
  FOR DELETE USING ("tenant_id" = current_tenant_id());

CREATE POLICY tenant_select ON "billing_charges"
  FOR SELECT USING ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_insert ON "billing_charges"
  FOR INSERT WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_update ON "billing_charges"
  FOR UPDATE USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_delete ON "billing_charges"
  FOR DELETE USING ("tenant_id" = current_tenant_id());

CREATE POLICY tenant_select ON "maintenance_orders"
  FOR SELECT USING ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_insert ON "maintenance_orders"
  FOR INSERT WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_update ON "maintenance_orders"
  FOR UPDATE USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
CREATE POLICY tenant_delete ON "maintenance_orders"
  FOR DELETE USING ("tenant_id" = current_tenant_id());