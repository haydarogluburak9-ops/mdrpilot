import { ISO13485_DOCS } from "@/lib/domain/constants";
import { computeAuditReadiness } from "@/lib/domain/scoring";
import { computeClauseGaps } from "@/lib/rag/audit-gaps";
import type { Product } from "@/lib/domain/types";
import type { AuditGap, AuditReadinessSummary } from "./types";

export interface QmsDocSnapshot {
  code: string | null;
  title: string;
  layer: string;
  status: string;
  content: string | null;
}

export interface CompanyAuditInput {
  companyName: string;
  srnNumber?: string | null;
  notifiedBody?: string | null;
  qmsDocs: QmsDocSnapshot[];
  composerQmStatus?: string | null;
  capas: { id: string; title: string; status: string; dueDate: string | null; productName?: string }[];
  products: Product[];
  contentScorePercent: number;
}

function str(v: string | null | undefined): string {
  return (v ?? "").trim();
}

function hasContent(doc: QmsDocSnapshot): boolean {
  return str(doc.content).length > 80 && doc.status !== "MISSING";
}

function gapId(parts: string[]): string {
  return parts.join(":");
}

function mapClauseGaps(product: Product): AuditGap[] {
  return computeClauseGaps(product).map((g, i) => ({
    id: gapId(["clause", product.id, g.clauseNo, String(i)]),
    category: g.standardCode.startsWith("ISO") ? "qms" : "mdr",
    severity: g.severity === "high" ? "major" : "minor",
    standardCode: g.standardCode,
    clauseRef: g.clauseNo,
    titleTr: g.label,
    titleEn: g.label,
    messageTr: g.message,
    messageEn: g.message,
    productId: product.id,
    productName: product.name,
    actionHref: `/products/${product.id}`,
    actionLabelTr: "Ürün dosyasına git",
    actionLabelEn: "Open product dossier",
  }));
}

function clinicalGaps(product: Product): AuditGap[] {
  const gaps: AuditGap[] = [];
  const tfClinical = product.technicalSections?.find((s) => s.key === "clinical-evaluation");
  const cerMissing =
    !tfClinical ||
    tfClinical.status === "MISSING" ||
    !str(tfClinical.content);

  if (cerMissing) {
    gaps.push({
      id: gapId(["cer", product.id]),
      category: "mdr",
      severity: "major",
      standardCode: "MDR 2017/745",
      clauseRef: "Annex XIV / Art. 61",
      titleTr: "Klinik değerlendirme (CER)",
      titleEn: "Clinical evaluation (CER)",
      messageTr:
        "Klinik değerlendirme raporu eksik veya onaylanmamış. NB denetiminde Annex XIV ve risk dosyası ile tutarlılık sorulur.",
      messageEn:
        "Clinical evaluation report is missing or not approved. Notified Body will expect Annex XIV alignment with the risk file.",
      productId: product.id,
      productName: product.name,
      actionHref: "/clinical",
      actionLabelTr: "Klinik modülü",
      actionLabelEn: "Clinical module",
    });
  } else if (tfClinical.status !== "APPROVED") {
    gaps.push({
      id: gapId(["cer-status", product.id]),
      category: "mdr",
      severity: "minor",
      standardCode: "MDR 2017/745",
      clauseRef: "Annex XIV",
      titleTr: "CER onaylı değil",
      titleEn: "CER not approved",
      messageTr: `Klinik değerlendirme bölümü durumu: ${tfClinical.status}. Onaylı CER ve revizyon kontrolü gerekir.`,
      messageEn: `Clinical evaluation section status: ${tfClinical.status}. Approved CER with revision control is required.`,
      productId: product.id,
      productName: product.name,
      actionHref: "/clinical",
      actionLabelTr: "Klinik modülü",
      actionLabelEn: "Clinical module",
    });
  }

  return gaps;
}

