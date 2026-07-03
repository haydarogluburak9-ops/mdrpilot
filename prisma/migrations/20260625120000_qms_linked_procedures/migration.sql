-- Additional SOP codes where a child document also appears (shared forms/WI across procedures).
ALTER TABLE "QMSDocument" ADD COLUMN "linkedProcedureCodesJson" JSONB;
