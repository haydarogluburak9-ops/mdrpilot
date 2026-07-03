/**
 * Risk Yönetim Planı 3.1.5 / 3.1.6 — teknik dosya ve ürün kartından metin birleştirme.
 */

export interface TfSectionRef {
  key: string;
  content?: string | null;
  applicable?: boolean;
}

export interface RiskPlanTfProductFields {
  materials?: string | null;
  packagingType?: string | null;
  shelfLife?: string | null;
  manufacturingProcess?: string | null;
  criticalSuppliers?: string | null;
  manufacturingSites?: string | null;
  emdnCode?: string | null;
  intendedPurpose?: string | null;
  productName?: string | null;
}

function tfSectionContent(sections: TfSectionRef[], key: string): string {
  const s = sections.find((x) => x.key === key);
  if (!s?.applicable) return "";
  return s.content?.trim() ?? "";
}

/** Markdown içinde ## alt başlık altındaki gövdeyi çıkarır. */
function extractMarkdownSubsection(md: string, headingPatterns: RegExp[]): string | null {
  if (!md.trim()) return null;
  const chunks = md.split(/\n(?=##\s)/);
  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    const heading = lines[0]?.replace(/^##\s*/, "").trim() ?? "";
    if (!heading) continue;
    if (headingPatterns.some((p) => p.test(heading))) {
      const body = lines.slice(1).join("\n").trim();
      if (body) return body;
    }
  }
  return null;
}

function extractMaterialsFromDeviceDescription(md: string): string | null {
  return extractMarkdownSubsection(md, [
    /malzemeler\s+ve\s+bileşenler/i,
    /materials\s+and\s+components/i,
  ]);
}

function extractPackagingFromInfoSupplied(md: string): string | null {
  return extractMarkdownSubsection(md, [
    /ambalaj\s+bilgileri/i,
    /packaging\s+information/i,
  ]);
}

export function buildBiocompatibilityPlanDetail(
  product: RiskPlanTfProductFields,
  sections: TfSectionRef[],
  locale: "tr" | "en" = "tr",
): string {
  const parts: string[] = [];

  if (locale === "tr") {
    parts.push(
      "Ürün biyouyumluluk değerlendirmesi ISO 10993 serisine göre yapılmıştır. Temas süresi ve temas bölgesi ürün kullanımına göre belirlenmiştir.",
    );
  } else {
    parts.push(
      "Biocompatibility evaluation is performed per the ISO 10993 series. Contact duration and tissue contact category are defined according to intended use.",
    );
  }

  if (product.materials?.trim()) {
    const label =
      locale === "tr"
        ? "Malzemeler (ürün kartı / teknik dosya cihaz tanımı)"
        : "Materials (product record / technical file device description)";
    parts.push(`${label}:\n${product.materials.trim()}`);
  }

  const deviceMaterials = extractMaterialsFromDeviceDescription(
    tfSectionContent(sections, "device-description"),
  );
  if (deviceMaterials) {
    const label =
      locale === "tr"
        ? "Teknik dosya — Malzemeler ve bileşenler"
        : "Technical file — Materials and components";
    parts.push(`${label}:\n${deviceMaterials}`);
  }

  const bioTf = tfSectionContent(sections, "biocompatibility");
  if (bioTf) {
    const label =
      locale === "tr"
        ? "Teknik dosya — Biyouyumluluk / biyolojik değerlendirme"
        : "Technical file — Biocompatibility / biological evaluation";
    parts.push(`${label}:\n${bioTf}`);
  }

  if (parts.length <= 1) {
    return locale === "tr"
      ? "[TEYİT EDİLECEK — teknik dosyada biyouyumluluk ve malzeme bilgisi doldurulmalı]"
      : "[TO BE CONFIRMED — complete biocompatibility and materials in technical file]";
  }

  return parts.join("\n\n");
}

export function buildPackagingPlanDetail(
  product: RiskPlanTfProductFields,
  sections: TfSectionRef[],
  locale: "tr" | "en" = "tr",
): string {
  const parts: string[] = [];

  parts.push(
    locale === "tr"
      ? "Steril bariyer ve ambalaj malzemeleri ISO 11607 uyumlu olarak tanımlanmıştır."
      : "Sterile barrier and packaging materials are defined per ISO 11607.",
  );

  if (product.packagingType?.trim()) {
    parts.push(
      locale === "tr"
        ? `Ambalaj tipi / sistem: ${product.packagingType.trim()}`
        : `Packaging type / system: ${product.packagingType.trim()}`,
    );
  }

  if (product.shelfLife?.trim()) {
    parts.push(
      locale === "tr"
        ? `Raf ömrü: ${product.shelfLife.trim()}`
        : `Shelf life: ${product.shelfLife.trim()}`,
    );
  }

  const packTf = tfSectionContent(sections, "packaging");
  if (packTf) {
    const label =
      locale === "tr"
        ? "Teknik dosya — Ambalaj validasyonu"
        : "Technical file — Packaging validation";
    parts.push(`${label}:\n${packTf}`);
  }

  const infoPack = extractPackagingFromInfoSupplied(tfSectionContent(sections, "info-supplied"));
  if (infoPack) {
    const label =
      locale === "tr" ? "Teknik dosya — Ambalaj bilgileri (KT/etiket)" : "Technical file — Packaging information (label/IFU)";
    parts.push(`${label}:\n${infoPack}`);
  }

  if (product.criticalSuppliers?.trim()) {
    parts.push(
      locale === "tr"
        ? `Kritik tedarikçiler (ambalaj / hammadde):\n${product.criticalSuppliers.trim()}`
        : `Critical suppliers (packaging / raw materials):\n${product.criticalSuppliers.trim()}`,
    );
  }

  if (product.manufacturingProcess?.trim()) {
    parts.push(
      locale === "tr"
        ? `Üretim süreci (ambalajlama dahil):\n${product.manufacturingProcess.trim()}`
        : `Manufacturing process (including packaging):\n${product.manufacturingProcess.trim()}`,
    );
  }

  const mfgSites = product.manufacturingSites?.trim();
  if (mfgSites) {
    parts.push(locale === "tr" ? `Üretim yeri: ${mfgSites}` : `Manufacturing site: ${mfgSites}`);
  }

  const designMfg = tfSectionContent(sections, "design-manufacturing");
  const mfgSitesTf = extractMarkdownSubsection(designMfg, [
    /üretim\s+yerleri/i,
    /manufacturing\s+sites/i,
  ]);
  if (mfgSitesTf) {
    const label =
      locale === "tr" ? "Teknik dosya — Üretim yerleri" : "Technical file — Manufacturing sites";
    parts.push(`${label}:\n${mfgSitesTf}`);
  }

  return parts.join("\n\n");
}

function scanTfForEmdnCode(sections: TfSectionRef[]): string {
  const pattern = /\bEMDN\s*(?:kodu?|code)?\s*[:：]?\s*([A-Z][A-Z0-9][A-Z0-9.-]{1,14})/i;
  for (const s of sections) {
    if (!s.applicable || !s.content?.trim()) continue;
    const m = pattern.exec(s.content);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

function emdnDescriptionFromTf(sections: TfSectionRef[]): string | null {
  for (const key of ["general-info", "device-description", "standards-list"]) {
    const content = tfSectionContent(sections, key);
    if (!content) continue;
    const block = extractMarkdownSubsection(content, [
      /emdn/i,
      /nomanklatür/i,
      /nomenclature/i,
      /cihaz\s+tanımı/i,
      /device\s+description/i,
    ]);
    if (block) return block;
    if (/emdn/i.test(content)) {
      const lines = content.split("\n").filter((l) => l.trim());
      const idx = lines.findIndex((l) => /emdn/i.test(l));
      if (idx >= 0) {
        const slice = lines.slice(idx, idx + 6).join("\n").trim();
        if (slice.length > 20) return slice;
      }
    }
  }
  return null;
}

/** 3.1.8 — EMDN kodu ve açıklama (ürün kartı + teknik dosya). */
export function buildEmdnPlanDetail(
  product: RiskPlanTfProductFields,
  sections: TfSectionRef[],
  locale: "tr" | "en" = "tr",
): string {
  const code = product.emdnCode?.trim() || scanTfForEmdnCode(sections);
  const tfDesc = emdnDescriptionFromTf(sections);
  const purpose = product.intendedPurpose?.trim();
  const parts: string[] = [];

  if (code) {
    parts.push(locale === "tr" ? `EMDN kodu: ${code}` : `EMDN code: ${code}`);
  }

  const description = tfDesc ?? purpose;
  if (description) {
    const label =
      locale === "tr"
        ? tfDesc
          ? "Teknik dosyadan EMDN / cihaz açıklaması"
          : "Açıklama (kullanım amacı)"
        : tfDesc
          ? "EMDN / device description (technical file)"
          : "Description (intended purpose)";
    parts.push(`${label}:\n${description}`);
  }

  if (!code && !description) {
    return locale === "tr"
      ? "[TEYİT EDİLECEK — ürün kartında EMDN kodu girin veya teknik dosyada EMDN bilgisini doldurun]"
      : "[TO BE CONFIRMED — enter EMDN code on product card or in technical file]";
  }

  return parts.join("\n\n");
}
