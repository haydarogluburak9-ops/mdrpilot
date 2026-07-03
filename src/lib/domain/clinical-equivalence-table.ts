import { flattenDeclarationModels } from "@/lib/exports/declaration-models";
import { sterilizationText } from "@/lib/domain/sterilization";
import type { EquivalentDeviceRecord } from "@/lib/domain/clinical-equivalent-model";

export type EquivalenceTableSection = "technical" | "biological" | "clinical";

export interface EquivalenceComparisonFields {
  dimensions: string;
  rawMaterial: string;
  biocompatibility: string;
  sterilizationMethod: string;
  intendedUse: string;
  reusability: string;
  bodyContactArea: string;
  patientPopulation: string;
  shelfLife: string;
  userProfile: string;
  contactDuration: string;
  indications: string;
}

export interface EquivalenceSubjectProduct {
  name: string;
  brand?: string | null;
  model?: string | null;
  variantsJson?: unknown;
  emdnCode?: string | null;
  intendedPurpose?: string | null;
  indications?: string | null;
  patientPopulation?: string | null;
  userProfile?: string | null;
  materials?: string | null;
  shelfLife?: string | null;
  bodyContactDuration?: string | null;
  isSterile?: boolean;
  sterilization?: string | null;
  isReusable?: boolean;
  isInvasive?: boolean;
  photoKey?: string | null;
}

export interface EquivalenceTableRowSpec {
  section: EquivalenceTableSection;
  feature: string;
  subject: string;
  equivalent: string;
  kind: "text" | "image";
}

export interface EquivalenceTableDocxSpec {
  locale: "tr" | "en";
  title: string;
  sidebarLabel: string;
  subjectName: string;
  equivalentName: string;
  subjectPhotoBase64?: string;
  equivalentPhotoBase64?: string;
  evidenceScreenshots?: { base64: string; caption: string }[];
  rows: EquivalenceTableRowSpec[];
}

export const EQUIV_TABLE_MARKER_PREFIX = "<!--MEDDOC_EQUIV_TABLE:";

const SECTION_LABEL: Record<EquivalenceTableSection, { tr: string; en: string }> = {
  technical: { tr: "TEKNİK ÖZELLİKLER", en: "TECHNICAL CHARACTERISTICS" },
  biological: { tr: "BİYOLOJİK ÖZELLİKLER", en: "BIOLOGICAL CHARACTERISTICS" },
  clinical: { tr: "KLİNİK ÖZELLİKLER", en: "CLINICAL CHARACTERISTICS" },
};

const FEATURE_LABEL: Record<
  keyof EquivalenceComparisonFields | "equivalence" | "productImages",
  { tr: string; en: string }
> = {
  equivalence: { tr: "EŞDEĞERLİK", en: "EQUIVALENCE" },
  productImages: { tr: "ÜRÜN RESİMLERİ", en: "PRODUCT IMAGES" },
  dimensions: { tr: "BOYUTLARI", en: "DIMENSIONS" },
  rawMaterial: { tr: "HAMMADDE BİLGİSİ", en: "RAW MATERIAL" },
  biocompatibility: { tr: "BİYOUYUMLULUK", en: "BIOCOMPATIBILITY" },
  sterilizationMethod: { tr: "STERİLİZASYON METODU", en: "STERILIZATION METHOD" },
  intendedUse: { tr: "KULLANIM AMACI", en: "INTENDED USE" },
  reusability: { tr: "YENİDEN KULLANILABİLİRLİK", en: "REUSABILITY" },
  bodyContactArea: { tr: "KULLANIM BÖLGESİ", en: "BODY CONTACT / USE SITE" },
  patientPopulation: { tr: "HASTA POPÜLASYONU", en: "PATIENT POPULATION" },
  shelfLife: { tr: "ÜRÜN ÖMRÜ", en: "SHELF LIFE" },
  userProfile: { tr: "UYGULAYICI PROFİLİ", en: "USER PROFILE" },
  contactDuration: { tr: "TEMAS SÜRESİ", en: "CONTACT DURATION" },
  indications: { tr: "ENDİKASYONLAR", en: "INDICATIONS" },
};

function dash(v: string | null | undefined): string {
  const t = v?.trim();
  return t || "—";
}

