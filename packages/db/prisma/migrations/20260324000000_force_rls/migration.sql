-- Force RLS on all tenant-scoped tables so even the table owner is subject to policies.
-- This is required because tenora_app owns the tables (created them via migrations)
-- but must still be restricted to its tenant's data.

ALTER TABLE "users"              FORCE ROW LEVEL SECURITY;
ALTER TABLE "owners"             FORCE ROW LEVEL SECURITY;
ALTER TABLE "owner_accounts"     FORCE ROW LEVEL SECURITY;
ALTER TABLE "properties"         FORCE ROW LEVEL SECURITY;
ALTER TABLE "leases"             FORCE ROW LEVEL SECURITY;
ALTER TABLE "billing_charges"    FORCE ROW LEVEL SECURITY;
ALTER TABLE "transaction_splits" FORCE ROW LEVEL SECURITY;
ALTER TABLE "bank_accounts"      FORCE ROW LEVEL SECURITY;
ALTER TABLE "bank_connections"   FORCE ROW LEVEL SECURITY;
ALTER TABLE "transactions"       FORCE ROW LEVEL SECURITY;
ALTER TABLE "categories"         FORCE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_orders" FORCE ROW LEVEL SECURITY;
