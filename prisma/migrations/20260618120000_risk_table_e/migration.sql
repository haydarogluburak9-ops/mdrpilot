-- Tablo E.1 / E.2 plan rows + FMEA cross-reference
ALTER TABLE "RiskItem" ADD COLUMN IF NOT EXISTS "tableERef" TEXT;
ALTER TABLE "RiskManagementFile" ADD COLUMN IF NOT EXISTS "planTableE1Rows" JSONB;
ALTER TABLE "RiskManagementFile" ADD COLUMN IF NOT EXISTS "planTableE2Rows" JSONB;
