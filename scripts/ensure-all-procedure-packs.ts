/**
 * Create missing child documents for ALL procedures and fill templates.
 * Usage: npx tsx scripts/ensure-all-procedure-packs.ts [companyNameSubstring]
 */
import { PrismaClient } from "@prisma/client";
import { ISO13485_DOCS } from "../src/lib/domain/constants";
import { inferQmsLayerFromCode } from "../src/lib/qms/kys-structure";
import { getRuleBasedChildContent } from "../src/lib/qms/rule-based-child-content";
import { getSampleRecordContent } from "../src/lib/qms/sample-record-templates";
import { getStructureChildrenForProcedure } from "../src/lib/qms/procedure-packs/registry";

const prisma = new PrismaClient();
const locale = "tr" as const;

function childContent(
  child: {
    code: string;
    title: string;
    layer: string;
    parentProcedureCode?: string;
    clauseRefs?: string;
  },
  companyName: string,
): string {
  const sample = getSampleRecordContent(child.code, companyName, locale);
  if (sample) return sample;

  return (
    getRuleBasedChildContent({
      code: child.code,
      title: child.title,
      layer: child.layer,
      locale,
      parentProcedureCode: child.parentProcedureCode,
      clauseRefs: child.clauseRefs,
    }) ?? ""
  );
}

async function main() {
  const filter = process.argv[2] ?? "Yılmaz";
  const company = await prisma.company.findFirst({
    where: { name: { contains: filter } },
    select: { id: true, name: true },
  });
  if (!company) throw new Error(`Company not found: ${filter}`);

  const existing = await prisma.qMSDocument.findMany({
    where: { companyId: company.id, deletedAt: null },
    select: { code: true },
  });
  const codes = new Set(existing.map((d) => d.code?.trim().toUpperCase()).filter(Boolean));

  let created = 0;
  let filled = 0;
  let skipped = 0;

  console.log(`\n=== Ensuring procedure packs for ${company.name} ===\n`);

  for (const { code: sopCode } of ISO13485_DOCS) {
    const parent = await prisma.qMSDocument.findFirst({
      where: { companyId: company.id, code: sopCode, deletedAt: null, layer: "PROCEDURE" },
      select: { standard: true, clauseRefs: true },
    });
    if (!parent) {
      console.log(`${sopCode}: SKIP (procedure not in DB)`);
      continue;
    }

    const children = getStructureChildrenForProcedure(sopCode);
    if (children.length === 0) {
      console.log(`${sopCode}: no template children`);
      continue;
    }

    const createdHere: string[] = [];

    for (const child of children) {
      const c = child.code.trim().toUpperCase();
      if (!codes.has(c)) {
        await prisma.qMSDocument.create({
          data: {
            companyId: company.id,
            code: child.code,
            title: child.title,
            standard: parent.standard,
            layer: child.layer ?? inferQmsLayerFromCode(child.code),
            parentProcedureCode: child.parentProcedureCode ?? sopCode,
            clauseRefs: child.clauseRefs ?? parent.clauseRefs,
            status: "MISSING",
            version: "00",
            revisionNo: 0,
          },
        });
        codes.add(c);
        created++;
        createdHere.push(child.code);
      }

      const doc = await prisma.qMSDocument.findFirst({
        where: { companyId: company.id, code: child.code, deletedAt: null },
        select: { id: true, content: true },
      });
      if (!doc) continue;

      const content = childContent(child, company.name).trim();
      if (!content) continue;

      const needsFill = !doc.content?.trim() || doc.content.includes("Örnek Şirket");
      if (!needsFill && !createdHere.includes(child.code)) {
        skipped++;
        continue;
      }

      await prisma.qMSDocument.update({
        where: { id: doc.id },
        data: { content, status: doc.content?.trim() ? "DRAFT" : "DRAFT" },
      });
      filled++;
    }

    console.log(
      `${sopCode}: ${children.length} children — created: ${createdHere.length || 0}`,
    );
  }

  console.log(`\nDone. Created ${created} docs, filled/updated ${filled}, skipped ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
