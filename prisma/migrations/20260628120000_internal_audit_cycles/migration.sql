-- CreateTable
CREATE TABLE "InternalAuditCycle" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" "OperationalRecordStatus" NOT NULL DEFAULT 'OPEN',
    "ownerName" TEXT,
    "planQmsDocumentId" TEXT,
    "checklistQmsDocumentId" TEXT,
    "reportQmsDocumentId" TEXT,
    "planContent" TEXT,
    "checklistContent" TEXT,
    "reportContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalAuditCycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InternalAuditCycle_planQmsDocumentId_key" ON "InternalAuditCycle"("planQmsDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "InternalAuditCycle_checklistQmsDocumentId_key" ON "InternalAuditCycle"("checklistQmsDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "InternalAuditCycle_reportQmsDocumentId_key" ON "InternalAuditCycle"("reportQmsDocumentId");

-- CreateIndex
CREATE INDEX "InternalAuditCycle_companyId_idx" ON "InternalAuditCycle"("companyId");

-- CreateIndex
CREATE INDEX "InternalAuditCycle_year_idx" ON "InternalAuditCycle"("year");

-- CreateIndex
CREATE UNIQUE INDEX "InternalAuditCycle_companyId_year_key" ON "InternalAuditCycle"("companyId", "year");

-- AddForeignKey
ALTER TABLE "InternalAuditCycle" ADD CONSTRAINT "InternalAuditCycle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
