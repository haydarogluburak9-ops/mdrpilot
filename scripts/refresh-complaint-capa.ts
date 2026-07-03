import { PrismaClient } from "@prisma/client";
import { buildFormCh01, buildFormCh02 } from "../src/lib/qms/form-templates";
import { getSampleRecordContent } from "../src/lib/qms/sample-record-templates";
import { inferQmsLayerFromCode } from "../src/lib/qms/kys-structure";

const prisma = new PrismaClient();

async function main() {
  const filter = process.argv[2] ?? "Yılmaz";
  const company = await prisma.company.findFirst({
    where: { name: { contains: filter } },
    select: { id: true, name: true },
  });
  if (!company) throw new Error("Company not found");

  const parent = await prisma.qMSDocument.findFirst({
    where: { companyId: company.id, code: "SOP-CH", deletedAt: null, layer: "PROCEDURE" },
    select: { standard: true, clauseRefs: true },
  });
  if (!parent) throw new Error("SOP-CH not found");

  const toCreate = [
    { code: "FORM-CH-02", title: "Complaint–CAPA Linkage Form (when CAPA required)", clauseRefs: "8.2.2 / 8.5.2" },
    { code: "REC-CH-02", title: "Sample Complaint–CAPA Linkage Record", clauseRefs: "8.2.2 / 8.5.2" },
  ];

  for (const item of toCreate) {
    const exists = await prisma.qMSDocument.findFirst({
      where: { companyId: company.id, code: item.code, deletedAt: null },
    });
    if (!exists) {
      await prisma.qMSDocument.create({
        data: {
          companyId: company.id,
          code: item.code,
          title: item.title,
          standard: parent.standard,
          layer: inferQmsLayerFromCode(item.code),
          parentProcedureCode: "SOP-CH",
          clauseRefs: item.clauseRefs,
          status: "MISSING",
          version: "00",
          revisionNo: 0,
        },
      });
      console.log("Created", item.code);
    }
  }

  const updates: Array<{ code: string; content: string }> = [
    { code: "FORM-CH-01", content: buildFormCh01("tr") },
    { code: "FORM-CH-02", content: buildFormCh02("tr") },
    { code: "REC-CH-01", content: getSampleRecordContent("REC-CH-01", company.name, "tr") ?? "" },
    { code: "REC-CH-02", content: getSampleRecordContent("REC-CH-02", company.name, "tr") ?? "" },
  ];

  for (const { code, content } of updates) {
    if (!content.trim()) continue;
    const doc = await prisma.qMSDocument.findFirst({
      where: { companyId: company.id, code, deletedAt: null },
    });
    if (doc) {
      await prisma.qMSDocument.update({
        where: { id: doc.id },
        data: { content, status: "DRAFT" },
      });
      console.log("Updated", code);
    }
  }
}

main().finally(() => prisma.$disconnect());
