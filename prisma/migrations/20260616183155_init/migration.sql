-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('OWNER', 'QUALITY_MANAGER', 'REGULATORY_AFFAIRS', 'CONSULTANT', 'VIEWER');

-- CreateEnum
CREATE TYPE "DeviceClass" AS ENUM ('CLASS_I', 'CLASS_IS', 'CLASS_IM', 'CLASS_IR', 'CLASS_IIA', 'CLASS_IIB', 'CLASS_III');

-- CreateEnum
CREATE TYPE "SterilizationMethod" AS ENUM ('NON_STERILE', 'EO', 'GAMMA', 'STEAM', 'OTHER');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('MISSING', 'DRAFT', 'IN_REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "GsprApplicability" AS ENUM ('YES', 'NO', 'JUSTIFICATION');

-- CreateEnum
CREATE TYPE "CapaStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('MINOR', 'MAJOR', 'CRITICAL', 'OBSERVATION');

-- CreateEnum
CREATE TYPE "ExportType" AS ENUM ('TECHNICAL_FILE', 'QMS_PACKAGE', 'RISK_FILE', 'GSPR_CHECKLIST', 'AUDIT_PACK');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('WORD', 'PDF', 'EXCEL', 'ZIP');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('QUEUED', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "AiAnalysisType" AS ENUM ('TECHNICAL_FILE', 'GSPR', 'RISK', 'IFU', 'CER', 'PMS', 'QMS', 'AUDIT_READINESS', 'FILE_ANALYSIS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "country" TEXT,
    "address" TEXT,
    "srnNumber" TEXT,
    "notifiedBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "subscriptionId" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMember" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CompanyRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceMonthly" INTEGER NOT NULL DEFAULT 0,
    "maxProducts" INTEGER NOT NULL DEFAULT 3,
    "maxSeats" INTEGER NOT NULL DEFAULT 2,
    "features" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "basicUdiDi" TEXT,
    "udiDi" TEXT,
    "deviceClass" "DeviceClass" NOT NULL DEFAULT 'CLASS_I',
    "intendedPurpose" TEXT,
    "userProfile" TEXT,
    "patientPopulation" TEXT,
    "indications" TEXT,
    "contraindications" TEXT,
    "isSterile" BOOLEAN NOT NULL DEFAULT false,
    "sterilization" "SterilizationMethod" NOT NULL DEFAULT 'NON_STERILE',
    "hasMeasuringFn" BOOLEAN NOT NULL DEFAULT false,
    "containsSoftware" BOOLEAN NOT NULL DEFAULT false,
    "isInvasive" BOOLEAN NOT NULL DEFAULT false,
    "bodyContactDuration" TEXT,
    "materials" TEXT,
    "packagingType" TEXT,
    "shelfLife" TEXT,
    "manufacturingProcess" TEXT,
    "criticalSuppliers" TEXT,
    "appliedStandards" TEXT,
    "complianceScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "companyId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'MISSING',
    "ownerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "changeNote" TEXT,
    "preparedBy" TEXT,
    "approvedBy" TEXT,
    "content" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalFileSection" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "DocStatus" NOT NULL DEFAULT 'MISSING',
    "ownerName" TEXT,
    "content" TEXT,
    "annexRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicalFileSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GSPRItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "gsprNo" TEXT NOT NULL,
    "requirementSummary" TEXT NOT NULL,
    "applicable" "GsprApplicability" NOT NULL DEFAULT 'JUSTIFICATION',
    "justification" TEXT,
    "evidenceDocument" TEXT,
    "standardReference" TEXT,
    "complianceStatement" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'MISSING',
    "aiGapComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GSPRItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "hazard" TEXT NOT NULL,
    "sequenceOfEvents" TEXT,
    "hazardousSituation" TEXT,
    "harm" TEXT,
    "initialSeverity" INTEGER NOT NULL DEFAULT 1,
    "initialProbability" INTEGER NOT NULL DEFAULT 1,
    "initialRiskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "riskControlMeasure" TEXT,
    "residualSeverity" INTEGER NOT NULL DEFAULT 1,
    "residualProbability" INTEGER NOT NULL DEFAULT 1,
    "residualRiskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "benefitRiskJustification" TEXT,
    "verificationOfControl" TEXT,
    "linkedReferences" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalEvaluation" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "plan" TEXT,
    "stateOfTheArt" TEXT,
    "equivalentDevices" TEXT,
    "literatureStrategy" TEXT,
    "clinicalDataSummary" TEXT,
    "benefitRiskConclusion" TEXT,
    "pmsPmcfInputs" TEXT,
    "report" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'MISSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PMSPlan" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "feedbackCollection" TEXT,
    "complaintHandling" TEXT,
    "vigilance" TEXT,
    "literatureMonitoring" TEXT,
    "trendReporting" TEXT,
    "capaConnection" TEXT,
    "report" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'MISSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PMSPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PMCFPlan" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "objective" TEXT,
    "methods" TEXT,
    "dataSources" TEXT,
    "timeline" TEXT,
    "acceptanceCriteria" TEXT,
    "evaluationReport" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'MISSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PMCFPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IFUDocument" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1.0',
    "intendedPurpose" TEXT,
    "indications" TEXT,
    "contraindications" TEXT,
    "warnings" TEXT,
    "precautions" TEXT,
    "instructions" TEXT,
    "storageConditions" TEXT,
    "sterilityInfo" TEXT,
    "disposal" TEXT,
    "symbols" TEXT,
    "manufacturerInfo" TEXT,
    "udi" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IFUDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabelDocument" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT,
    "sterileSymbol" TEXT,
    "lot" TEXT,
    "ref" TEXT,
    "udi" TEXT,
    "expiry" TEXT,
    "manufacturer" TEXT,
    "storageCondition" TEXT,
    "singleUse" BOOLEAN NOT NULL DEFAULT true,
    "caution" TEXT,
    "ifuReference" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabelDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QMSDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT,
    "title" TEXT NOT NULL,
    "standard" TEXT NOT NULL,
    "clauseRefs" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'MISSING',
    "preparedBy" TEXT,
    "approvedBy" TEXT,
    "version" TEXT NOT NULL DEFAULT 'v1.0',
    "publishedAt" TIMESTAMP(3),
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "QMSDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "category" TEXT,
    "aiSummary" TEXT,
    "linkedGsprNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditFinding" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'OBSERVATION',
    "clauseRef" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CAPA" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "title" TEXT NOT NULL,
    "rootCause" TEXT,
    "correction" TEXT,
    "correctiveAction" TEXT,
    "status" "CapaStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3),
    "ownerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CAPA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysis" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "type" "AiAnalysisType" NOT NULL,
    "inputSummary" TEXT,
    "output" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT,
    "type" "ExportType" NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'QUEUED',
    "fileKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "CompanyMember_companyId_idx" ON "CompanyMember"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMember_companyId_userId_key" ON "CompanyMember"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_key_key" ON "SubscriptionPlan"("key");

-- CreateIndex
CREATE INDEX "Product_companyId_idx" ON "Product"("companyId");

-- CreateIndex
CREATE INDEX "Document_productId_idx" ON "Document"("productId");

-- CreateIndex
CREATE INDEX "DocumentVersion_documentId_idx" ON "DocumentVersion"("documentId");

-- CreateIndex
CREATE INDEX "TechnicalFileSection_productId_idx" ON "TechnicalFileSection"("productId");

-- CreateIndex
CREATE INDEX "GSPRItem_productId_idx" ON "GSPRItem"("productId");

-- CreateIndex
CREATE INDEX "RiskItem_productId_idx" ON "RiskItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalEvaluation_productId_key" ON "ClinicalEvaluation"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "PMSPlan_productId_key" ON "PMSPlan"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "PMCFPlan_productId_key" ON "PMCFPlan"("productId");

-- CreateIndex
CREATE INDEX "IFUDocument_productId_idx" ON "IFUDocument"("productId");

-- CreateIndex
CREATE INDEX "LabelDocument_productId_idx" ON "LabelDocument"("productId");

-- CreateIndex
CREATE INDEX "QMSDocument_companyId_idx" ON "QMSDocument"("companyId");

-- CreateIndex
CREATE INDEX "UploadedFile_companyId_idx" ON "UploadedFile"("companyId");

-- CreateIndex
CREATE INDEX "UploadedFile_productId_idx" ON "UploadedFile"("productId");

-- CreateIndex
CREATE INDEX "AuditFinding_productId_idx" ON "AuditFinding"("productId");

-- CreateIndex
CREATE INDEX "CAPA_productId_idx" ON "CAPA"("productId");

-- CreateIndex
CREATE INDEX "AIAnalysis_productId_idx" ON "AIAnalysis"("productId");

-- CreateIndex
CREATE INDEX "ExportJob_companyId_idx" ON "ExportJob"("companyId");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_idx" ON "AuditLog"("companyId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalFileSection" ADD CONSTRAINT "TechnicalFileSection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GSPRItem" ADD CONSTRAINT "GSPRItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskItem" ADD CONSTRAINT "RiskItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEvaluation" ADD CONSTRAINT "ClinicalEvaluation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PMSPlan" ADD CONSTRAINT "PMSPlan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PMCFPlan" ADD CONSTRAINT "PMCFPlan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IFUDocument" ADD CONSTRAINT "IFUDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelDocument" ADD CONSTRAINT "LabelDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QMSDocument" ADD CONSTRAINT "QMSDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CAPA" ADD CONSTRAINT "CAPA_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
