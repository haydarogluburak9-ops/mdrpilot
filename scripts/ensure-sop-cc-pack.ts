/**
 * Create SOP-CC child documents and fill with rule-based templates.
 * Usage: npx tsx scripts/ensure-sop-cc-pack.ts [companyNameSubstring]
 */
import { PrismaClient } from "@prisma/client";
import { getRuleBasedChildContent } from "../src/lib/qms/rule-based-child-content";
import { buildSopCcProcedure } from "../src/lib/qms/procedure-templates";
import { getStructureChildrenForProcedure } from "../src/lib/qms/procedure-packs/registry";
import { inferQmsLayerFromCode } from "../src/lib/qms/kys-structure";

const prisma = new PrismaClient();
const locale = "tr" as const;
const PROCEDURE = "SOP-CC";

async function main() {
  const filter = process.argv[2] ?? "Yılmaz";
  const company = await prisma.company.findFirst({
    where: { name: { contains: filter } },
    select: { id: true, name: true },
  });
  if (!company) throw new Error(`Company not found: ${filter}`);

  const parent = await prisma.qMSDocument.findFirst({
    where: { companyId: company.id, code: PROCEDURE, deletedAt: null, layer: "PROCEDURE" },
    select: { standard: true, clauseRefs: true },
  });
  if (!parent) throw new Error(`${PROCEDURE} not found for ${company.name}`);

  const existing = await prisma.qMSDocument.findMany({
    where: { companyId: company.id, deletedAt: null },
    select: { code: true },
  });
  const codes = new Set(existing.map((d) => d.code?.trim().toUpperCase()).filter(Boolean));

  const children = getStructureChildrenForProcedure(PROCEDURE);
  const created: string[] = [];

  for (const child of children) {
    const code = child.code.trim().toUpperCase();
    if (codes.has(code)) continue;

    await prisma.qMSDocument.create({
      data: {
        companyId: company.id,
        code: child.code,
        title: child.title,
        standard: parent.standard,
        layer: child.layer ?? inferQmsLayerFromCode(child.code),
        parentProcedureCode: child.parentProcedureCode ?? PROCEDURE,
        clauseRefs: child.clauseRefs ?? parent.clauseRefs,
        status: "MISSING",
        version: "00",
        revisionNo: 0,
      },
    });
    created.push(child.code);
    codes.add(code);
  }

  console.log(`Created: ${created.length ? created.join(", ") : "(none — already existed)"}`);

  let filled = 0;
  for (const child of children) {
    const doc = await prisma.qMSDocument.findFirst({
      where: { companyId: company.id, code: child.code, deletedAt: null },
      select: { id: true },
    });
    if (!doc) continue;

    const content =
      getRuleBasedChildContent({
        code: child.code,
        title: child.title,
        layer: child.layer,
        locale,
        parentProcedureCode: child.parentProcedureCode,
        clauseRefs: child.clauseRefs,
      }) ?? "";

    if (!content.trim()) continue;

    await prisma.qMSDocument.update({
      where: { id: doc.id },
      data: { content, status: "DRAFT" },
    });
    filled++;
    console.log(`  ✓ ${child.code}`);
  }

  const sop = await prisma.qMSDocument.findFirst({
    where: { companyId: company.id, code: PROCEDURE, deletedAt: null },
    select: { id: true },
  });
  if (sop) {
    await prisma.qMSDocument.update({
      where: { id: sop.id },
      data: { content: buildSopCcProcedure(locale) },
    });
    console.log(`Updated ${PROCEDURE} procedure text`);
  }

  console.log(`\nDone for ${company.name}: ${children.length} children, ${filled} filled.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
