/* Non-destructive Standards Knowledge Base sync.
 *
 * Loads/updates the public standards catalogue (ISO/IEC summaries, MDR and MDCG
 * references) into the DB WITHOUT deleting products, companies or any other data.
 * Safe to run repeatedly: existing standards are matched by code and missing
 * clauses (and their knowledge chunks) are added.
 *
 * Run:  npx tsx scripts/sync-standards.ts
 */
import { PrismaClient } from "@prisma/client";
import { STANDARDS_SEED } from "../prisma/standards-catalog";

const prisma = new PrismaClient();

async function main() {
  let createdStandards = 0;
  let createdClauses = 0;

  for (const s of STANDARDS_SEED) {
    // Match the public (company-less) standard by code.
    let std = await prisma.standard.findFirst({
      where: { code: s.code, companyId: null },
    });
    if (!std) {
      std = await prisma.standard.create({
        data: {
          companyId: null, code: s.code, title: s.title, version: s.version,
          sourceType: s.sourceType, jurisdiction: s.jurisdiction, isPublic: true,
        },
      });
      createdStandards++;
    } else {
      // Keep metadata fresh (title/version may have been refined).
      await prisma.standard.update({
        where: { id: std.id },
        data: { title: s.title, version: s.version, sourceType: s.sourceType, jurisdiction: s.jurisdiction },
      });
    }

    const existingClauses = await prisma.standardClause.findMany({
      where: { standardId: std.id },
      select: { clauseNo: true },
    });
    const seen = new Set(existingClauses.map((c) => c.clauseNo));

    for (const c of s.clauses) {
      if (seen.has(c.clauseNo)) continue;
      await prisma.standardClause.create({
        data: {
          standardId: std.id, clauseNo: c.clauseNo, title: c.title, summary: c.summary,
          keywords: c.keywords, applicability: c.applicability ?? null,
          documentExpectationsJson: c.documentExpectations ?? [],
          evidenceExpectationsJson: c.evidenceExpectations ?? [],
          riskRelevanceJson: c.riskRelevance ?? [],
        },
      });
      await prisma.knowledgeChunk.create({
        data: {
          companyId: null, standardId: std.id, sourceType: s.sourceType,
          title: `${s.code} ${c.clauseNo} — ${c.title}`,
          text: `${s.code} ${c.clauseNo} ${c.title}. ${c.summary} ${(c.documentExpectations ?? []).join(" ")} ${(c.evidenceExpectations ?? []).join(" ")}`.trim(),
          metadataJson: { clauseNo: c.clauseNo, standardCode: s.code },
        },
      });
      createdClauses++;
    }
  }

  const totalStandards = await prisma.standard.count({ where: { companyId: null } });
  const totalClauses = await prisma.standardClause.count();
  console.log("Standards sync complete:");
  console.log(`  New standards added: ${createdStandards}`);
  console.log(`  New clauses added:   ${createdClauses}`);
  console.log(`  Public standards now: ${totalStandards}`);
  console.log(`  Clauses now:          ${totalClauses}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
