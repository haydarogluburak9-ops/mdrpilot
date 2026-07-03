import { sterilizationMethodsFromVariants } from "./sterilization";

/**
 * Derives the ISO 15223-1 (medical device symbols) that APPLY to a given product
 * from its characteristics and the manufacturer profile, so the "Symbols used"
 * part of the label / IFU section can be filled automatically instead of leaving
 * every line as a placeholder.
 *
 * Only applicable symbols are returned; non-applicable ones (e.g. EO sterilization
 * for a non-EO device) are omitted. Clause numbers follow ISO 15223-1:2021.
 */
const L = (locale: string, en: string, tr: string) => (locale === "tr" ? tr : en);

export interface SymbolInput {
  deviceClass: string;
  isSterile: boolean;
  isReusable: boolean;
  shelfLife?: string | null;
  variantsJson?: unknown;
  sterilization?: string | null;
  basicUdiDi?: string | null;
  udiDi?: string | null;
}

export interface CompanySymbolInput {
  name?: string | null;
  legalName?: string | null;
  address?: string | null;
  authorizedRep?: string | null;
  notifiedBody?: string | null;
  notifiedBodyNumber?: string | null;
}

/** Returns localized "Title (ISO 15223-1, 5.x): note/value" lines for applicable symbols. */
export function describeSymbols(p: SymbolInput, c: CompanySymbolInput | null, locale: string): string[] {
  const lines: string[] = [];
  const add = (title: string, clause: string, note: string) =>
    lines.push(`${title} (ISO 15223-1, ${clause}): ${note}`);

  const tbc = L(locale, "[TO BE CONFIRMED]", "[TEYİT EDİLECEK]");
  const onLabel = L(locale, "appears on the label / IFU", "etikette / KT üzerinde yer alır");
  const perBatch = L(locale, "applies; printed per batch", "uygulanır; her parti için basılır");

  const methods = sterilizationMethodsFromVariants(p.variantsJson);
  const sterMethods = methods.length
    ? methods
    : p.isSterile && p.sterilization && p.sterilization !== "NON_STERILE" && p.sterilization !== "OTHER"
      ? [p.sterilization]
      : [];

  // 5.1.1 Manufacturer (always)
  const mfr = c?.legalName || c?.name;
  add(
    L(locale, "Manufacturer", "Üretici"),
    "5.1.1",
    mfr ? `${mfr}${c?.address ? `, ${c.address}` : ""}` : tbc,
  );

  // 5.1.2 Authorised representative (only if appointed)
  if (c?.authorizedRep) {
    add(L(locale, "Authorised representative", "Yetkili temsilci"), "5.1.2", c.authorizedRep);
  }

  // 5.1.3 Date of manufacture (always)
  add(L(locale, "Date of manufacture", "Üretim tarihi"), "5.1.3", perBatch);

  // 5.1.4 Use-by date (if sterile or a limited shelf life is defined)
  if (p.isSterile || p.shelfLife) {
    add(
      L(locale, "Use-by date", "Son kullanma tarihi"),
      "5.1.4",
      p.shelfLife
        ? `${L(locale, "based on shelf life", "raf ömrüne göre")}: ${p.shelfLife}`
        : perBatch,
    );
  }

  // 5.1.5 Batch/lot code (always — traceability)
  add(L(locale, "Batch code (LOT)", "Parti/lot kodu (LOT)"), "5.1.5", perBatch);

  // 5.1.6 Catalogue number (REF)
  add(L(locale, "Catalogue number (REF)", "Katalog numarası (REF)"), "5.1.6", onLabel);

  // 5.2.x Sterilization method symbols
  if (sterMethods.includes("EO")) {
    add(L(locale, "Sterilized using ethylene oxide", "Etilen oksit ile sterilize"), "5.2.3", L(locale, "applies (EO models)", "uygulanır (EO modeller)"));
  }
  if (sterMethods.includes("GAMMA")) {
    add(L(locale, "Sterilized using irradiation", "Radyasyon ile sterilize"), "5.2.4", L(locale, "applies (gamma models)", "uygulanır (gamma modeller)"));
  }
  if (sterMethods.includes("STEAM")) {
    add(L(locale, "Sterilized using steam/dry heat", "Buhar/kuru ısı ile sterilize"), "5.2.6", L(locale, "applies (steam models)", "uygulanır (buhar modeller)"));
  }
  if (p.isSterile) {
    add(L(locale, "Do not use if package is damaged", "Ambalaj hasarlıysa kullanmayınız"), "5.2.8", onLabel);
    add(L(locale, "Sterile barrier system", "Steril bariyer sistemi"), "5.2.11", onLabel);
  }

  // 5.4.2 Do not reuse (single-use devices)
  if (!p.isReusable) {
    add(L(locale, "Do not reuse", "Tekrar kullanmayınız"), "5.4.2", L(locale, "applies (single-use device)", "uygulanır (tek kullanımlık cihaz)"));
  }

  // 5.4.3 / 5.4.4 Consult IFU & Caution (always)
  add(L(locale, "Consult instructions for use", "Kullanma talimatlarına bakınız"), "5.4.3", onLabel);
  add(L(locale, "Caution", "Dikkat"), "5.4.4", onLabel);

  // Medical device & UDI (ISO 15223-1 / ISO 20417)
  add(L(locale, "Medical device", "Tıbbi cihaz"), "5.7.7", onLabel);
  add(
    L(locale, "UDI carrier", "UDI taşıyıcısı"),
    "ISO 20417",
    p.basicUdiDi || p.udiDi ? `${p.basicUdiDi ?? p.udiDi}` : tbc,
  );

  // CE marking + Notified Body number (MDR Annex V) — not part of ISO 15223-1 but
  // belongs on the label; NB number only for classes above plain Class I.
  const needsNb = p.deviceClass !== "CLASS_I";
  const nbText = [c?.notifiedBodyNumber, c?.notifiedBody ? `(${c.notifiedBody})` : ""]
    .filter(Boolean)
    .join(" ");
  add(
    L(locale, "CE marking", "CE işareti"),
    "MDR Annex V",
    needsNb
      ? `${L(locale, "with Notified Body number", "Onaylanmış Kuruluş numarası ile")}: ${nbText || tbc}`
      : L(locale, "applies (no NB number for self-certified Class I)", "uygulanır (öz beyanlı Sınıf I için NB numarası yok)"),
  );

  return lines;
}
