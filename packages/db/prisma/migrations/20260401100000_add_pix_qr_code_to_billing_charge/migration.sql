-- Add QR code image field to billing_charges for PIX payments
ALTER TABLE "billing_charges" ADD COLUMN "qr_code_image" TEXT;
