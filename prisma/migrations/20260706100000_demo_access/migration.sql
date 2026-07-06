-- CreateTable
CREATE TABLE "DemoAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "trialPlanKey" TEXT NOT NULL DEFAULT 'plus',
    "previousSubscriptionId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemoAccess_userId_idx" ON "DemoAccess"("userId");

-- CreateIndex
CREATE INDEX "DemoAccess_companyId_idx" ON "DemoAccess"("companyId");

-- CreateIndex
CREATE INDEX "DemoAccess_expiresAt_idx" ON "DemoAccess"("expiresAt");

-- AddForeignKey
ALTER TABLE "DemoAccess" ADD CONSTRAINT "DemoAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoAccess" ADD CONSTRAINT "DemoAccess_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
