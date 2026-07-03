-- CreateEnum
CREATE TYPE "OperationalRecordStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED', 'OVERDUE', 'MONITORING');

-- CreateEnum
CREATE TYPE "OperationalModuleKind" AS ENUM ('INTERNAL_AUDIT', 'NCP', 'FSCA', 'VIGILANCE', 'CHANGE_CONTROL', 'MANAGEMENT_REVIEW', 'TRAINING', 'SUPPLIER_EVAL');

-- CreateTable
CREATE TABLE "QmsOperationalRecord" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "module" "OperationalModuleKind" NOT NULL,
    "formCode" TEXT NOT NULL,
    "referenceNo" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "formContent" TEXT,
    "qmsDocumentId" TEXT,
    "status" "OperationalRecordStatus" NOT NULL DEFAULT 'OPEN',
    "productId" TEXT,
    "ownerName" TEXT,
    "dueDate" TIMESTAMP(3),
    "capaRef" TEXT,
    "eventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QmsOperationalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QmsOperationalRecord_qmsDocumentId_key" ON "QmsOperationalRecord"("qmsDocumentId");

-- CreateIndex
CREATE INDEX "QmsOperationalRecord_companyId_module_idx" ON "QmsOperationalRecord"("companyId", "module");

-- CreateIndex
CREATE INDEX "QmsOperationalRecord_productId_idx" ON "QmsOperationalRecord"("productId");

-- CreateIndex
CREATE INDEX "QmsOperationalRecord_referenceNo_idx" ON "QmsOperationalRecord"("referenceNo");

-- CreateIndex
CREATE INDEX "QmsOperationalRecord_status_idx" ON "QmsOperationalRecord"("status");

-- AddForeignKey
ALTER TABLE "QmsOperationalRecord" ADD CONSTRAINT "QmsOperationalRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QmsOperationalRecord" ADD CONSTRAINT "QmsOperationalRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
