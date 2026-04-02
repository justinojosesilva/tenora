-- Enable RLS on categories table (already enabled in init_schema, this ensures idempotency)
ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;

-- Create RLS policies for categories (using IF NOT EXISTS to handle duplicate runs)
-- Note: Policies were already created in 20260321012032_init_schema, 
-- but we re-create with IF NOT EXISTS for safety during recovery
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'tenant_select'
  ) THEN
    CREATE POLICY tenant_select ON "categories"
      USING ("tenant_id" = current_tenant_id());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'tenant_insert'
  ) THEN
    CREATE POLICY tenant_insert ON "categories"
      WITH CHECK ("tenant_id" = current_tenant_id());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'tenant_update'
  ) THEN
    CREATE POLICY tenant_update ON "categories"
      USING ("tenant_id" = current_tenant_id())
      WITH CHECK ("tenant_id" = current_tenant_id());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'tenant_delete'
  ) THEN
    CREATE POLICY tenant_delete ON "categories"
      USING ("tenant_id" = current_tenant_id());
  END IF;
END $$;
