-- AlterTable
ALTER TABLE "ClinicalEvaluation" ADD COLUMN IF NOT EXISTS "literatureDataJson" JSONB;
ALTER TABLE "ClinicalEvaluation" ADD COLUMN IF NOT EXISTS "clinicalStudiesJson" JSONB;
