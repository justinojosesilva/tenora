-- bank_connections tem RLS habilitado mas sem policies — corrigir com subquery via bank_accounts

CREATE POLICY tenant_select ON "bank_connections"
  USING (
    "bank_account_id" IN (
      SELECT "id" FROM "bank_accounts" WHERE "tenant_id" = current_tenant_id()
    )
  );

CREATE POLICY tenant_insert ON "bank_connections"
  WITH CHECK (
    "bank_account_id" IN (
      SELECT "id" FROM "bank_accounts" WHERE "tenant_id" = current_tenant_id()
    )
  );

CREATE POLICY tenant_update ON "bank_connections"
  USING (
    "bank_account_id" IN (
      SELECT "id" FROM "bank_accounts" WHERE "tenant_id" = current_tenant_id()
    )
  );

CREATE POLICY tenant_delete ON "bank_connections"
  USING (
    "bank_account_id" IN (
      SELECT "id" FROM "bank_accounts" WHERE "tenant_id" = current_tenant_id()
    )
  );