function contactDurationLabel(raw: string | null | undefined, tr: boolean): string {
  const v = raw?.trim().toLowerCase();
  if (!v) return tr ? "< 24 SAAT" : "< 24 HOURS";
  if (v.includes("transient") || v.includes("geçici")) return tr ? "Geçici (< 60 dk)" : "Transient (< 60 min)";
  if (v.includes("short") || v.includes("kısa")) return tr ? "Kısa süreli (< 24 saat)" : "Short-term (< 24 h)";
  if (v.includes("long") || v.includes("uzun")) return tr ? "Uzun süreli (> 24 saat)" : "Long-term (> 24 h)";
  return raw!.trim();
}

function formatSterilizationDisplay(
  product: Pick<EquivalenceSubjectProduct, "isSterile" | "sterilization" | "variantsJson">,
  tr: boolean,
): string {
  const methods = sterilizationText(product);
  if (!methods) return tr ? "Steril değil" : "Non-sterile";
  const parts = methods
    .split(/,\s*/)
    .map((m) => {
      if (m === "GAMMA") return "Gamma";
      if (m === "EO") return "ETO";
      if (m === "STEAM") return tr ? "Buhar" : "Steam";
      return m;
    });
  return parts.join("/ ");
}

function dimensionsFromProduct(product: EquivalenceSubjectProduct): string {
  const rows = flattenDeclarationModels(
    product.name,
    product.variantsJson,
    product.emdnCode,
    product.model,
    product.brand,
  );
  const primaryBrand = product.brand?.trim();
  const filtered =
    primaryBrand && rows.length > 1
      ? rows.filter(
          (r) =>
            r.modelName.startsWith(`${primaryBrand} –`) ||
            r.modelName.startsWith(`${primaryBrand} -`),
        )
      : rows;
  const models = (filtered.length ? filtered : rows)
    .map((r) => r.modelName)
    .filter((m) => m && m !== "[MODEL]");
  if (models.length) return models.join("\n");
  if (product.model?.trim()) return product.model.trim();
  return "—";
}

export function formatPredicateDimensions(
  device: EquivalentDeviceRecord,
  locale: "tr" | "en",
): string {
  const tr = locale === "tr";
  const parts: string[] = [];
  if (device.model?.trim()) parts.push(device.model.trim());
  if (device.regulatoryRef?.trim()) parts.push(device.regulatoryRef.trim());
  if (device.fdaKNumber?.trim()) {
    const k = device.fdaKNumber.replace(/^K/i, "");
    parts.push(`FDA 510(k) K${k}`);
  }
  if (parts.length) return parts.join("\n");
  return tr
    ? "Predicate model / katalog — 510(k) özet ve IFU’den girin"
    : "Predicate model / catalog — enter from 510(k) summary and IFU";
}

function bodyContactAreaFromProduct(product: EquivalenceSubjectProduct, tr: boolean): string {
  const blob = `${product.name} ${product.indications ?? ""} ${product.intendedPurpose ?? ""}`.toLowerCase();
  if (/göz|oftalm|ophthalm|kornea|cornea|sklera|sclera/.test(blob)) {
    return tr ? "Göz dokusu" : "Eye tissue";
  }
  if (product.isInvasive) return tr ? "Vücut dokusu (invaziv temas)" : "Body tissue (invasive contact)";
  return tr ? "Uygulama bölgesine göre" : "Per application site";
}

function defaultBiocompatibility(tr: boolean): string {
  return tr
    ? "EN ISO 10993-1'e göre biyouyumlu kabul edilir; sitotoksisite, duyarlılaşma ve cilt irritasyon testlerinden geçmiştir."
    : "Considered biocompatible per EN ISO 10993-1; cytotoxicity, sensitisation and skin irritation testing passed.";
}

function defaultPatientPopulation(tr: boolean): string {
  return tr
    ? "Kontrendikasyonları olmayan tüm hastalar."
    : "All patients except those with contraindications.";
}

function defaultUserProfile(tr: boolean): string {
  return tr ? "Uzman hekimler tarafından kullanılmak üzere tasarlanmıştır." : "Designed for use by specialist physicians.";
}