function udiGaps(product: Product): AuditGap[] {
  if (str(product.basicUdiDi) && str(product.udiDi)) return [];
  return [
    {
      id: gapId(["udi", product.id]),
      category: "mdr",
      severity: "minor",
      standardCode: "MDR 2017/745",
      clauseRef: "Art. 27-29",
      titleTr: "UDI tanımlaması eksik",
      titleEn: "UDI identification incomplete",
      messageTr: "Basic UDI-DI veya UDI-DI eksik. EUDAMED kaydı ve etiket/IFU ile uyum denetçi tarafından kontrol edilir.",
      messageEn: "Basic UDI-DI or UDI-DI missing. Auditor will cross-check EUDAMED registration and label/IFU alignment.",
      productId: product.id,
      productName: product.name,
      actionHref: `/products/${product.id}`,
      actionLabelTr: "Ürün bilgileri",
      actionLabelEn: "Product details",
    },
  ];
}

function gsprEvidenceGaps(product: Product): AuditGap[] {
  const applicable = (product.gsprItems ?? []).filter((g) => g.applicable !== "NO");
  const noFileEvidence = applicable.filter(
    (g) => !g.evidenceManual && !str(g.evidenceDocument) && g.status !== "APPROVED",
  ).length;
  if (noFileEvidence === 0) return [];
  return [
    {
      id: gapId(["gspr-evidence", product.id]),
      category: "evidence",
      severity: "major",
      standardCode: "MDR 2017/745",
      clauseRef: "Annex I GSPR",
      titleTr: "GSPR kanıt dosyaları",
      titleEn: "GSPR evidence files",
      messageTr: `${noFileEvidence} GSPR maddesinde test raporu / kanıt dosyası bağlantısı veya onaylı uygunluk ifadesi yok.`,
      messageEn: `${noFileEvidence} GSPR item(s) lack linked test reports / evidence files or approved compliance statements.`,
      productId: product.id,
      productName: product.name,
      actionHref: "/gspr",
      actionLabelTr: "GSPR modülü",
      actionLabelEn: "GSPR module",
    },
  ];
}

