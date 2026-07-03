-- KYS document folder layers (01 El Kitabı … 14 Kayıtlar)

CREATE TYPE "QmsDocumentLayer" AS ENUM (
  'MANUAL',
  'PROCEDURE',
  'OTHER',
  'PLAN',
  'DIAGRAM',
  'LIST',
  'SPECIFICATION',
  'JOB_DESCRIPTION',
  'INSTRUCTION',
  'FORM',
  'ASSIGNMENT',
  'RECORD'
);

ALTER TABLE "QMSDocument" ADD COLUMN "layer" "QmsDocumentLayer" NOT NULL DEFAULT 'PROCEDURE';

-- Backfill: SOP-* → PROCEDURE (default); other prefixes set explicitly on next scaffold run.
