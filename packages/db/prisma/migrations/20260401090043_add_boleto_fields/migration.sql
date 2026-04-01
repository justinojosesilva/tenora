-- AlterTable
ALTER TABLE "billing_charges" ADD COLUMN "boleto_url" TEXT,
ADD COLUMN "asaas_charge_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "billing_charges_asaas_charge_id_key" ON "billing_charges"("asaas_charge_id") WHERE "asaas_charge_id" IS NOT NULL;
