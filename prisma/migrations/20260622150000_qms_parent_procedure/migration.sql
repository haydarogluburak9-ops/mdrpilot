-- Link forms, instructions, diagrams etc. to parent ISO 13485 procedure (SOP-*)

ALTER TABLE "QMSDocument" ADD COLUMN "parentProcedureCode" TEXT;

CREATE INDEX "QMSDocument_companyId_parentProcedureCode_idx" ON "QMSDocument"("companyId", "parentProcedureCode");
