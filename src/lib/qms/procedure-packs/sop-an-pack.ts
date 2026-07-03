import type { KysStructureTemplate } from "../kys-structure";

/** SOP-AN child documents scaffolded under Danışma / FSCA procedure. */
export const SOP_AN_CHILDREN: KysStructureTemplate[] = [
  {
    code: "DIA-AN-01",
    title: "Advisory vs FSCA Decision Flow and Reporting Timelines",
    layer: "DIAGRAM",
    clauseRefs: "8.3.3 / MDR Art. 87-90",
    parentProcedureCode: "SOP-AN",
  },
  {
    code: "FORM-AN-01",
    title: "FSCA Initiation and Initial Assessment Form",
    layer: "FORM",
    clauseRefs: "8.3.3",
    parentProcedureCode: "SOP-AN",
  },
  {
    code: "FORM-AN-02",
    title: "Field Safety Notice (FSN) Template",
    layer: "FORM",
    clauseRefs: "8.3.3 / MDR Art. 95",
    parentProcedureCode: "SOP-AN",
  },
  {
    code: "FORM-AN-03",
    title: "Advisory Notice Template",
    layer: "FORM",
    clauseRefs: "8.3.3",
    parentProcedureCode: "SOP-AN",
  },
  {
    code: "FORM-AN-04",
    title: "FSN Distribution and Read-Receipt Log",
    layer: "FORM",
    clauseRefs: "8.3.3",
    parentProcedureCode: "SOP-AN",
  },
  {
    code: "FORM-AN-05",
    title: "RMA / Return / Recall Tracking Form",
    layer: "FORM",
    clauseRefs: "8.3.3 / 7.5.9",
    parentProcedureCode: "SOP-AN",
  },
  {
    code: "FORM-AN-06",
    title: "FSCA Effectiveness Verification Checklist",
    layer: "FORM",
    clauseRefs: "8.3.3 / 8.5.2",
    parentProcedureCode: "SOP-AN",
  },
  {
    code: "WI-AN-01",
    title: "EUDAMED and National Portal FSCA Reporting Work Instruction",
    layer: "INSTRUCTION",
    clauseRefs: "8.3.3 / MDR Art. 95",
    parentProcedureCode: "SOP-AN",
  },
  {
    code: "LIST-AN-01",
    title: "Customer / Distributor FSN Contact List",
    layer: "LIST",
    clauseRefs: "8.3.3",
    parentProcedureCode: "SOP-AN",
  },
  {
    code: "REC-AN-01",
    title: "Sample Completed FSCA Case Record (Mock Recall)",
    layer: "RECORD",
    clauseRefs: "4.2.5 / 8.3.3",
    parentProcedureCode: "SOP-AN",
  },
];

/**
 * Existing KYS documents that should also appear under SOP-AN (single controlled copy).
 * Key = document code, value = additional procedure codes.
 */
export const SOP_AN_SHARED_LINKS: Record<string, string[]> = {
  "FORM-CH-01": ["SOP-AN"],
  "FORM-CAPA-01": ["SOP-AN"],
  "FORM-NCP-01": ["SOP-AN"],
};

/** Auto AI prompts per child — product-specific fields filled from company portfolio. */
export const SOP_AN_CHILD_AI_HINTS: Record<string, { tr: string; en: string }> = {
  "DIA-AN-01": {
    tr: "Kontrollü akış şeması — prosedür metni yazma. Advisory vs FSCA karar ağacı; MDR bildirim süreleri (2/10/15 gün); FORM-AN ve WI-AN kodları kutularda.",
    en: "Controlled flowchart — no procedure narrative. Advisory vs FSCA decision tree; MDR timelines (2/10/15 days); FORM-AN and WI-AN codes in boxes.",
  },
  "FORM-AN-01": {
    tr: "FSCA başlatma formu: olay no, tarih, ürün adı/model/UDI/lot, şikâyet ref (FORM-CH-01), ilk risk değerlendirmesi, geçici kontrol, karar (Advisory/FSCA), sorumlular, onay. Örnek satırda portföydeki gerçek bir ürün adı kullan.",
    en: "FSCA initiation form: event no, date, product name/model/UDI/lot, complaint ref (FORM-CH-01), initial risk assessment, interim control, decision (Advisory/FSCA), owners, approval. Use a real portfolio product name in sample row.",
  },
  "FORM-AN-02": {
    tr: "FSN şablonu: ürün tanımı, UDI, lot/seri, sorun ve risk açıklaması, kullanıcı eylemi, takvim, iletişim, ekler, iade teyit. Portföydeki ana ürün için doldurulmuş örnek bölüm ekle.",
    en: "FSN template: device description, UDI, lot/serial, problem and risk, user actions, timeline, contacts, attachments, return acknowledgement. Include filled example section for main portfolio product.",
  },
  "FORM-AN-03": {
    tr: "Advisory Notice şablonu — emniyet riski olmayan netleştirme/lojistik duyuruları için. FSN'den daha hafif format.",
    en: "Advisory Notice template for non-safety clarifications/logistics. Lighter format than FSN.",
  },
  "FORM-AN-04": {
    tr: "Dağıtım listesi: alıcı, ülke, gönderim tarihi, kanal, teslim teyidi, okundu onayı, sorumlu. Örnek distribütör satırları.",
    en: "Distribution log: recipient, country, dispatch date, channel, delivery confirmation, read receipt, owner. Sample distributor rows.",
  },
  "FORM-AN-05": {
    tr: "RMA/iade/geri çağırma takip: RMA no, ürün/lot, adet, iade durumu, karantina, imha/onarım, izlenebilirlik ref (SOP-TR).",
    en: "RMA/return/recall tracking: RMA no, product/lot, qty, return status, quarantine, disposal/repair, traceability ref (SOP-TR).",
  },
  "FORM-AN-06": {
    tr: "Etkililik doğrulama checklist: dağıtım kapsamı %, iade/aksiyon tamamlama %, numune kontrol, KPI hedefleri (≥%90 teslim, ≥%95 aksiyon).",
    en: "Effectiveness verification checklist: distribution coverage %, return/action completion %, sample checks, KPI targets (≥90% delivery, ≥95% action).",
  },
  "WI-AN-01": {
    tr: "EUDAMED ve TİTCK/ulusal portal adım adım bildirim talimatı: giriş, alanlar, ekler, makbuz kaydı, süre takibi. SRN ve NB bilgilerini firma profilinden kullan.",
    en: "Step-by-step EUDAMED and national portal reporting WI: login, fields, attachments, receipt logging, deadline tracking. Use SRN and NB from company profile.",
  },
  "LIST-AN-01": {
    tr: "Müşteri/distribütör/saha iletişim listesi: firma, ülke, iletişim, FSN kanalı, güncelleme tarihi. Portföy pazarlarına uygun örnek satırlar.",
    en: "Customer/distributor/field contact list: company, country, contact, FSN channel, update date. Sample rows aligned with portfolio markets.",
  },
  "REC-AN-01": {
    tr: "Dolu örnek FSCA vaka kaydı (mock recall): portföydeki bir ürün için kurgusal ama gerçekçi senaryo — tetikleyici şikâyet, karar, FSN, iade oranı, kapanış, CAPA ref (FORM-CAPA-01).",
    en: "Completed sample FSCA case (mock recall): realistic fictional scenario for one portfolio product — trigger complaint, decision, FSN, return rate, closure, CAPA ref (FORM-CAPA-01).",
  },
};

export const SOP_AN_PROCEDURE_CODE = "SOP-AN";
