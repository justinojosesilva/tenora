-- Add color field to categories table
ALTER TABLE "categories" ADD COLUMN "color" TEXT NOT NULL DEFAULT 'blue';
