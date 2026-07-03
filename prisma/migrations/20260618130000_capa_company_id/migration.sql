-- Add companyId to CAPA so company-wide records (no product) are scoped correctly
ALTER TABLE "CAPA" ADD COLUMN "companyId" TEXT;

UPDATE "CAPA" c
SET "companyId" = p."companyId"
FROM "Product" p
WHERE c."productId" = p."id";

DELETE FROM "CAPA" WHERE "companyId" IS NULL;

ALTER TABLE "CAPA" ALTER COLUMN "companyId" SET NOT NULL;

CREATE INDEX "CAPA_companyId_idx" ON "CAPA"("companyId");

ALTER TABLE "CAPA" ADD CONSTRAINT "CAPA_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
