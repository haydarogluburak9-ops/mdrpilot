/** CER / CEP export document metadata (MDR Annex XIV / MEDDEV 2.7/1 / MDCG 2020-1). */
export const CLINICAL_FORM_META = {
  cer: {
    formNo: "FORM-CER-01",
    rev: "01",
    titleTr: "Klinik Değerlendirme Raporu",
    titleEn: "Clinical Evaluation Report",
    annexRef: "MDR Annex XIV Part A / MEDDEV 2.7/1 Rev. 4",
  },
  cep: {
    formNo: "FORM-CEP-01",
    rev: "01",
    titleTr: "Klinik Değerlendirme Planı",
    titleEn: "Clinical Evaluation Plan",
    annexRef: "MDR Annex XIV Part A / MDCG 2020-1",
  },
} as const;
