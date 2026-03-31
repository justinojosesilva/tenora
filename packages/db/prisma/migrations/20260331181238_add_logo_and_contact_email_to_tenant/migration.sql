-- Add logo and contactEmail fields to Tenant
ALTER TABLE "tenants" ADD COLUMN "logo" TEXT;
ALTER TABLE "tenants" ADD COLUMN "contact_email" TEXT;
