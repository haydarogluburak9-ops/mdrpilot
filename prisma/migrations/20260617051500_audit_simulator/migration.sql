-- CreateEnum
CREATE TYPE "AuditStandardScope" AS ENUM ('MDR', 'ISO_13485', 'ISO_9001', 'ISO_14971', 'COMBINED');

-- CreateEnum
CREATE TYPE "AuditAssessmentType" AS ENUM ('QUICK', 'STANDARD', 'FULL');

-- CreateEnum
CREATE TYPE "AuditSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AuditFindingSeverity" AS ENUM ('MAJOR', 'MINOR', 'OBSERVATION', 'POSITIVE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExportType" ADD VALUE 'AUDIT_SIM_REPORT_PDF';
ALTER TYPE "ExportType" ADD VALUE 'AUDIT_SIM_REPORT_DOCX';
ALTER TYPE "ExportType" ADD VALUE 'AUDIT_SIM_FINDINGS_XLSX';
ALTER TYPE "ExportType" ADD VALUE 'AUDIT_SIM_CAPA_XLSX';

-- CreateTable
CREATE TABLE "AuditSession" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT,
    "createdById" TEXT,
    "standard" "AuditStandardScope" NOT NULL DEFAULT 'ISO_13485',
    "assessmentType" "AuditAssessmentType" NOT NULL DEFAULT 'STANDARD',
    "status" "AuditSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" INTEGER,
    "summaryJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AuditSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditQuestion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "standardCode" TEXT NOT NULL,
    "clauseNo" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "expectedEvidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerText" TEXT NOT NULL,
    "evidenceFileIdsJson" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditSimFinding" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "standardCode" TEXT NOT NULL,
    "clauseNo" TEXT NOT NULL,
    "severity" "AuditFindingSeverity" NOT NULL DEFAULT 'MINOR',
    "description" TEXT NOT NULL,
    "evidence" TEXT,
    "rootCause" TEXT,
    "correctiveAction" TEXT,
    "dueDateSuggestion" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditSimFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditSession_companyId_idx" ON "AuditSession"("companyId");

-- CreateIndex
CREATE INDEX "AuditQuestion_sessionId_idx" ON "AuditQuestion"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditAnswer_questionId_key" ON "AuditAnswer"("questionId");

-- CreateIndex
CREATE INDEX "AuditAnswer_sessionId_idx" ON "AuditAnswer"("sessionId");

-- CreateIndex
CREATE INDEX "AuditSimFinding_sessionId_idx" ON "AuditSimFinding"("sessionId");

-- CreateIndex
CREATE INDEX "AuditSimFinding_companyId_idx" ON "AuditSimFinding"("companyId");

-- AddForeignKey
ALTER TABLE "AuditSession" ADD CONSTRAINT "AuditSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditQuestion" ADD CONSTRAINT "AuditQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AuditSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditAnswer" ADD CONSTRAINT "AuditAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AuditSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditAnswer" ADD CONSTRAINT "AuditAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AuditQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditSimFinding" ADD CONSTRAINT "AuditSimFinding_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AuditSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
