-- AlterEnum
ALTER TYPE "ExportType" ADD VALUE 'DEMO_EXECUTIVE_REPORT_PDF';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "profileJson" JSONB;
