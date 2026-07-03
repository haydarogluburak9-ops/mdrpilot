-- AlterEnum
BEGIN;
CREATE TYPE "ExportStatus_new" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
ALTER TABLE "ExportJob" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ExportJob" ALTER COLUMN "status" TYPE "ExportStatus_new" USING ("status"::text::"ExportStatus_new");
ALTER TYPE "ExportStatus" RENAME TO "ExportStatus_old";
ALTER TYPE "ExportStatus_new" RENAME TO "ExportStatus";
DROP TYPE "ExportStatus_old";
ALTER TABLE "ExportJob" ALTER COLUMN "status" SET DEFAULT 'QUEUED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ExportType_new" AS ENUM ('TECHNICAL_FILE_DOCX', 'FULL_MDR_TECHNICAL_FILE_ZIP', 'GSPR_XLSX', 'RISK_XLSX', 'IFU_DOCX', 'LABEL_PDF', 'PMS_PMCF_DOCX', 'QMS_PACKAGE_ZIP', 'AUDIT_READINESS_PDF', 'PRODUCT_DOSSIER_ZIP');
ALTER TABLE "ExportJob" ALTER COLUMN "type" TYPE "ExportType_new" USING ("type"::text::"ExportType_new");
ALTER TYPE "ExportType" RENAME TO "ExportType_old";
ALTER TYPE "ExportType_new" RENAME TO "ExportType";
DROP TYPE "ExportType_old";
COMMIT;

-- AlterTable
ALTER TABLE "ExportJob" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "sizeBytes" INTEGER;

-- CreateIndex
CREATE INDEX "ExportJob_productId_idx" ON "ExportJob"("productId");
