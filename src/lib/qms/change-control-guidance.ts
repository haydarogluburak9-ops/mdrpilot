/** AI prompt supplement for SOP-CC / change control procedure drafts. */

export function isChangeControlQmsDoc(code?: string | null, title?: string | null): boolean {
  if (code === "SOP-CC") return true;
  const t = (title ?? "").toLowerCase();
  return /change control|değişiklik kontrol/.test(t);
}

export function changeControlProcedureGuidance(locale: "tr" | "en"): string {
  if (locale === "tr") {
    return [
      "Bu prosedür ISO 13485 (4.1.4, 7.3.9) ile birlikte MDR Madde 120 ve MDCG 2020-3 kriterlerini baz almalı.",
      "Prosedürde aşağıdaki adımları açıkça tanımla:",
      "- Değişiklik talebi (CR) başlatma ve kayıt",
      "- Etki değerlendirmesi: KYS, tasarım, üretim, risk yönetimi (ISO 14971), klinik değerlendirme, etiket/IFU, tedarikçiler, NB bildirimi gerekliliği",
      "- Önemli değişiklik (significant change) değerlendirmesi: MDCG 2020-3 ve MDR Art. 120 — tasarım veya amaçlanan kullanımdaki değişiklikler; geçiş hükümleri kapsamında önemli/önemsiz ayrımı ve gerekçe kaydı",
      "- Onay otoritesi (Kalite Müdürü, tasarım yetkilisi, üst yönetim; NB gerektiğinde)",
      "- Uygulama, doğrulama/doğrulama (V&V) ve etkinlik kontrolü",
      "- Dokümantasyon güncellemeleri: teknik dosya, risk dosyası, DoC, PMS/PMCF, eğitim kayıtları",
      "- Kayıtlar: değişiklik talep formu, etki analizi, önemli değişiklik değerlendirme formu, onay kayıtları",
      "Referanslar bölümünde EN ISO 13485, MDR Art. 120 ve MDCG 2020-3 açıkça listelenmeli.",
      "Numaralandırma: ## 5. Prosedür altında ### 5.1, ### 5.2 …; alt maddeler 5.1.1, 5.2.1. Paralel 1./2./3. başlıkları ile 2.1/4.1 karışık numaralandırma kullanma.",
    ].join("\n");
  }
  return [
    "Base this procedure on ISO 13485 (4.1.4, 7.3.9) together with MDR Article 120 and MDCG 2020-3.",
    "Define these steps explicitly:",
    "- Change request (CR) initiation and logging",
    "- Impact assessment: QMS, design, manufacturing, risk management (ISO 14971), clinical evaluation, labeling/IFU, suppliers, Notified Body notification need",
    "- Significant change assessment per MDCG 2020-3 and MDR Art. 120 — design or intended purpose changes; significant vs non-significant under transitional provisions with documented rationale",
    "- Approval authority (Quality Manager, design authority, top management; NB when required)",
    "- Implementation, verification/validation (V&V) and effectiveness check",
    "- Documentation updates: technical file, risk file, DoC, PMS/PMCF, training records",
    "- Records: change request form, impact analysis, significant change assessment form, approval records",
    "The References section must explicitly list EN ISO 13485, MDR Art. 120 and MDCG 2020-3.",
    "Numbering: under ## 5. Procedure use ### 5.1, ### 5.2 …; sub-steps as 5.1.1, 5.2.1. Do not mix parallel 1./2./3. headings with 2.1/4.1 numbering.",
  ].join("\n");
}
