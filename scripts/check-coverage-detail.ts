import { PrismaClient } from "@prisma/client";
import { evaluateIso13485ManualCoverage } from "../src/lib/qms/iso13485-manual-coverage";
import { loadQmsWizardAnswers } from "../src/lib/qms/wizard-context";
import { listCompanyQmsDocs } from "../src/lib/wizards/quality-manual/gap-check";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  if (!company) {
    console.log("No company found");
    return;
  }

  const kysDocs = await listCompanyQmsDocs(company.id);
  const answers = await loadQmsWizardAnswers(company.id);
  const cov = evaluateIso13485ManualCoverage({ answers, kysDocs });

  console.log(`Company: ${company.name}`);
  console.log(`Score: ${cov.percent}/100`);
  console.log("\nMissing clauses:");
  cov.rows
    .filter((r) => r.status === "missing")
    .forEach((r) => console.log(`  ${r.clauseNo} — ${r.titleTr} (SOP: ${r.sopCode ?? "—"})`));

  console.log("\nPartial clauses:");
  cov.rows
    .filter((r) => r.status === "partial")
    .slice(0, 15)
    .forEach((r) => console.log(`  ${r.clauseNo} — sources: ${r.sources.join(", ")}`));

  const critical = ["SOP-ORG", "SOP-DC", "SOP-PC", "SOP-CH", "SOP-CAPA", "SOP-IA", "SOP-ST"];
  console.log("\nCritical SOP status:");
  for (const code of critical) {
    const sop = kysDocs.find((d) => d.code === code);
    const children = kysDocs.filter((d) => d.code?.startsWith("FORM-") || d.code?.startsWith("WI-") || d.code?.startsWith("PLAN-") || d.code?.startsWith("DIA-"));
    const linked = kysDocs.filter(
      (d) =>
        d.code &&
        (d.code.includes(code.replace("SOP-", "")) || ["FORM", "PLAN", "DIA", "WI", "LIST"].some((p) => d.code!.startsWith(p))),
    );
    const childByParent = await prisma.qMSDocument.findMany({
      where: { companyId: company.id, deletedAt: null, parentProcedureCode: code },
      select: { code: true, content: true, status: true },
    });
    const sopContent = sop?.content?.trim().length ?? 0;
    const emptyChildren = childByParent.filter((c) => !c.content?.trim()).length;
    console.log(
      `  ${code}: sop ${sopContent > 80 ? "OK" : "EMPTY"} | children ${childByParent.length} (${emptyChildren} empty) | status ${sop?.status ?? "—"}`,
    );
  }

  const session = await prisma.qualityManualWizardSession.findFirst({
    where: { companyId: company.id, status: { not: "ARCHIVED" } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, status: true, composerDocumentId: true },
  });
  console.log("\nQM Wizard:", session?.status, session?.composerDocumentId ?? "no composer doc");
}

main()
  .finally(() => prisma.$disconnect());
