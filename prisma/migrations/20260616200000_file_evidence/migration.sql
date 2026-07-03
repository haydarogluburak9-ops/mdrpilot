-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('TEST_REPORT', 'IFU', 'LABEL', 'CERTIFICATE', 'RISK_FILE', 'CLINICAL_EVALUATION', 'PMS', 'PMCF', 'GSPR_EVIDENCE', 'TECHNICAL_DRAWING', 'OTHER');

-- CreateEnum
CREATE TYPE "FileAnalysisStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "analysisJson" JSONB,
ADD COLUMN     "analysisStatus" "FileAnalysisStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "analysisSummary" TEXT,
ADD COLUMN     "checksumSha256" TEXT,
ADD COLUMN     "documentKind" "DocumentKind" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "extension" TEXT,
ADD COLUMN     "originalName" TEXT,
ADD COLUMN     "storedName" TEXT,
ADD COLUMN     "textExtract" TEXT,
ADD COLUMN     "uploadedById" TEXT;

-- CreateTable
CREATE TABLE "GSPREvidenceLink" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "gsprItemId" TEXT NOT NULL,
    "uploadedFileId" TEXT NOT NULL,
    "linkedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GSPREvidenceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalFileEvidenceLink" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "technicalFileSectionId" TEXT NOT NULL,
    "uploadedFileId" TEXT NOT NULL,
    "linkedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechnicalFileEvidenceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskEvidenceLink" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "riskItemId" TEXT NOT NULL,
    "uploadedFileId" TEXT NOT NULL,
    "linkedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskEvidenceLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GSPREvidenceLink_companyId_idx" ON "GSPREvidenceLink"("companyId");

-- CreateIndex
CREATE INDEX "GSPREvidenceLink_productId_idx" ON "GSPREvidenceLink"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "GSPREvidenceLink_gsprItemId_uploadedFileId_key" ON "GSPREvidenceLink"("gsprItemId", "uploadedFileId");

-- CreateIndex
CREATE INDEX "TechnicalFileEvidenceLink_companyId_idx" ON "TechnicalFileEvidenceLink"("companyId");

-- CreateIndex
CREATE INDEX "TechnicalFileEvidenceLink_productId_idx" ON "TechnicalFileEvidenceLink"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicalFileEvidenceLink_technicalFileSectionId_uploadedFi_key" ON "TechnicalFileEvidenceLink"("technicalFileSectionId", "uploadedFileId");

-- CreateIndex
CREATE INDEX "RiskEvidenceLink_companyId_idx" ON "RiskEvidenceLink"("companyId");

-- CreateIndex
CREATE INDEX "RiskEvidenceLink_productId_idx" ON "RiskEvidenceLink"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskEvidenceLink_riskItemId_uploadedFileId_key" ON "RiskEvidenceLink"("riskItemId", "uploadedFileId");

-- CreateIndex
CREATE INDEX "UploadedFile_checksumSha256_idx" ON "UploadedFile"("checksumSha256");

-- AddForeignKey
ALTER TABLE "GSPREvidenceLink" ADD CONSTRAINT "GSPREvidenceLink_gsprItemId_fkey" FOREIGN KEY ("gsprItemId") REFERENCES "GSPRItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GSPREvidenceLink" ADD CONSTRAINT "GSPREvidenceLink_uploadedFileId_fkey" FOREIGN KEY ("uploadedFileId") REFERENCES "UploadedFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalFileEvidenceLink" ADD CONSTRAINT "TechnicalFileEvidenceLink_technicalFileSectionId_fkey" FOREIGN KEY ("technicalFileSectionId") REFERENCES "TechnicalFileSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalFileEvidenceLink" ADD CONSTRAINT "TechnicalFileEvidenceLink_uploadedFileId_fkey" FOREIGN KEY ("uploadedFileId") REFERENCES "UploadedFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEvidenceLink" ADD CONSTRAINT "RiskEvidenceLink_riskItemId_fkey" FOREIGN KEY ("riskItemId") REFERENCES "RiskItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEvidenceLink" ADD CONSTRAINT "RiskEvidenceLink_uploadedFileId_fkey" FOREIGN KEY ("uploadedFileId") REFERENCES "UploadedFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