function qmsGaps(input: CompanyAuditInput): AuditGap[] {
  const gaps: AuditGap[] = [];
  const withContent = input.qmsDocs.filter(hasContent);
  const approved = withContent.filter((d) => d.status === "APPROVED");
  const inReview = withContent.filter((d) => d.status === "IN_REVIEW");

  if (withContent.length > 0 && approved.length === 0) {
    gaps.push({
      id: gapId(["qms", "no-approved"]),
      category: "qms",
      severity: "major",
      standardCode: "ISO 13485",
      clauseRef: "4.2.4",
      titleTr: "Onaylı KYS dokümanı yok",
      titleEn: "No approved QMS documents",
      messageTr: `${withContent.length} dokümanda içerik var ancak hiçbiri APPROVED değil (${inReview.length} incelemede). Denetçi kontrollü kopya ve onay imzası ister.`,
      messageEn: `${withContent.length} documents have content but none are APPROVED (${inReview.length} in review). Auditor expects controlled copies and approval signatures.`,
      actionHref: "/qms",
      actionLabelTr: "KYS kayıt defteri",
      actionLabelEn: "QMS register",
    });
  }

  const criticalSops = ISO13485_DOCS.map((d) => d.code);
  const unapprovedCritical = criticalSops.filter((code) => {
    const doc = input.qmsDocs.find((d) => d.code === code);
    return doc && hasContent(doc) && doc.status !== "APPROVED";
  });
  if (unapprovedCritical.length > 0 && unapprovedCritical.length <= 5) {
    for (const code of unapprovedCritical) {
      gaps.push({
        id: gapId(["qms-sop", code]),
        category: "qms",
        severity: "major",
        standardCode: "ISO 13485",
        clauseRef: "4.2.4",
        titleTr: `Prosedür onaylı değil: ${code}`,
        titleEn: `Procedure not approved: ${code}`,
        messageTr: `${code} içerikli ancak onaylı değil. Saha denetiminde bu prosedüre göre kayıt ve uygulama sorulur.`,
        messageEn: `${code} has content but is not approved. Field audit will ask for records and implementation per this procedure.`,
        actionHref: `/qms/procedures/${encodeURIComponent(code)}`,
        actionLabelTr: "Prosedürü aç",
        actionLabelEn: "Open procedure",
      });
    }
  } else if (unapprovedCritical.length > 5) {
    gaps.push({
      id: gapId(["qms-sops-bulk"]),
      category: "qms",
      severity: "major",
      standardCode: "ISO 13485",
      clauseRef: "4.2.4",
      titleTr: "Kritik prosedürler onaylı değil",
      titleEn: "Critical procedures not approved",
      messageTr: `${unapprovedCritical.length} kritik SOP onaylı değil. Öncelik: SOP-CAPA, SOP-IA, SOP-VG, SOP-DC, SOP-DD.`,
      messageEn: `${unapprovedCritical.length} critical SOPs are not approved. Priority: SOP-CAPA, SOP-IA, SOP-VG, SOP-DC, SOP-DD.`,
      actionHref: "/qms",
      actionLabelTr: "KYS kayıt defteri",
      actionLabelEn: "QMS register",
    });
  }

  const recordLayer = input.qmsDocs.filter((d) => d.layer === "RECORD" && hasContent(d));
  const recordApproved = recordLayer.filter((d) => d.status === "APPROVED").length;
  if (recordLayer.length > 0 && recordApproved === 0) {
    gaps.push({
      id: gapId(["qms-records"]),
      category: "operational",
      severity: "minor",
      standardCode: "ISO 13485",
      clauseRef: "4.2.5",
      titleTr: "Operasyonel kayıtlar örnek şablon",
      titleEn: "Operational records are sample templates",
      messageTr: `${recordLayer.length} kayıt dokümanı var ancak canlı operasyonel kayıt ve kapanış döngüsü platformda izlenmiyor. Denetçi gerçek eğitim, kalibrasyon, tetkik bulguları ister.`,
      messageEn: `${recordLayer.length} record documents exist but live operational records and closure loops are not tracked. Auditor will ask for real training, calibration and audit findings.`,
      actionHref: "/qms",
      actionLabelTr: "Kayıt defteri",
      actionLabelEn: "Document register",
    });
  }

  if (input.composerQmStatus && input.composerQmStatus !== "APPROVED") {
    gaps.push({
      id: gapId(["qm-composer"]),
      category: "qms",
      severity: "major",
      standardCode: "ISO 13485",
      clauseRef: "4.2.2",
      titleTr: "Kalite el kitabı onaylı değil",
      titleEn: "Quality manual not approved",
      messageTr: `Composer kalite el kitabı durumu: ${input.composerQmStatus}. KEK kontrollü kopya ve yönetim onayı şart.`,
      messageEn: `Composer quality manual status: ${input.composerQmStatus}. Controlled copy and management approval required.`,
      actionHref: "/composer",
      actionLabelTr: "Composer",
      actionLabelEn: "Composer",
    });
  }

  const needsNb = input.products.some(
    (p) => p.deviceClass !== "CLASS_I" && p.deviceClass !== "CLASS_IM",
  );
  if (needsNb && !str(input.notifiedBody)) {
    gaps.push({
      id: gapId(["company-nb"]),
      category: "mdr",
      severity: "major",
      standardCode: "MDR 2017/745",
      clauseRef: "Art. 52",
      titleTr: "Bildirilmiş kuruluş bilgisi eksik",
      titleEn: "Notified Body information missing",
      messageTr: "Sınıf IIa+ ürün var ancak şirket profilinde NB numarası tanımlı değil.",
      messageEn: "Class IIa+ product present but company profile has no Notified Body number.",
      actionHref: "/settings",
      actionLabelTr: "Şirket ayarları",
      actionLabelEn: "Company settings",
    });
  }

  if (!str(input.srnNumber) && needsNb) {
    gaps.push({
      id: gapId(["company-srn"]),
      category: "mdr",
      severity: "minor",
      standardCode: "MDR 2017/745",
      clauseRef: "Art. 31",
      titleTr: "SRN eksik",
      titleEn: "SRN missing",
      messageTr: "EUDAMED SRN şirket profilinde tanımlı değil.",
      messageEn: "EUDAMED SRN is not set in company profile.",
      actionHref: "/settings",
      actionLabelTr: "Şirket ayarları",
      actionLabelEn: "Company settings",
    });
  }

  return gaps;
}

