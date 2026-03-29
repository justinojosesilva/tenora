-- AlterTable
ALTER TABLE "tenants" ADD COLUMN "onboarding_completed_at" TIMESTAMP(3);
ALTER TABLE "tenants" ADD COLUMN "onboarding_skipped_steps" TEXT[] NOT NULL DEFAULT '{}';
