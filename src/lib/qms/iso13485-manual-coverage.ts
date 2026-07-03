/**
 * ISO 13485:2016 clause coverage map for Quality Manual + KYS register.
 * Used for compliance scoring and gap dashboards (client-safe).
 */

import { ISO13485_DOCS } from "@/lib/domain/constants";

export type ClauseCoverageSource = "manual_section" | "kys_sop" | "wizard_field" | "missing";

export interface Iso13485ClauseRequirement {
  clauseNo: string;
  titleTr: string;
  titleEn: string;
  /** Primary SOP code if documented procedure expected. */
  sopCode?: string;
  /** Linked KYS child documents (forms, lists, policy packs) that evidence the clause. */
  kysDocCodes?: string[];
  /** Wizard answer keys that feed the manual narrative. */
  wizardKeys?: string[];
  /** Manual section heading substring (locale-independent number). */
  manualSectionHint?: string;
}

/** Core clauses the certified manual should address (not every sub-bullet — those live in SOPs). */
export const ISO13485_MANUAL_CLAUSE_MAP: Iso13485ClauseRequirement[] = [
  { clauseNo: "4.1", titleTr: "Genel gereklilikler", titleEn: "General requirements", wizardKeys: ["scopeStatement", "qmsScope", "exclusionsAndJustifications"], manualSectionHint: "2." },
  { clauseNo: "4.2.1", titleTr: "Dokümantasyon — genel", titleEn: "Documentation — general", sopCode: "SOP-DC", kysDocCodes: ["LIST-DC-01"], wizardKeys: ["documentControlProcedureCode"], manualSectionHint: "12." },
  { clauseNo: "4.2.2", titleTr: "Kalite el kitabı", titleEn: "Quality manual", wizardKeys: ["scopeStatement", "qmsScope"], manualSectionHint: "1." },
  { clauseNo: "4.2.3", titleTr: "Tıbbi cihaz dosyası", titleEn: "Medical device file", sopCode: "SOP-MDF", wizardKeys: ["medicalDeviceFileScope"] },
  { clauseNo: "4.2.4", titleTr: "Dokümanların kontrolü", titleEn: "Control of documents", sopCode: "SOP-DC", wizardKeys: ["documentControlProcedureCode"] },
  { clauseNo: "4.2.5", titleTr: "Kayıtların kontrolü", titleEn: "Control of records", sopCode: "SOP-RC", wizardKeys: ["recordControlProcedureCode"] },
  { clauseNo: "5.1", titleTr: "Yönetim taahhüdü", titleEn: "Management commitment", sopCode: "SOP-MR", wizardKeys: ["managementReviewOwner", "generalManager"], manualSectionHint: "11." },
  { clauseNo: "5.2", titleTr: "Müşteri odaklılık", titleEn: "Customer focus", wizardKeys: ["customerFeedbackMethod"] },
  { clauseNo: "5.3", titleTr: "Kalite politikası", titleEn: "Quality policy", sopCode: "SOP-MR", kysDocCodes: ["DOC-OTH-01"], wizardKeys: ["keyProcessKPIs"], manualSectionHint: "11." },
  { clauseNo: "5.4.1", titleTr: "Kalite hedefleri", titleEn: "Quality objectives", wizardKeys: ["keyProcessKPIs"] },
  { clauseNo: "5.4.2", titleTr: "KYS planlaması", titleEn: "QMS planning", wizardKeys: ["qualityRisks", "regulatoryRisks"] },
  { clauseNo: "5.4", titleTr: "Planlama", titleEn: "Planning", wizardKeys: ["qualityRisks", "regulatoryRisks"] },
  { clauseNo: "5.5", titleTr: "Sorumluluk, yetki ve iletişim", titleEn: "Responsibility, authority and communication", sopCode: "SOP-ORG", wizardKeys: ["qualityManager", "managementRepresentative"] },
  { clauseNo: "5.5.1", titleTr: "Sorumluluk ve yetki", titleEn: "Responsibility and authority", sopCode: "SOP-ORG", wizardKeys: ["qualityManager"] },
  { clauseNo: "5.5.2", titleTr: "Yönetim temsilcisi", titleEn: "Management representative", wizardKeys: ["managementRepresentative"] },
  { clauseNo: "5.5.3", titleTr: "İç iletişim", titleEn: "Internal communication", wizardKeys: ["applicableRegulations"] },
  { clauseNo: "5.6", titleTr: "Yönetim gözden geçirmesi", titleEn: "Management review", sopCode: "SOP-MR", wizardKeys: ["managementReviewOwner"] },
  { clauseNo: "6.1", titleTr: "Kaynakların sağlanması", titleEn: "Provision of resources", sopCode: "SOP-HR", wizardKeys: ["trainingProcedureCode"], manualSectionHint: "6." },
  { clauseNo: "6.2", titleTr: "İnsan kaynakları / yetkinlik", titleEn: "Human resources / competence", sopCode: "SOP-HR", wizardKeys: ["trainingProcedureCode"] },
  { clauseNo: "6.3", titleTr: "Altyapı", titleEn: "Infrastructure", sopCode: "SOP-INF" },
  { clauseNo: "6.4", titleTr: "Çalışma ortamı", titleEn: "Work environment", sopCode: "SOP-ENV", wizardKeys: ["cleanroomUsed"] },
  { clauseNo: "7.1", titleTr: "Ürün gerçekleştirme planlaması", titleEn: "Planning of product realization", sopCode: "SOP-RM", wizardKeys: ["riskManagementProcedureCode"] },
  { clauseNo: "7.2", titleTr: "Müşteriyle ilgili süreçler", titleEn: "Customer-related processes", sopCode: "SOP-CRP" },
  { clauseNo: "7.3", titleTr: "Tasarım ve geliştirme", titleEn: "Design and development", sopCode: "SOP-DD", wizardKeys: ["designAndDevelopmentIncluded"] },
  { clauseNo: "7.4", titleTr: "Satın alma", titleEn: "Purchasing", sopCode: "SOP-PU", wizardKeys: ["purchasingResponsible", "supplierProcedureCode"] },
  { clauseNo: "7.5.1", titleTr: "Üretim ve hizmet sunumu", titleEn: "Production and service provision", sopCode: "SOP-PC", wizardKeys: ["productionProcedureCode", "manufacturingMethods"] },
  { clauseNo: "7.5.2", titleTr: "Ürün temizliği", titleEn: "Cleanliness of product", sopCode: "SOP-CLN" },
  { clauseNo: "7.5.3", titleTr: "Kurulum", titleEn: "Installation", sopCode: "SOP-INST", wizardKeys: ["installationServicingIncluded"] },
  { clauseNo: "7.5.4", titleTr: "Servis", titleEn: "Servicing", sopCode: "SOP-SRV", wizardKeys: ["installationServicingIncluded"] },
  { clauseNo: "7.5.5", titleTr: "Steril cihaz gereklilikleri", titleEn: "Sterile device requirements", sopCode: "SOP-ST", wizardKeys: ["sterileProductsIncluded", "sterilizationMethod"] },
  { clauseNo: "7.5.6", titleTr: "Süreç validasyonu", titleEn: "Process validation", sopCode: "SOP-PV" },
  { clauseNo: "7.5.7", titleTr: "Sterilizasyon", titleEn: "Sterilization", sopCode: "SOP-ST", wizardKeys: ["sterilizationMethod", "sterileProductsIncluded"] },
  { clauseNo: "7.5.8", titleTr: "Tanımlama", titleEn: "Identification", sopCode: "SOP-ID" },
  { clauseNo: "7.5.9", titleTr: "İzlenebilirlik", titleEn: "Traceability", sopCode: "SOP-TR", wizardKeys: ["traceabilityMethod"] },
  { clauseNo: "7.5.10", titleTr: "Müşteri mülkiyeti", titleEn: "Customer property", sopCode: "SOP-PC" },
  { clauseNo: "7.5.11", titleTr: "Ürün koruma", titleEn: "Preservation of product", sopCode: "SOP-PP", wizardKeys: ["packagingValidation", "shelfLifeValidation"] },
  { clauseNo: "7.6", titleTr: "İzleme ve ölçme cihazları", titleEn: "Monitoring and measuring equipment", sopCode: "SOP-ME" },
  { clauseNo: "8.1", titleTr: "Genel izleme ve iyileştirme", titleEn: "General monitoring and improvement", wizardKeys: ["keyProcessKPIs", "pmsMethod", "trendAnalysisMethod"], manualSectionHint: "8." },
  { clauseNo: "8.2.1", titleTr: "Geri bildirim / PMS", titleEn: "Feedback / PMS", sopCode: "SOP-FB", wizardKeys: ["pmsMethod", "customerFeedbackMethod"] },
  { clauseNo: "8.2.2", titleTr: "Şikâyet işleme", titleEn: "Complaint handling", sopCode: "SOP-CH", wizardKeys: ["complaintHandlingMethod", "complaintProcedureCode"] },
  { clauseNo: "8.2.3", titleTr: "Düzenleyici bildirim", titleEn: "Regulatory reporting", sopCode: "SOP-VG", wizardKeys: ["vigilanceReportingMethod"] },
  { clauseNo: "8.2.4", titleTr: "İç tetkik", titleEn: "Internal audit", sopCode: "SOP-IA", wizardKeys: ["internalAuditProcedureCode"] },
  { clauseNo: "8.2.5", titleTr: "Süreçlerin izlenmesi", titleEn: "Monitoring of processes", sopCode: "SOP-MON", wizardKeys: ["keyProcessKPIs"] },
  { clauseNo: "8.2.6", titleTr: "Ürünün izlenmesi", titleEn: "Monitoring of product", sopCode: "SOP-MON", wizardKeys: ["testAndInspectionActivities"] },
  { clauseNo: "8.3", titleTr: "Uygunsuz ürün kontrolü", titleEn: "Control of nonconforming product", sopCode: "SOP-NCP", wizardKeys: ["nonconformingProductControl"] },
  { clauseNo: "8.3.3", titleTr: "Danışma bildirimleri / FSCA", titleEn: "Advisory notices / FSCA", sopCode: "SOP-AN", wizardKeys: ["recallMethod"] },
  { clauseNo: "8.4", titleTr: "Veri analizi", titleEn: "Analysis of data", sopCode: "SOP-DA", wizardKeys: ["trendAnalysisMethod"] },
  { clauseNo: "8.5.1", titleTr: "Genel iyileştirme", titleEn: "General improvement", wizardKeys: ["capaMethod", "trendAnalysisMethod"], sopCode: "SOP-CAPA" },
  { clauseNo: "8.5.2", titleTr: "Düzeltici faaliyet (CAPA)", titleEn: "Corrective action", sopCode: "SOP-CAPA", wizardKeys: ["capaMethod", "capaProcedureCode"] },
  { clauseNo: "8.5.3", titleTr: "Önleyici faaliyet", titleEn: "Preventive action", sopCode: "SOP-CAPA" },
];

