/** AI prompt supplement for SOP-ORG / organization procedure drafts. */

export function isOrganizationQmsDoc(code?: string | null, title?: string | null): boolean {
  if (code === "SOP-ORG") return true;
  const t = (title ?? "").toLowerCase();
  return /organization.*role|organizasyon.*rol|rol.*sorumluluk|roles.*responsibilities/.test(t);
}

export function organizationProcedureGuidance(locale: "tr" | "en"): string {
  if (locale === "tr") {
    return [
      "Bu prosedür ISO 13485 madde 5.5 (sorumluluk, yetki ve iletişim) ile uyumlu olmalı.",
      "Zorunlu bölümler:",
      "- 5.1 Organizasyon yapısı: KYS organizasyonunun amacı, üst yönetim taahhüdü, raporlama ilişkileri, kapsam bağlantısı (3-5 paragraf).",
      "- 5.2 Organizasyon şeması: hiyerarşik ağaç (Genel Müdür üstte; altında Kalite Müdürü, Üretim, Satın Alma vb. dallar; Kalite Müdürü altında iç denetim, şikâyet, yönetim gözden geçirme). Satırları ├── ve │ ile yaz (Word çıktısında kutu şemasına dönüşür). Rol ünvanları kullan; kişi adları bu prosedürde yazılmaz.",
      "- 5.3 Roller ve sorumluluklar: tablo KULLANMA. Her rol için ### alt başlık, altında numaralı liste (5-6 madde); her madde tam cümle ile görev/sorumluluk açıklaması. Kişi adı yazılmaz; atamalar FOR-ORG formunda.",
      "- Kayıtlar: FOR-ORG Rol Atama Formu, organizasyon şeması çıktısı, yetki devri kayıtları.",
      "Referanslar: EN ISO 13485:2016 madde 5.5; kalite el kitabı organizasyon bölümü.",
    ].join("\n");
  }
  return [
    "Align with ISO 13485 clause 5.5 (responsibility, authority and communication).",
    "Required sections:",
    "- 5.1 Organization structure: QMS organization purpose, management commitment, reporting lines, scope link (3-5 paragraphs).",
      "- 5.2 Organization chart: hierarchical tree (General Manager at top; branches for Quality, Production, Purchasing, etc.; under Quality Manager: internal audit, complaints, management review). Use ├── and │ line prefixes (rendered as boxed chart in Word). Role titles only — no assignee names in the procedure.",
      "- 5.3 Roles and responsibilities: do NOT use a table. Each role as ### subheading with numbered list (5-6 items); each item a full sentence describing the duty. No assignee names — assignments on FOR-ORG form.",
    "- Records: FOR-ORG Role Assignment Form, organization chart output, delegation records.",
    "References: EN ISO 13485:2016 clause 5.5; quality manual organization section.",
  ].join("\n");
}
