-- Enable RLS on categories table
ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;

-- Create RLS policies for categories
CREATE POLICY tenant_select ON "categories"
  USING ("tenant_id" = current_tenant_id());

CREATE POLICY tenant_insert ON "categories"
  WITH CHECK ("tenant_id" = current_tenant_id());

CREATE POLICY tenant_update ON "categories"
  USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());

CREATE POLICY tenant_delete ON "categories"
  USING ("tenant_id" = current_tenant_id());
