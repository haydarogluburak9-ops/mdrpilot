-- AlterTable
ALTER TABLE "RiskManagementFile" ADD COLUMN "policyUploadedFileId" TEXT;

-- AddForeignKey
ALTER TABLE "RiskManagementFile" ADD CONSTRAINT "RiskManagementFile_policyUploadedFileId_fkey" FOREIGN KEY ("policyUploadedFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
