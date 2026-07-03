-- QMS document revision tracking (align with technical file sections)
ALTER TABLE "QMSDocument" ADD COLUMN IF NOT EXISTS "revisionNo" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "QMSDocument" ADD COLUMN IF NOT EXISTS "issueDate" TIMESTAMP(3);
ALTER TABLE "QMSDocument" ADD COLUMN IF NOT EXISTS "revisionDate" TIMESTAMP(3);
ALTER TABLE "QMSDocument" ADD COLUMN IF NOT EXISTS "revisionHistoryJson" JSONB;

-- Normalize legacy version labels to REV00-style revision numbers
UPDATE "QMSDocument"
SET
  "revisionNo" = CASE
    WHEN "version" ~* '^REV[[:space:]]*([0-9]+)$' THEN CAST(substring("version" from '([0-9]+)$') AS INTEGER)
    WHEN "version" ~* '^v?([0-9]+)' THEN GREATEST(0, CAST(substring("version" from '([0-9]+)') AS INTEGER) - 1)
    ELSE 0
  END,
  "version" = 'REV00'
WHERE "version" IS NULL OR "version" = 'v1.0' OR "version" !~* '^REV';

UPDATE "QMSDocument"
SET "version" = 'REV' || LPAD(CAST("revisionNo" AS TEXT), 2, '0')
WHERE "version" !~* '^REV';

UPDATE "QMSDocument"
SET "issueDate" = "publishedAt"
WHERE "issueDate" IS NULL AND "publishedAt" IS NOT NULL AND "status" = 'APPROVED';

UPDATE "QMSDocument"
SET "revisionDate" = COALESCE("publishedAt", "updatedAt")
WHERE "revisionDate" IS NULL AND "status" IN ('APPROVED', 'IN_REVIEW', 'DRAFT');
