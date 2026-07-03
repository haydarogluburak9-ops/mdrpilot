import {
  buildCerDraftBannerMarkdown,
  buildLiveVerificationNoteMarkdown,
} from "@/lib/domain/clinical-cer-premium";

export function enrichCepExportMarkdown(
  body: string,
  locale: "tr" | "en",
  productName: string,
  options: { preparedAt?: string; searchDate?: string } = {},
): string {
  const tr = locale === "tr";
  const blocks: string[] = [
    tr
      ? `# Klinik Değerlendirme Planı (CEP) — ${productName}`
      : `# Clinical Evaluation Plan (CEP) — ${productName}`,
    "",
    tr
      ? "_MDCG 2020-1 · MDR Annex XIV Part A · MEDDEV 2.7/1 Rev. 4_"
      : "_MDCG 2020-1 · MDR Annex XIV Part A · MEDDEV 2.7/1 Rev. 4_",
    "",
    buildCerDraftBannerMarkdown(locale, productName, options.preparedAt),
    "",
    buildLiveVerificationNoteMarkdown(locale, options.searchDate),
    "",
    body.trim(),
    "",
    buildCepApprovalBlockMarkdown(locale),
  ];
  return blocks.join("\n").trim();
}

export function buildCepApprovalBlockMarkdown(locale: "tr" | "en"): string {
  const tr = locale === "tr";
  return [
    tr ? "## CEP onayı" : "## CEP approval",
    "",
    tr
      ? "_Aşağıdaki tablo CEP onay sürecinde doldurulur (CER onayından önce veya eşzamanlı)._"
      : "_Complete the table below during CEP approval (before or concurrent with CER)._",
    "",
    tr ? "| Rol | Ad Soyad | Tarih | İmza |" : "| Role | Name | Date | Signature |",
    "| --- | --- | --- | --- |",
    tr ? "| CEP hazırlayan | | | |" : "| CEP prepared by | | | |",
    tr ? "| Klinik değerlendirme sorumlusu | | | |" : "| Clinical evaluation lead | | | |",
    tr ? "| PRRC / Onaylayan | | | |" : "| PRRC / Approved by | | | |",
    "",
    tr ? "### Revizyon geçmişi" : "### Revision history",
    "",
    tr ? "| Rev | Tarih | Değişiklik | Hazırlayan |" : "| Rev | Date | Change | Author |",
    "| --- | --- | --- | --- |",
    tr ? "| 01 | | İlk MDRpilot CEP taslağı | |" : "| 01 | | Initial MDRpilot CEP draft | |",
  ].join("\n");
}
