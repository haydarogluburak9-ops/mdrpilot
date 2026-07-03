/**
 * Audit all procedure child documents and fix procedure-format content.
 * Usage: npx tsx scripts/audit-fix-child-documents.ts [companyNameSubstring]
 */
import { PrismaClient } from "@prisma/client";
import {
  auditChildContentLabel,
  looksLikeProcedureContent,
} from "../src/lib/qms/child-content-quality";
import { getRuleBasedChildContent } from "../src/lib/qms/rule-based-child-content";
import { listProcedureCodesWithChildren } from "../src/lib/qms/procedure-packs/registry";

const prisma = new PrismaClient();
const locale = "tr" as const;

async function main() {
  const filter = process.argv[2] ?? "Yılmaz";
  const company = await prisma.company.findFirst({
    where: { name: { contains: filter } },
    select: { id: true, name: true },
  });
  if (!company) throw new Error(`Company not found: ${filter}`);

  const children = await prisma.qMSDocument.findMany({
    where: {
      companyId: company.id,
      deletedAt: null,
      layer: { notIn: ["PROCEDURE", "MANUAL"] },
    },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      title: true,
      layer: true,
      parentProcedureCode: true,
      clauseRefs: true,
      content: true,
    },
  });

  const before: Array<{
    code: string;
    layer: string;
    parent: string | null;
    status: string;
  }> = [];

  let fixed = 0;
  let skipped = 0;
  let noTemplate = 0;

  for (const doc of children) {
    const status = auditChildContentLabel(doc.content, doc.layer);
    before.push({
      code: doc.code ?? doc.id,
      layer: doc.layer,
      parent: doc.parentProcedureCode,
      status,
    });

    const template = getRuleBasedChildContent({
      code: doc.code,
      title: doc.title,
      layer: doc.layer,
      locale,
      parentProcedureCode: doc.parentProcedureCode,
      clauseRefs: doc.clauseRefs,
    });

    if (!template) {
      noTemplate++;
      continue;
    }

    const needsFix =
      !doc.content?.trim() || looksLikeProcedureContent(doc.content, doc.layer);
    if (!needsFix) {
      skipped++;
      continue;
    }

    await prisma.qMSDocument.update({
      where: { id: doc.id },
      data: { content: template, status: "DRAFT" },
    });
    fixed++;
  }

  const procedureFormatBefore = before.filter((b) => b.status === "procedure_format");
  const emptyBefore = before.filter((b) => b.status === "empty");

  console.log(`\n=== ${company.name} — child document audit ===\n`);
  console.log(`Total child docs: ${children.length}`);
  console.log(`Before — empty: ${emptyBefore.length}, procedure format: ${procedureFormatBefore.length}`);
  console.log(`Fixed: ${fixed}, already OK: ${skipped}, no template: ${noTemplate}`);

  if (procedureFormatBefore.length > 0) {
    console.log("\nWas procedure format:");
    for (const row of procedureFormatBefore) {
      console.log(`  ${row.code} (${row.layer}) parent=${row.parent ?? "—"}`);
    }
  }

  console.log("\n--- Per procedure pack ---");
  for (const sop of listProcedureCodesWithChildren()) {
    const packChildren = before.filter((b) => b.parent === sop);
    const bad = packChildren.filter((b) => b.status === "procedure_format").length;
    const empty = packChildren.filter((b) => b.status === "empty").length;
    const ok = packChildren.filter((b) => b.status === "ok").length;
    console.log(`${sop}: ${packChildren.length} children — ok:${ok} empty:${empty} bad:${bad}`);
  }

  const after = children.map((doc) => {
    const updated = fixed > 0 ? getRuleBasedChildContent({
      code: doc.code,
      title: doc.title,
      layer: doc.layer,
      locale,
      parentProcedureCode: doc.parentProcedureCode,
      clauseRefs: doc.clauseRefs,
    }) : null;
    const content = updated && looksLikeProcedureContent(doc.content, doc.layer) ? updated : doc.content;
    return auditChildContentLabel(content, doc.layer);
  });

  const stillBad = children.filter((doc, i) => {
    if (fixed > 0 && looksLikeProcedureContent(doc.content, doc.layer)) return true;
    return after[i] === "procedure_format";
  });

  // Re-fetch after updates
  const refreshed = await prisma.qMSDocument.findMany({
    where: {
      companyId: company.id,
      deletedAt: null,
      layer: { notIn: ["PROCEDURE", "MANUAL"] },
    },
    select: { code: true, layer: true, content: true },
  });
  const stillProcedure = refreshed.filter((d) =>
    looksLikeProcedureContent(d.content, d.layer),
  );
  console.log(`\nAfter fix — still procedure format: ${stillProcedure.length}`);
  if (stillProcedure.length > 0) {
    for (const d of stillProcedure) {
      console.log(`  STILL BAD: ${d.code} (${d.layer})`);
    }
  } else {
    console.log("All fixable child documents now use layer-appropriate templates.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
