-- ISO 14971 template fields: sequence, risk no, source, mitigation rows, residual assessment
ALTER TABLE "RiskItem" ADD COLUMN "sequenceNo" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RiskItem" ADD COLUMN "riskNo" TEXT;
ALTER TABLE "RiskItem" ADD COLUMN "riskSource" TEXT;
ALTER TABLE "RiskItem" ADD COLUMN "mitigations" JSONB;
ALTER TABLE "RiskItem" ADD COLUMN "residualAssessment" TEXT;
