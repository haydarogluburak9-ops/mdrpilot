-- CreateEnum
CREATE TYPE "DocumentComposerType" AS ENUM ('ISO13485_QUALITY_MANUAL', 'ISO13485_DOCUMENT_CONTROL_PROCEDURE', 'ISO13485_CAPA_PROCEDURE', 'ISO13485_INTERNAL_AUDIT_PROCEDURE', 'ISO13485_MANAGEMENT_REVIEW_PROCEDURE', 'ISO13485_RISK_MANAGEMENT_PROCEDURE', 'MDR_TECHNICAL_FILE_NARRATIVE', 'MDR_DECLARATION_OF_CONFORMITY_DRAFT', 'MDR_GSPR_COMPLIANCE_STATEMENT', 'ISO14971_RISK_MANAGEMENT_PLAN', 'ISO14971_RISK_MANAGEMENT_REPORT', 'PMS_PLAN', 'PMCF_PLAN', 'PMCF_EVALUATION_REPORT', 'CLINICAL_EVALUATION_PLAN', 'CLINICAL_EVALUATION_REPORT_DRAFT', 'IFU_DRAFT', 'LABELING_TEXT_DRAFT', 'SUPPLIER_EVALUATION_PROCEDURE', 'STERILIZATION_CONTROL_PROCEDURE', 'COMPLAINT_HANDLING_PROCEDURE', 'VIGILANCE_PROCEDURE', 'CHANGE_CONTROL_PROCEDURE', 'TRAINING_PROCEDURE');

-- CreateEnum
CREATE TYPE "ComposerStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "ComposerDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT,
    "createdById" TEXT,
    "approvedById" TEXT,
    "title" TEXT NOT NULL,
    "type" "DocumentComposerType" NOT NULL,
    "status" "ComposerStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "contentJson" JSONB,
    "contentMarkdown" TEXT NOT NULL,
    "sourceSnapshotJson" JSONB,
    "aiModel" TEXT,
    "aiConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "missingInformationJson" JSONB,
    "complianceGapsJson" JSONB,
    "consistencyWarningsJson" JSONB,
    "evidenceUsedJson" JSONB,
    "disclaimer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ComposerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComposerDocumentVersion" (
    "id" TEXT NOT NULL,
    "composerDocumentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "contentJson" JSONB,
    "contentMarkdown" TEXT NOT NULL,
    "changeSummary" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComposerDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComposerDocument_companyId_idx" ON "ComposerDocument"("companyId");

-- CreateIndex
CREATE INDEX "ComposerDocument_productId_idx" ON "ComposerDocument"("productId");

-- CreateIndex
CREATE INDEX "ComposerDocumentVersion_composerDocumentId_idx" ON "ComposerDocumentVersion"("composerDocumentId");

-- AddForeignKey
ALTER TABLE "ComposerDocument" ADD CONSTRAINT "ComposerDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComposerDocument" ADD CONSTRAINT "ComposerDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComposerDocumentVersion" ADD CONSTRAINT "ComposerDocumentVersion_composerDocumentId_fkey" FOREIGN KEY ("composerDocumentId") REFERENCES "ComposerDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
