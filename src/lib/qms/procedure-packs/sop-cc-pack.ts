import type { KysStructureTemplate } from "../kys-structure";

/** SOP-CC child documents — change control forms, register and process flow. */
export const SOP_CC_CHILDREN: KysStructureTemplate[] = [
  {
    code: "DIA-CC-01",
    title: "Change Control Process Flow",
    layer: "DIAGRAM",
    clauseRefs: "4.1.4 / MDR Art. 120",
    parentProcedureCode: "SOP-CC",
  },
  {
    code: "FORM-CC-01",
    title: "Change Request (CR) Form",
    layer: "FORM",
    clauseRefs: "4.1.4",
    parentProcedureCode: "SOP-CC",
  },
  {
    code: "FORM-CC-02",
    title: "Change Impact Assessment Form",
    layer: "FORM",
    clauseRefs: "4.1.4 / 7.3.9",
    parentProcedureCode: "SOP-CC",
  },
  {
    code: "FORM-CC-03",
    title: "Significant Change Assessment Form (MDCG 2020-3)",
    layer: "FORM",
    clauseRefs: "MDR Art. 120 / MDCG 2020-3",
    parentProcedureCode: "SOP-CC",
  },
  {
    code: "LIST-CC-01",
    title: "Change Register",
    layer: "LIST",
    clauseRefs: "4.1.4",
    parentProcedureCode: "SOP-CC",
  },
  {
    code: "REC-CC-01",
    title: "Sample Completed Change Request Record",
    layer: "RECORD",
    clauseRefs: "4.2.5 / 4.1.4",
    parentProcedureCode: "SOP-CC",
  },
];

export const SOP_CC_PROCEDURE_CODE = "SOP-CC";

export const SOP_CC_CHILD_AI_HINTS: Record<string, { tr: string; en: string }> = {
  "DIA-CC-01": {
    tr: "Değişiklik kontrol süreç akışı: CR açılışı (FORM-CC-01) → etki (FORM-CC-02) → önemli değişiklik (FORM-CC-03) → onay → uygulama → kapanış; NB bildirimi dalı.",
    en: "Change control flow: CR open (FORM-CC-01) → impact (FORM-CC-02) → significant change (FORM-CC-03) → approval → implementation → closure; NB notification branch.",
  },
  "FORM-CC-01": {
    tr: "Değişiklik talebi formu: CR no, tarih, başlatan, etkilenen ürün/süreç/doküman, gerekçe, aciliyet, geçici kontrol, sorumlular, onay.",
    en: "Change request form: CR no, date, initiator, affected product/process/document, rationale, urgency, interim control, owners, approval.",
  },
  "FORM-CC-02": {
    tr: "Etki değerlendirme formu: KYS, tasarım/V&V, risk (ISO 14971), üretim, tedarikçi, etiket/IFU, klinik, NB bildirimi — EVET/HAYIR matrisi.",
    en: "Impact assessment form: QMS, design/V&V, risk (ISO 14971), manufacturing, supplier, label/IFU, clinical, NB notification — YES/NO matrix.",
  },
  "FORM-CC-03": {
    tr: "Önemli değişiklik formu (MDCG 2020-3): tasarım/amaçlanan kullanım değişikliği, önemli/önemsiz kararı, geçiş hükümleri, NB görüşü, PRRC onayı.",
    en: "Significant change form (MDCG 2020-3): design/intended purpose change, significant vs non-significant decision, transitional provisions, NB opinion, PRRC approval.",
  },
  "LIST-CC-01": {
    tr: "Değişiklik kayıt defteri: CR no, açıklama, durum (açık/onay/uygulama/kapalı), sorumlu, hedef tarih, revizyon ref.",
    en: "Change register: CR no, description, status (open/approved/implementing/closed), owner, target date, revision ref.",
  },
  "REC-CC-01": {
    tr: "Dolu örnek CR kaydı: etiket metni revizyonu senaryosu — FORM-CC-01/02 doldurulmuş, onay imzaları, kapanış kanıtı.",
    en: "Completed sample CR record: label text revision scenario — filled FORM-CC-01/02, approval signatures, closure evidence.",
  },
};