export function buildSubjectComparisonFields(
  product: EquivalenceSubjectProduct,
  locale: "tr" | "en",
): EquivalenceComparisonFields {
  const tr = locale === "tr";
  const purpose = product.intendedPurpose?.trim() || product.indications?.trim() || product.name;
  return {
    dimensions: dimensionsFromProduct(product),
    rawMaterial: dash(product.materials) !== "—" ? product.materials!.trim() : tr ? "—" : "—",
    biocompatibility: defaultBiocompatibility(tr),
    sterilizationMethod: formatSterilizationDisplay(product, tr),
    intendedUse: purpose,
    reusability: product.isReusable
      ? tr
        ? "Yeniden işlenebilir (reprocessing doğrulanmalı)"
        : "Reusable (reprocessing validated)"
      : tr
        ? "Tek kullanımlık"
        : "Single-use",
    bodyContactArea: bodyContactAreaFromProduct(product, tr),
    patientPopulation: dash(product.patientPopulation) !== "—" ? product.patientPopulation!.trim() : defaultPatientPopulation(tr),
    shelfLife: dash(product.shelfLife) !== "—" ? product.shelfLife!.trim() : tr ? "5 yıl" : "5 years",
    userProfile: dash(product.userProfile) !== "—" ? product.userProfile!.trim() : defaultUserProfile(tr),
    contactDuration: contactDurationLabel(product.bodyContactDuration, tr),
    indications: dash(product.indications) !== "—" ? product.indications!.trim() : purpose,
  };
}

export function resolveDeviceComparisonFields(
  device: EquivalentDeviceRecord,
  subject: EquivalenceComparisonFields,
  locale: "tr" | "en",
): EquivalenceComparisonFields {
  const tr = locale === "tr";
  const predicate = Boolean(device.preparedByMedDoc || device.liveVerified || device.fdaKNumber);

  const pickPredicate = (
    deviceVal: string | undefined,
    placeholderTr: string,
    placeholderEn: string,
  ) => {
    const d = deviceVal?.trim();
    if (d) return d;
    if (predicate) return tr ? placeholderTr : placeholderEn;
    return tr ? placeholderTr : placeholderEn;
  };

  const predicateDimensions =
    device.dimensions?.trim() || (predicate ? formatPredicateDimensions(device, locale) : "");

  return {
    dimensions: pickPredicate(
      predicateDimensions,
      "Predicate boyut/model — IFU veya 510(k) özetinden",
      "Predicate dimensions/model — from IFU or 510(k) summary",
    ),
    rawMaterial: pickPredicate(
      device.rawMaterial,
      "Predicate materyal — IFU / teknik dosyadan",
      "Predicate material — from IFU / technical file",
    ),
    biocompatibility: pickPredicate(
      device.biocompatibility,
      "ANSI/AAMI/ISO 10993 — predicate kanıtı ile doğrulanacak",
      "ANSI/AAMI/ISO 10993 — verify against predicate evidence",
    ),
    sterilizationMethod: pickPredicate(
      device.sterilizationMethod,
      "Predicate sterilizasyon — IFU’den",
      "Predicate sterilization — from IFU",
    ),
    intendedUse: device.intendedUse?.trim() || subject.intendedUse,
    reusability: pickPredicate(
      device.reusability,
      "Predicate kullanım tipi — IFU’den",
      "Predicate use type — from IFU",
    ),
    bodyContactArea: pickPredicate(
      device.bodyContactArea,
      "Predicate temas bölgesi — IFU’den",
      "Predicate contact site — from IFU",
    ),
    patientPopulation: pickPredicate(
      device.patientPopulation,
      "Predicate hasta popülasyonu — IFU’den",
      "Predicate patient population — from IFU",
    ),
    shelfLife: pickPredicate(
      device.shelfLife,
      "Predicate raf ömrü — IFU’den",
      "Predicate shelf life — from IFU",
    ),
    userProfile: pickPredicate(
      device.userProfile,
      "Predicate kullanıcı profili — IFU’den",
      "Predicate user profile — from IFU",
    ),
    contactDuration: pickPredicate(
      device.contactDuration,
      "Predicate temas süresi — IFU’den",
      "Predicate contact duration — from IFU",
    ),
    indications: pickPredicate(
      device.indications,
      "Predicate endikasyon — IFU’den",
      "Predicate indications — from IFU",
    ),
  };
}