function capaGaps(capas: CompanyAuditInput["capas"]): AuditGap[] {
  const now = Date.now();
  const gaps: AuditGap[] = [];
  const open = capas.filter((c) => c.status !== "CLOSED");
  const overdue = open.filter((c) => c.dueDate && new Date(c.dueDate).getTime() < now);

  if (open.length === 0) {
    gaps.push({
      id: gapId(["capa-none"]),
      category: "operational",
      severity: "observation",
      standardCode: "ISO 13485",
      clauseRef: "8.5.2",
      titleTr: "CAPA kaydı yok",
      titleEn: "No CAPA records",
      messageTr: "Açık veya kapalı CAPA kaydı bulunmuyor. Denetçi DÖF sürecinin canlı uygulamasını örnek kayıtlarla görmek ister.",
      messageEn: "No open or closed CAPA records. Auditor expects live corrective action process with sample records.",
      actionHref: "/operational/capa",
      actionLabelTr: "CAPA modülü",
      actionLabelEn: "CAPA module",
    });
  }

  for (const c of overdue.slice(0, 5)) {
    gaps.push({
      id: gapId(["capa-overdue", c.id]),
      category: "operational",
      severity: "minor",
      standardCode: "ISO 13485",
      clauseRef: "8.5.2",
      titleTr: "Gecikmiş CAPA",
      titleEn: "Overdue CAPA",
      messageTr: `CAPA gecikmiş: ${c.title}${c.productName ? ` (${c.productName})` : ""}`,
      messageEn: `Overdue CAPA: ${c.title}${c.productName ? ` (${c.productName})` : ""}`,
      actionHref: "/operational/capa",
      actionLabelTr: "CAPA modülü",
      actionLabelEn: "CAPA module",
    });
  }

  return gaps;
}

export function computeAuditGaps(input: CompanyAuditInput): AuditGap[] {
  const gaps: AuditGap[] = [
    ...qmsGaps(input),
    ...capaGaps(input.capas),
  ];

  for (const product of input.products) {
    gaps.push(
      ...mapClauseGaps(product),
      ...clinicalGaps(product),
      ...udiGaps(product),
      ...gsprEvidenceGaps(product),
    );
  }

  const seen = new Set<string>();
  return gaps.filter((g) => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });
}

export function summarizeAuditReadiness(input: CompanyAuditInput): AuditReadinessSummary {
  const gaps = computeAuditGaps(input);
  const majorCount = gaps.filter((g) => g.severity === "major").length;
  const minorCount = gaps.filter((g) => g.severity === "minor").length;
  const observationCount = gaps.filter((g) => g.severity === "observation").length;

  const withContent = input.qmsDocs.filter(hasContent);
  const qmsApproved = withContent.filter((d) => d.status === "APPROVED").length;

  const mdrScores = input.products.map((p) => computeAuditReadiness(p).score);
  const mdrScore =
    mdrScores.length > 0
      ? Math.round(mdrScores.reduce((a, b) => a + b, 0) / mdrScores.length)
      : 0;

  const qmsScore =
    withContent.length > 0
      ? Math.round((qmsApproved / withContent.length) * 100)
      : 0;

  const contentPenalty = Math.min(majorCount * 8 + minorCount * 3, 60);
  const overallScore = Math.max(
    0,
    Math.round((qmsScore * 0.4 + mdrScore * 0.6) - contentPenalty),
  );

  return {
    qmsScore,
    mdrScore,
    overallScore,
    majorCount,
    minorCount,
    observationCount,
    gaps,
    qmsApproved,
    qmsTotal: withContent.length,
    contentScorePercent: input.contentScorePercent,
  };
}
