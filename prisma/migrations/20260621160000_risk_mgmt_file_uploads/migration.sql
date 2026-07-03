-- AlterTable
ALTER TABLE "RiskManagementFile" ADD COLUMN "planUploadedFileId" TEXT;
ALTER TABLE "RiskManagementFile" ADD COLUMN "reportUploadedFileId" TEXT;

-- AddForeignKey
ALTER TABLE "RiskManagementFile" ADD CONSTRAINT "RiskManagementFile_planUploadedFileId_fkey" FOREIGN KEY ("planUploadedFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskManagementFile" ADD CONSTRAINT "RiskManagementFile_reportUploadedFileId_fkey" FOREIGN KEY ("reportUploadedFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
