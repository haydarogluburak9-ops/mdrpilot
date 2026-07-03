-- Link operational records to KYS form documents
ALTER TABLE "CAPA" ADD COLUMN "qmsDocumentId" TEXT;
ALTER TABLE "CAPA" ADD COLUMN "referenceNo" TEXT;
CREATE UNIQUE INDEX "CAPA_qmsDocumentId_key" ON "CAPA"("qmsDocumentId");
CREATE INDEX "CAPA_referenceNo_idx" ON "CAPA"("referenceNo");

ALTER TABLE "Complaint" ADD COLUMN "qmsDocumentId" TEXT;
CREATE UNIQUE INDEX "Complaint_qmsDocumentId_key" ON "Complaint"("qmsDocumentId");
