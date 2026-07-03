import "server-only";
import { prisma } from "@/lib/db";
import type { DocStatus } from "@/lib/domain/types";

export type SoftwareLifecycleData = {
  safetyClass: string | null;
  developmentPlan: string | null;
  requirementsSpec: string | null;
  architectureDesign: string | null;
  unitVerification: string | null;
  integrationTesting: string | null;
  systemTesting: string | null;
  releaseRecord: string | null;
  maintenancePlan: string | null;
  status: DocStatus;
  revisionNo: number;
};

const TEMPLATE = (locale: "tr" | "en", safetyClass: string | null): SoftwareLifecycleData => {
  const tr = locale === "tr";
  return {
    safetyClass,
    developmentPlan: tr
      ? `## Yazılım geliştirme planı (IEC 62304)\nGüvenlik sınıfı: ${safetyClass ?? "B"}`
      : `## Software development plan (IEC 62304)\nSafety class: ${safetyClass ?? "B"}`,
    requirementsSpec: tr ? "Yazılım gereksinimleri spesifikasyonu" : "Software requirements specification",
    architectureDesign: tr ? "Yazılım mimarisi ve modül tasarımı" : "Software architecture and module design",
    unitVerification: tr ? "Birim doğrulama kayıtları" : "Unit verification records",
    integrationTesting: tr ? "Entegrasyon testleri" : "Integration testing",
    systemTesting: tr ? "Sistem testleri" : "System testing",
    releaseRecord: tr ? "Sürüm kaydı ve SOUP listesi" : "Release record and SOUP list",
    maintenancePlan: tr ? "Bakım ve sorun çözme süreci" : "Maintenance and problem resolution",
    status: "DRAFT",
    revisionNo: 0,
  };
};

export async function loadSoftwareLifecycle(productId: string, companyId: string, locale: "tr" | "en") {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    select: { id: true, softwareSafetyClass: true },
  });
  if (!product) return null;

  let row = await prisma.softwareLifecycleFile.findUnique({ where: { productId } });
  if (!row) {
    const t = TEMPLATE(locale, product.softwareSafetyClass);
    row = await prisma.softwareLifecycleFile.create({
      data: { productId, ...t },
    });
  }

  return {
    safetyClass: row.safetyClass ?? product.softwareSafetyClass,
    developmentPlan: row.developmentPlan,
    requirementsSpec: row.requirementsSpec,
    architectureDesign: row.architectureDesign,
    unitVerification: row.unitVerification,
    integrationTesting: row.integrationTesting,
    systemTesting: row.systemTesting,
    releaseRecord: row.releaseRecord,
    maintenancePlan: row.maintenancePlan,
    status: row.status as DocStatus,
    revisionNo: row.revisionNo,
  };
}

export async function saveSoftwareLifecycle(
  productId: string,
  companyId: string,
  data: Partial<SoftwareLifecycleData>,
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
  });
  if (!product) return null;

  const row = await prisma.softwareLifecycleFile.upsert({
    where: { productId },
    create: { productId, ...data },
    update: data,
  });

  if (data.safetyClass) {
    await prisma.product.update({
      where: { id: productId },
      data: { softwareSafetyClass: data.safetyClass },
    });
  }

  return row;
}
