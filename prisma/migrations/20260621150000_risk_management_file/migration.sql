-- CreateTable
CREATE TABLE "RiskManagementFile" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "plan" TEXT,
    "report" TEXT,
    "managementPolicy" TEXT,
    "annexAQuestions" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'MISSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskManagementFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiskManagementFile_productId_key" ON "RiskManagementFile"("productId");
