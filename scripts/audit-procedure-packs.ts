import { PrismaClient } from "@prisma/client";
import { ISO13485_DOCS } from "../src/lib/domain/constants";
import { getStructureChildrenForProcedure } from "../src/lib/qms/procedure-packs/registry";

const prisma = new PrismaClient();

async function main() {
  const filter = process.argv[2] ?? "Yılmaz";
  const company = await prisma.company.findFirst({
    where: { name: { contains: filter } },
    select: { id: true, name: true },
  });
  if (!company) throw new Error("Company not found");

  const children = await prisma.qMSDocument.findMany({
    where: { companyId: company.id, deletedAt: null, layer: { notIn: ["PROCEDURE", "MANUAL"] } },
    select: { code: true, parentProcedureCode: true },
  });

  const byParent = new Map<string, string[]>();
  for (const c of children) {
    const p = c.parentProcedureCode?.trim().toUpperCase() || "?";
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)!.push(c.code ?? "");
  }

  console.log(`\n=== ${company.name} — procedure pack audit ===\n`);
  let noPack = 0;
  let partial = 0;
  let ok = 0;

  for (const { code } of ISO13485_DOCS) {
    const tmplCodes = getStructureChildrenForProcedure(code).map((t) => t.code);
    const dbCodes = byParent.get(code) ?? [];
    const missing = tmplCodes.filter((c) => !dbCodes.includes(c));
    const tmpl = tmplCodes.length;
    const db = dbCodes.length;

    if (tmpl === 0) {
      noPack++;
      console.log(`${code}: NO_PACK (0 template, ${db} in DB)`);
    } else if (missing.length > 0) {
      partial++;
      console.log(`${code}: PARTIAL template=${tmpl} db=${db} missing=${missing.join(", ")}`);
    } else {
      ok++;
      console.log(`${code}: OK template=${tmpl} db=${db}`);
    }
  }

  console.log(`\nSummary: OK=${ok} PARTIAL=${partial} NO_PACK=${noPack}`);
}

main()
  .finally(() => prisma.$disconnect());
