import "server-only";
import { prisma } from "@/lib/db";
import { evaluateApplicability, resolveGsprNaReason } from "@/lib/domain/applicability";
import { syncTechnicalFileSections } from "@/lib/products/technical-file-sync";

/**
 * Recompute and persist section / GSPR applicability for a product based on its
 * device class and properties. Conservative and non-destructive:
 *  - Only auto-marks items that are still untouched (status MISSING, no content/
 *    evidence). Manually edited or approved items are never changed.
 *  - Re-enables items that became applicable again (e.g. class changed) only when
 *    they are still untouched.
 */
export async function applyApplicability(productId: string): Promise<{ sections: number; gspr: number }> {
  await syncTechnicalFileSections(productId);

  const product = await prisma.product.findFirst({
    where: { id: productId },
    select: {
      deviceClass: true, isSterile: true, containsSoftware: true,
      hasMeasuringFn: true, isInvasive: true,
      isImplantable: true, isActive: true, isReusable: true, emitsRadiation: true,
      administersMedicineOrEnergy: true, containsMedicinalSubstance: true,
      containsBiologicalMaterial: true, isAbsorbable: true, containsCmrOrEndocrine: true,
      containsNanomaterial: true, isForLayUser: true,
      technicalSections: { select: { id: true, key: true, status: true, applicable: true, content: true } },
      gsprItems: { select: { id: true, gsprNo: true, status: true, applicable: true, evidenceDocument: true } },
    },
  });
  if (!product) return { sections: 0, gspr: 0 };

  const result = evaluateApplicability({
    deviceClass: product.deviceClass,
    isSterile: product.isSterile,
    containsSoftware: product.containsSoftware,
    hasMeasuringFn: product.hasMeasuringFn,
    isInvasive: product.isInvasive,
    isImplantable: product.isImplantable,
    isActive: product.isActive,
    isReusable: product.isReusable,
    emitsRadiation: product.emitsRadiation,
    administersMedicineOrEnergy: product.administersMedicineOrEnergy,
    containsMedicinalSubstance: product.containsMedicinalSubstance,
    containsBiologicalMaterial: product.containsBiologicalMaterial,
    isAbsorbable: product.isAbsorbable,
    containsCmrOrEndocrine: product.containsCmrOrEndocrine,
    containsNanomaterial: product.containsNanomaterial,
    isForLayUser: product.isForLayUser,
  });
  const naSection = new Map(result.sections.map((e) => [e.id, e.reason]));

  const ops: Promise<unknown>[] = [];
  let sectionChanges = 0;
  let gsprChanges = 0;

  for (const s of product.technicalSections) {
    const untouched = s.status === "MISSING" && !s.content;
    if (!untouched) continue; // never override manual work
    const reason = naSection.get(s.key);
    if (reason && s.applicable) {
      ops.push(prisma.technicalFileSection.update({ where: { id: s.id }, data: { applicable: false, naReason: reason } }));
      sectionChanges++;
    } else if (!reason && !s.applicable) {
      ops.push(prisma.technicalFileSection.update({ where: { id: s.id }, data: { applicable: true, naReason: null } }));
      sectionChanges++;
    }
  }

  for (const g of product.gsprItems) {
    const untouched = g.status === "MISSING" && !g.evidenceDocument;
    if (!untouched) continue;
    const reason = resolveGsprNaReason(g.gsprNo, {
      deviceClass: product.deviceClass,
      isSterile: product.isSterile,
      containsSoftware: product.containsSoftware,
      hasMeasuringFn: product.hasMeasuringFn,
      isInvasive: product.isInvasive,
      isImplantable: product.isImplantable,
      isActive: product.isActive,
      isReusable: product.isReusable,
      emitsRadiation: product.emitsRadiation,
      administersMedicineOrEnergy: product.administersMedicineOrEnergy,
      containsMedicinalSubstance: product.containsMedicinalSubstance,
      containsBiologicalMaterial: product.containsBiologicalMaterial,
      isAbsorbable: product.isAbsorbable,
      containsCmrOrEndocrine: product.containsCmrOrEndocrine,
      containsNanomaterial: product.containsNanomaterial,
      isForLayUser: product.isForLayUser,
    });
    if (reason && g.applicable !== "NO") {
      ops.push(prisma.gSPRItem.update({ where: { id: g.id }, data: { applicable: "NO" } }));
      gsprChanges++;
    } else if (!reason && g.applicable === "NO") {
      ops.push(prisma.gSPRItem.update({ where: { id: g.id }, data: { applicable: "JUSTIFICATION" } }));
      gsprChanges++;
    }
  }

  await Promise.all(ops);
  return { sections: sectionChanges, gspr: gsprChanges };
}
