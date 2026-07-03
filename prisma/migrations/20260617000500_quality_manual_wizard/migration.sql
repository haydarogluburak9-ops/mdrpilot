-- CreateEnum
CREATE TYPE "QualityManualWizardStatus" AS ENUM ('DRAFT', 'GAP_CHECKED', 'GENERATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QualityManualStandardMode" AS ENUM ('ISO_9001', 'ISO_13485', 'BOTH');

-- AlterEnum
ALTER TYPE "DocumentComposerType" ADD VALUE 'ISO9001_QUALITY_MANUAL';

-- CreateTable
CREATE TABLE "QualityManualWizardSession" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,
    "composerDocumentId" TEXT,
    "status" "QualityManualWizardStatus" NOT NULL DEFAULT 'DRAFT',
    "standardMode" "QualityManualStandardMode" NOT NULL DEFAULT 'ISO_13485',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "answersJson" JSONB,
    "gapCheckJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3),

    CONSTRAINT "QualityManualWizardSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QualityManualWizardSession_companyId_idx" ON "QualityManualWizardSession"("companyId");

-- AddForeignKey
ALTER TABLE "QualityManualWizardSession" ADD CONSTRAINT "QualityManualWizardSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
