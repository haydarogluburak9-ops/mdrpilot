/** Maps Quality Manual wizard procedure fields to KYS register codes (ISO 13485). */
export const QM_PROCEDURE_FIELD_TO_QMS_CODE: Record<string, string> = {
  documentControlProcedureCode: "SOP-DC",
  recordControlProcedureCode: "SOP-RC",
  riskManagementProcedureCode: "SOP-RM",
  capaProcedureCode: "SOP-CAPA",
  complaintProcedureCode: "SOP-CH",
  internalAuditProcedureCode: "SOP-IA",
  managementReviewProcedureCode: "SOP-MR",
  organizationProcedureCode: "SOP-ORG",
  supplierProcedureCode: "SOP-SE",
  productionProcedureCode: "SOP-PC",
  sterilizationProcedureCode: "SOP-ST",
  trainingProcedureCode: "SOP-HR",
  vigilanceProcedureCode: "SOP-VG",
  changeControlProcedureCode: "SOP-CC",
};

/** Catalog metadata for manual-level procedure references (no procedure body text). */
export const QM_PROCEDURE_CATALOG: Array<{
  fieldKey: string;
  code: string;
  titleTr: string;
  titleEn: string;
  clause: string;
  manualRoleTr: string;
  manualRoleEn: string;
}> = [
  {
    fieldKey: "documentControlProcedureCode",
    code: "SOP-DC",
    titleTr: "Doküman Kontrol Prosedürü",
    titleEn: "Document Control Procedure",
    clause: "4.2.4",
    manualRoleTr: "Onay, revizyon, dağıtım ve geçersiz kopyaların kontrolü — detay prosedürde.",
    manualRoleEn: "Approval, revision, distribution and obsolete copy control — details in procedure.",
  },
  {
    fieldKey: "recordControlProcedureCode",
    code: "SOP-RC",
    titleTr: "Kayıt Kontrol Prosedürü",
    titleEn: "Record Control Procedure",
    clause: "4.2.5",
    manualRoleTr: "Kayıt tanımlama, saklama ve erişim — detay prosedürde.",
    manualRoleEn: "Record identification, retention and access — details in procedure.",
  },
  {
    fieldKey: "organizationProcedureCode",
    code: "SOP-ORG",
    titleTr: "Organizasyon ve Sorumluluklar Prosedürü",
    titleEn: "Organization and Responsibilities Procedure",
    clause: "5.5",
    manualRoleTr: "Rol, yetki ve iletişim hatları — detay prosedürde.",
    manualRoleEn: "Roles, authority and communication lines — details in procedure.",
  },
  {
    fieldKey: "riskManagementProcedureCode",
    code: "SOP-RM",
    titleTr: "Risk Yönetimi Prosedürü",
    titleEn: "Risk Management Procedure",
    clause: "4.1.3 / 7.1",
    manualRoleTr: "Ürün risk süreci ISO 14971 ile entegrasyon — detay prosedürde.",
    manualRoleEn: "Product risk process integrated with ISO 14971 — details in procedure.",
  },
  {
    fieldKey: "capaProcedureCode",
    code: "SOP-CAPA",
    titleTr: "Düzeltici ve Önleyici Faaliyet Prosedürü",
    titleEn: "Corrective and Preventive Action Procedure",
    clause: "8.5.2 / 8.5.3",
    manualRoleTr: "DÖF akışı ve etkinlik doğrulama — detay prosedürde.",
    manualRoleEn: "CAPA workflow and effectiveness verification — details in procedure.",
  },
  {
    fieldKey: "complaintProcedureCode",
    code: "SOP-CH",
    titleTr: "Şikâyet Yönetimi Prosedürü",
    titleEn: "Complaint Handling Procedure",
    clause: "8.2.2",
    manualRoleTr: "Şikâyet kaydı, değerlendirme ve raporlama — detay prosedürde.",
    manualRoleEn: "Complaint logging, evaluation and reporting — details in procedure.",
  },
  {
    fieldKey: "internalAuditProcedureCode",
    code: "SOP-IA",
    titleTr: "İç Tetkik Prosedürü",
    titleEn: "Internal Audit Procedure",
    clause: "8.2.4",
    manualRoleTr: "Tetkik planı, yürütme ve takip — detay prosedürde.",
    manualRoleEn: "Audit planning, execution and follow-up — details in procedure.",
  },
  {
    fieldKey: "managementReviewProcedureCode",
    code: "SOP-MR",
    titleTr: "Yönetim Gözden Geçirme Prosedürü",
    titleEn: "Management Review Procedure",
    clause: "5.6",
    manualRoleTr: "Periyodik gözden geçirme girdileri ve çıktıları — detay prosedürde.",
    manualRoleEn: "Periodic review inputs and outputs — details in procedure.",
  },
  {
    fieldKey: "supplierProcedureCode",
    code: "SOP-SE",
    titleTr: "Tedarikçi Değerlendirme Prosedürü",
    titleEn: "Supplier Evaluation Procedure",
    clause: "7.4",
    manualRoleTr: "Tedarikçi seçimi, izleme ve yeniden değerlendirme — detay prosedürde.",
    manualRoleEn: "Supplier selection, monitoring and re-evaluation — details in procedure.",
  },
  {
    fieldKey: "productionProcedureCode",
    code: "SOP-PC",
    titleTr: "Üretim Kontrol Prosedürü",
    titleEn: "Production Control Procedure",
    clause: "7.5",
    manualRoleTr: "Üretim planlama, izlenebilirlik ve serbest bırakma — detay prosedürde.",
    manualRoleEn: "Production planning, traceability and release — details in procedure.",
  },
  {
    fieldKey: "sterilizationProcedureCode",
    code: "SOP-ST",
    titleTr: "Sterilizasyon Prosedürü",
    titleEn: "Sterilization Procedure",
    clause: "7.5.5",
    manualRoleTr: "Sterilizasyon validasyonu ve izleme — detay prosedürde.",
    manualRoleEn: "Sterilization validation and monitoring — details in procedure.",
  },
  {
    fieldKey: "trainingProcedureCode",
    code: "SOP-HR",
    titleTr: "İnsan Kaynakları / Eğitim Prosedürü",
    titleEn: "Human Resources / Training Procedure",
    clause: "6.2",
    manualRoleTr: "Yetkinlik, eğitim ve farkındalık — detay prosedürde.",
    manualRoleEn: "Competence, training and awareness — details in procedure.",
  },
  {
    fieldKey: "vigilanceProcedureCode",
    code: "SOP-VG",
    titleTr: "Vijilans Prosedürü",
    titleEn: "Vigilance Procedure",
    clause: "8.2.3",
    manualRoleTr: "Düzenleyici bildirim ve geri bildirim — detay prosedürde.",
    manualRoleEn: "Regulatory notification and feedback — details in procedure.",
  },
  {
    fieldKey: "changeControlProcedureCode",
    code: "SOP-CC",
    titleTr: "Değişiklik Kontrol Prosedürü",
    titleEn: "Change Control Procedure",
    clause: "4.1.4 / 7.3.7",
    manualRoleTr: "KYS ve ürün değişikliklerinin planlı yönetimi — detay prosedürde.",
    manualRoleEn: "Planned control of QMS and product changes — details in procedure.",
  },
];

export interface QmsDocCodeRef {
  code: string | null;
}

function fieldValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/** Fill procedure code fields from the company's KYS register when codes exist. */
export function mergeProcedureCodesFromQms(
  answers: Record<string, unknown>,
  qmsDocs: QmsDocCodeRef[],
  onlyFillEmpty = true,
): Record<string, unknown> {
  const knownCodes = new Set(
    qmsDocs.map((d) => d.code).filter((c): c is string => Boolean(c?.trim())),
  );
  if (knownCodes.size === 0) return answers;

  const merged = { ...answers };
  for (const [fieldKey, sopCode] of Object.entries(QM_PROCEDURE_FIELD_TO_QMS_CODE)) {
    if (!knownCodes.has(sopCode)) continue;
    if (onlyFillEmpty && fieldValue(merged[fieldKey])) continue;
    merged[fieldKey] = sopCode;
  }
  return merged;
}
