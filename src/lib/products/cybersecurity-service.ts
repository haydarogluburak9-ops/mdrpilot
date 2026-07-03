import "server-only";
import { prisma } from "@/lib/db";
import type { DocStatus } from "@/lib/domain/types";

export type CyberSecurityData = {
  threatModel: string | null;
  sbomReference: string | null;
  vulnerabilityProcess: string | null;
  securityTesting: string | null;
  patchManagement: string | null;
  clinicalSafetyImpact: string | null;
  status: DocStatus;
  revisionNo: number;
};

const TEMPLATE = (locale: "tr" | "en"): CyberSecurityData => {
  const tr = locale === "tr";
  return {
    threatModel: tr
      ? "## Tehdit modeli\n- Varlıklar: yazılım, veri, ağ arayüzleri\n- Tehdit aktörleri ve saldırı yüzeyi\n- Risk değerlendirmesi (ISO 14971 ile bağlantı)"
      : "## Threat model\n- Assets: software, data, network interfaces\n- Threat actors and attack surface\n- Risk assessment (linked to ISO 14971)",
    sbomReference: tr
      ? "SBOM formatı ve depolama konumu (ör. CycloneDX / SPDX)"
      : "SBOM format and storage location (e.g. CycloneDX / SPDX)",
    vulnerabilityProcess: tr
      ? "Güvenlik açığı izleme, değerlendirme ve düzeltme süreci (MDCG 2019-16)"
      : "Vulnerability monitoring, assessment and remediation (MDCG 2019-16)",
    securityTesting: tr
      ? "Penetrasyon testi, statik/dinamik analiz, güvenli kodlama doğrulaması"
      : "Penetration testing, static/dynamic analysis, secure coding verification",
    patchManagement: tr
      ? "Yama yönetimi ve güvenlik güncellemelerinin dağıtımı"
      : "Patch management and distribution of security updates",
    clinicalSafetyImpact: tr
      ? "Siber olayların klinik güvenlik ve performansa etkisi"
      : "Impact of cyber incidents on clinical safety and performance",
    status: "DRAFT",
    revisionNo: 0,
  };
};

export async function loadCyberSecurity(productId: string, companyId: string, locale: "tr" | "en") {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    select: { id: true },
  });
  if (!product) return null;

  let row = await prisma.cyberSecurityFile.findUnique({ where: { productId } });
  if (!row) {
    const t = TEMPLATE(locale);
    row = await prisma.cyberSecurityFile.create({
      data: { productId, ...t },
    });
  }

  return {
    threatModel: row.threatModel,
    sbomReference: row.sbomReference,
    vulnerabilityProcess: row.vulnerabilityProcess,
    securityTesting: row.securityTesting,
    patchManagement: row.patchManagement,
    clinicalSafetyImpact: row.clinicalSafetyImpact,
    status: row.status as DocStatus,
    revisionNo: row.revisionNo,
  };
}

export async function saveCyberSecurity(
  productId: string,
  companyId: string,
  data: Partial<CyberSecurityData>,
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
  });
  if (!product) return null;

  return prisma.cyberSecurityFile.upsert({
    where: { productId },
    create: { productId, ...data },
    update: data,
  });
}
