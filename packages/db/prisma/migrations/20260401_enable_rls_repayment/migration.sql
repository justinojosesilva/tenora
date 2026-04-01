-- Enable RLS on repayments table
ALTER TABLE "repayments" FORCE ROW LEVEL SECURITY;

-- Create RLS policies for repayments
CREATE POLICY tenant_select ON "repayments"
  USING ("tenant_id" = current_tenant_id());

CREATE POLICY tenant_insert ON "repayments"
  WITH CHECK ("tenant_id" = current_tenant_id());

CREATE POLICY tenant_update ON "repayments"
  USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());

CREATE POLICY tenant_delete ON "repayments"
  USING ("tenant_id" = current_tenant_id());