export interface ClauseCoverageRow {
  clauseNo: string;
  titleTr: string;
  titleEn: string;
  status: "covered" | "partial" | "missing";
  sources: ClauseCoverageSource[];
  sopCode?: string;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function hasWizardCoverage(answers: Record<string, unknown>, keys?: string[]): boolean {
  if (!keys?.length) return false;
  return keys.some((k) => str(answers[k]).length > 0);
}

function kysDocHasContent(
  docs: Array<{ code: string | null; content: string | null; status: string }>,
  code?: string,
): boolean {
  if (!code) return false;
  const doc = docs.find((d) => d.code?.trim() === code);
  return Boolean(doc && str(doc.content).length > 80 && doc.status !== "MISSING");
}

function kysLinkedDocsOk(
  docs: Array<{ code: string | null; content: string | null; status: string }>,
  sopCode?: string,
  kysDocCodes?: string[],
): boolean {
  if (kysDocHasContent(docs, sopCode)) return true;
  return (kysDocCodes ?? []).some((code) => kysDocHasContent(docs, code));
}

/** Score manual + KYS against ISO 13485 clause map. */
export function evaluateIso13485ManualCoverage(params: {
  answers: Record<string, unknown>;
  kysDocs: Array<{ code: string | null; content: string | null; status: string }>;
  manualSectionHeadings?: string[];
  /** When true, clauses mapped to wizard/SOP/manual hints count as manual narrative present. */
  qualityManualGenerated?: boolean;
  locale?: "tr" | "en";
}): { percent: number; rows: ClauseCoverageRow[]; summaryTr: string; summaryEn: string } {
  const { answers, kysDocs, manualSectionHeadings = [], qualityManualGenerated = false } = params;

  const rows: ClauseCoverageRow[] = ISO13485_MANUAL_CLAUSE_MAP.map((req) => {
    const sources: ClauseCoverageSource[] = [];
    const wizardOk = hasWizardCoverage(answers, req.wizardKeys);
    const manualOk =
      manualSectionHeadings.some((h) => h.includes(req.clauseNo)) ||
      (qualityManualGenerated &&
        Boolean(req.wizardKeys?.length || req.manualSectionHint || req.sopCode));
    const kysOk = kysLinkedDocsOk(kysDocs, req.sopCode, req.kysDocCodes);

    if (manualOk) sources.push("manual_section");
    if (wizardOk) sources.push("wizard_field");
    if (kysOk) sources.push("kys_sop");

    let status: ClauseCoverageRow["status"] = "missing";
    if (manualOk && (wizardOk || kysOk)) {
      status = "covered";
    } else if (manualOk || wizardOk || kysOk) {
      status = "partial";
    }

    return {
      clauseNo: req.clauseNo,
      titleTr: req.titleTr,
      titleEn: req.titleEn,
      status,
      sources,
      sopCode: req.sopCode,
    };
  });

  const covered = rows.filter((r) => r.status === "covered").length;
  const partial = rows.filter((r) => r.status === "partial").length;
  const total = rows.length;
  const percent = Math.round(((covered + partial * 0.5) / total) * 100);

  const scaffoldCodes = new Set(ISO13485_DOCS.map((d) => d.code));
  const missingSops = [...scaffoldCodes].filter((c) => !kysLinkedDocsOk(kysDocs, c)).length;

  return {
    percent,
    rows,
    summaryTr: `${covered}/${total} madde tam, ${partial} kısmi. KYS scaffold eksik prosedür: ${missingSops}. El kitabı tek başına sertifikasyon yerine geçmez; prosedür metinleri şart.`,
    summaryEn: `${covered}/${total} clauses full, ${partial} partial. KYS scaffold missing procedures: ${missingSops}. The manual alone does not replace certification; procedure bodies are required.`,
  };
}
