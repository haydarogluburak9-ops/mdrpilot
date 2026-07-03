-- CreateEnum
CREATE TYPE "StandardSourceType" AS ENUM ('PUBLIC_REGULATION', 'USER_UPLOADED_LICENSED', 'INTERNAL_PROCEDURE', 'TEMPLATE_SUMMARY');

-- CreateEnum
CREATE TYPE "CitationTargetType" AS ENUM ('COMPOSER_DOCUMENT', 'AI_ANALYSIS', 'AUDIT_FINDING', 'FILE_ANALYSIS');

-- CreateTable
CREATE TABLE "Standard" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT,
    "sourceType" "StandardSourceType" NOT NULL DEFAULT 'TEMPLATE_SUMMARY',
    "jurisdiction" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Standard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandardClause" (
    "id" TEXT NOT NULL,
    "standardId" TEXT NOT NULL,
    "clauseNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keywords" TEXT,
    "applicability" TEXT,
    "documentExpectationsJson" JSONB,
    "evidenceExpectationsJson" JSONB,
    "riskRelevanceJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StandardClause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "standardId" TEXT,
    "uploadedFileId" TEXT,
    "sourceType" "StandardSourceType" NOT NULL DEFAULT 'TEMPLATE_SUMMARY',
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "embeddingJson" JSONB,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AICitation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "targetType" "CitationTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "standardId" TEXT,
    "clauseId" TEXT,
    "uploadedFileId" TEXT,
    "quoteSnippet" TEXT,
    "summary" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AICitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Standard_companyId_idx" ON "Standard"("companyId");

-- CreateIndex
CREATE INDEX "Standard_code_idx" ON "Standard"("code");

-- CreateIndex
CREATE INDEX "StandardClause_standardId_idx" ON "StandardClause"("standardId");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_companyId_idx" ON "KnowledgeChunk"("companyId");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_standardId_idx" ON "KnowledgeChunk"("standardId");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_uploadedFileId_idx" ON "KnowledgeChunk"("uploadedFileId");

-- CreateIndex
CREATE INDEX "AICitation_companyId_idx" ON "AICitation"("companyId");

-- CreateIndex
CREATE INDEX "AICitation_targetType_targetId_idx" ON "AICitation"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "Standard" ADD CONSTRAINT "Standard_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardClause" ADD CONSTRAINT "StandardClause_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "Standard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
