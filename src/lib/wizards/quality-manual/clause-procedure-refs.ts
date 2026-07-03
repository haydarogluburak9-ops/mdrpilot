import { QM_PROCEDURE_FIELD_TO_QMS_CODE } from "./procedure-codes";
import { bi } from "./quality-manual-bilingual";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function sop(answers: Record<string, unknown>, fieldKey: string, fallback: string): string {
  return str(answers[fieldKey]) || fallback;
}

/** ISO clause → wizard procedure field keys (fallback SOP codes resolved at render). */
const CLAUSE_REF_FIELDS: Record<string, Array<{ field: string; fallback: string; labelTr: string; labelEn: string }>> = {
  "4.2.4": [{ field: "documentControlProcedureCode", fallback: "SOP-DC", labelTr: "Dokümanların Kontrolü Prosedürü", labelEn: "Document Control Procedure" }],
  "4.2.5": [{ field: "recordControlProcedureCode", fallback: "SOP-RC", labelTr: "Kayıtların Kontrolü Prosedürü", labelEn: "Record Control Procedure" }],
  "5.5.1": [{ field: "organizationProcedureCode", fallback: "SOP-ORG", labelTr: "Organizasyon Prosedürü", labelEn: "Organization Procedure" }],
  "5.5.2": [{ field: "organizationProcedureCode", fallback: "SOP-ORG", labelTr: "Organizasyon Prosedürü", labelEn: "Organization Procedure" }],
  "5.6": [{ field: "managementReviewProcedureCode", fallback: "SOP-MR", labelTr: "Yönetim Gözden Geçirme Prosedürü", labelEn: "Management Review Procedure" }],
  "6.2": [{ field: "trainingProcedureCode", fallback: "SOP-HR", labelTr: "İnsan Kaynakları / Eğitim Prosedürü", labelEn: "Human Resources / Training Procedure" }],
  "7.1": [{ field: "riskManagementProcedureCode", fallback: "SOP-RM", labelTr: "Risk Yönetimi Prosedürü", labelEn: "Risk Management Procedure" }],
  "7.4": [{ field: "supplierProcedureCode", fallback: "SOP-SE", labelTr: "Tedarikçi Değerlendirme Prosedürü", labelEn: "Supplier Evaluation Procedure" }],
  "7.5.1": [{ field: "productionProcedureCode", fallback: "SOP-PC", labelTr: "Üretim Kontrol Prosedürü", labelEn: "Production Control Procedure" }],
  "7.5.5": [{ field: "sterilizationProcedureCode", fallback: "SOP-ST", labelTr: "Sterilizasyon Prosedürü", labelEn: "Sterilization Procedure" }],
  "8.2.2": [{ field: "complaintProcedureCode", fallback: "SOP-CH", labelTr: "Şikâyet Yönetimi Prosedürü", labelEn: "Complaint Handling Procedure" }],
  "8.2.3": [{ field: "vigilanceProcedureCode", fallback: "SOP-VG", labelTr: "Vijilans Prosedürü", labelEn: "Vigilance Procedure" }],
  "8.2.4": [{ field: "internalAuditProcedureCode", fallback: "SOP-IA", labelTr: "İç Tetkik Prosedürü", labelEn: "Internal Audit Procedure" }],
  "8.5.2": [{ field: "capaProcedureCode", fallback: "SOP-CAPA", labelTr: "Düzeltici Faaliyet Prosedürü", labelEn: "Corrective Action Procedure" }],
  "8.5.3": [{ field: "capaProcedureCode", fallback: "SOP-CAPA", labelTr: "Önleyici Faaliyet Prosedürü", labelEn: "Preventive Action Procedure" }],
};

export function appendClauseProcedureReferences(
  clauseNo: string,
  body: string,
  answers: Record<string, unknown>,
  bilingual: boolean,
): string {
  const refs = CLAUSE_REF_FIELDS[clauseNo];
  if (!refs?.length) return body;

  const trLines = refs.map((r) => {
    const code = sop(answers, r.field, r.fallback);
    return `${r.labelTr} ${code}`;
  });
  const enLines = refs.map((r) => {
    const code = sop(answers, r.field, r.fallback);
    return `${r.labelEn} ${code}`;
  });

  const footer = bilingual
    ? bi(`REFERANS DOKÜMANLAR:\n${trLines.join("\n")}`, `REFERENCE DOCUMENTS:\n${enLines.join("\n")}`)
    : `REFERANS DOKÜMANLAR:\n${trLines.join("\n")}`;

  return `${body.trim()}\n\n${footer}`;
}

export { QM_PROCEDURE_FIELD_TO_QMS_CODE };
