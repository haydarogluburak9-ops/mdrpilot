/* Non-destructive applicability sync.
 *
 * Recomputes section / GSPR applicability for EVERY existing product based on its
 * device class and properties (sterility, software, measuring function). Only
 * touches untouched items (status MISSING, no content/evidence) so manual work,
 * drafts and approvals are never overwritten. Safe to run repeatedly.
 *
 * Run:  npx tsx scripts/sync-applicability.ts
 */
import { PrismaClient } from "@prisma/client";
import { evaluateApplicability } from "../src/lib/domain/applicability";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true, name: true, deviceClass: true, isSterile: true,
      containsSoftware: true, hasMeasuringFn: true, isInvasive: true,
      isImplantable: true, isActive: true, isReusable: true, emitsRadiation: true,
      administersMedicineOrEnergy: true, containsMedicinalSubstance: true,
      containsBiologicalMaterial: true, isAbsorbable: true, containsCmrOrEndocrine: true,
      containsNanomaterial: true, isForLayUser: true,
      technicalSections: { select: { id: true, key: true, status: true, applicable: true, content: true } },
      gsprItems: { select: { id: true, gsprNo: true, status: true, applicable: true, evidenceDocument: true } },
    },
  });

  let totalSections = 0;
  let totalGspr = 0;

  for (const p of products) {
    const result = evaluateApplicability({
      deviceClass: p.deviceClass,
      isSterile: p.isSterile,
      containsSoftware: p.containsSoftware,
      hasMeasuringFn: p.hasMeasuringFn,
      isInvasive: p.isInvasive,
      isImplantable: p.isImplantable,
      isActive: p.isActive,
      isReusable: p.isReusable,
      emitsRadiation: p.emitsRadiation,
      administersMedicineOrEnergy: p.administersMedicineOrEnergy,
      containsMedicinalSubstance: p.containsMedicinalSubstance,
      containsBiologicalMaterial: p.containsBiologicalMaterial,
      isAbsorbable: p.isAbsorbable,
      containsCmrOrEndocrine: p.containsCmrOrEndocrine,
      containsNanomaterial: p.containsNanomaterial,
      isForLayUser: p.isForLayUser,
    });
    const naSection = new Map(result.sections.map((e) => [e.id, e.reason]));
    const naGspr = new Map(result.gspr.map((e) => [e.id, e.reason]));

    let secCount = 0;
    let gsprCount = 0;

    for (const s of p.technicalSections) {
      if (!(s.status === "MISSING" && !s.content)) continue;
      const reason = naSection.get(s.key);
      if (reason && s.applicable) {
        await prisma.technicalFileSection.update({ where: { id: s.id }, data: { applicable: false, naReason: reason } });
        secCount++;
      } else if (!reason && !s.applicable) {
        await prisma.technicalFileSection.update({ where: { id: s.id }, data: { applicable: true, naReason: null } });
        secCount++;
      }
    }

    for (const g of p.gsprItems) {
      if (!(g.status === "MISSING" && !g.evidenceDocument)) continue;
      const reason = naGspr.get(g.gsprNo);
      if (reason && g.applicable !== "NO") {
        await prisma.gSPRItem.update({ where: { id: g.id }, data: { applicable: "NO", justification: reason } });
        gsprCount++;
      } else if (!reason && g.applicable === "NO") {
        await prisma.gSPRItem.update({ where: { id: g.id }, data: { applicable: "JUSTIFICATION" } });
        gsprCount++;
      }
    }

    totalSections += secCount;
    totalGspr += gsprCount;
    console.log(`  ${p.name} [${p.deviceClass}]: ${secCount} sections, ${gsprCount} GSPR marked N/A-adjusted`);
  }

  console.log(`Applicability sync complete. Sections: ${totalSections}, GSPR: ${totalGspr}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