export function buildEquivalenceTableSpec(
  product: EquivalenceSubjectProduct,
  device: EquivalentDeviceRecord,
  locale: "tr" | "en",
  photos?: { subject?: Buffer | null; equivalent?: Buffer | null },
): EquivalenceTableDocxSpec {
  const tr = locale === "tr";
  const subject = buildSubjectComparisonFields(product, locale);
  const equiv = resolveDeviceComparisonFields(device, subject, locale);
  const subjectName = product.name.toUpperCase();
  const equivalentName = device.deviceName.trim() || (tr ? "Eşdeğer cihaz" : "Equivalent device");

  const rows: EquivalenceTableRowSpec[] = [
    {
      section: "technical",
      feature: FEATURE_LABEL.equivalence[locale],
      subject: tr ? "Kendi Ürünümüz" : "Our product",
      equivalent: tr ? "Eşdeğer Ürün" : "Equivalent product",
      kind: "text",
    },
    {
      section: "technical",
      feature: FEATURE_LABEL.productImages[locale],
      subject: "",
      equivalent: "",
      kind: "image",
    },
    {
      section: "technical",
      feature: FEATURE_LABEL.dimensions[locale],
      subject: subject.dimensions,
      equivalent: equiv.dimensions,
      kind: "text",
    },
    {
      section: "biological",
      feature: FEATURE_LABEL.rawMaterial[locale],
      subject: subject.rawMaterial,
      equivalent: equiv.rawMaterial,
      kind: "text",
    },
    {
      section: "biological",
      feature: FEATURE_LABEL.biocompatibility[locale],
      subject: subject.biocompatibility,
      equivalent: equiv.biocompatibility,
      kind: "text",
    },
    {
      section: "biological",
      feature: FEATURE_LABEL.sterilizationMethod[locale],
      subject: subject.sterilizationMethod,
      equivalent: equiv.sterilizationMethod,
      kind: "text",
    },
    {
      section: "clinical",
      feature: FEATURE_LABEL.intendedUse[locale],
      subject: subject.intendedUse,
      equivalent: equiv.intendedUse,
      kind: "text",
    },
    {
      section: "clinical",
      feature: FEATURE_LABEL.reusability[locale],
      subject: subject.reusability,
      equivalent: equiv.reusability,
      kind: "text",
    },
    {
      section: "clinical",
      feature: FEATURE_LABEL.bodyContactArea[locale],
      subject: subject.bodyContactArea,
      equivalent: equiv.bodyContactArea,
      kind: "text",
    },
    {
      section: "clinical",
      feature: FEATURE_LABEL.patientPopulation[locale],
      subject: subject.patientPopulation,
      equivalent: equiv.patientPopulation,
      kind: "text",
    },
    {
      section: "clinical",
      feature: FEATURE_LABEL.shelfLife[locale],
      subject: subject.shelfLife,
      equivalent: equiv.shelfLife,
      kind: "text",
    },
    {
      section: "clinical",
      feature: FEATURE_LABEL.userProfile[locale],
      subject: subject.userProfile,
      equivalent: equiv.userProfile,
      kind: "text",
    },
    {
      section: "clinical",
      feature: FEATURE_LABEL.contactDuration[locale],
      subject: subject.contactDuration,
      equivalent: equiv.contactDuration,
      kind: "text",
    },
    {
      section: "clinical",
      feature: FEATURE_LABEL.indications[locale],
      subject: subject.indications,
      equivalent: equiv.indications,
      kind: "text",
    },
  ];

  return {
    locale,
    title: tr ? "Eşdeğerlik Tablosu" : "Equivalence Table",
    sidebarLabel: product.name,
    subjectName,
    equivalentName,
    subjectPhotoBase64: photos?.subject ? photos.subject.toString("base64") : undefined,
    equivalentPhotoBase64: photos?.equivalent ? photos.equivalent.toString("base64") : undefined,
    rows,
  };
}

export function embedEquivalenceTableMarker(spec: EquivalenceTableDocxSpec): string {
  const payload = Buffer.from(JSON.stringify(spec), "utf8").toString("base64");
  return `${EQUIV_TABLE_MARKER_PREFIX}${payload}-->`;
}

export function parseEquivalenceTableMarker(line: string): EquivalenceTableDocxSpec | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith(EQUIV_TABLE_MARKER_PREFIX) || !trimmed.endsWith("-->")) return null;
  const payload = trimmed.slice(EQUIV_TABLE_MARKER_PREFIX.length, -3);
  try {
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as EquivalenceTableDocxSpec;
  } catch {
    return null;
  }
}

export function sectionLabel(section: EquivalenceTableSection, locale: "tr" | "en"): string {
  return SECTION_LABEL[section][locale];
}
