/** English NA reason keys produced by evaluateApplicability / resolveGsprNaReason. */
export const GSPR_NA_REASON_EN = {
  nonSterile: "Non-sterile device",
  suppliedSterile: "Device supplied sterile",
  noSoftware: "Device contains no software",
  noMeasuring: "Device has no measuring/diagnostic function",
  notImplantSscp: "SSCP is required only for Class III and implantable devices",
  notImplantInvestigation: "Own clinical investigation expected mainly for Class III / implantable devices",
  notImplantCard: "Implant card is required only for implantable devices",
  notReusable: "Single-use device (no reprocessing)",
  notActive: "Non-active device (no electrical/energy source)",
  noRadiation: "Device does not emit radiation",
  noDelivery: "Device does not administer or remove medicines or energy",
  noMedicinal: "Device incorporates no medicinal substance",
  noBiological: "Device contains no materials of biological origin",
  noCmr: "Device contains no CMR / endocrine-disrupting substances",
  noNano: "Device contains no nanomaterials",
  notLayUser: "Device is intended for professional use only",
  notAbsorbable: "Device is not absorbable or locally dispersed in the body",
  notActiveImplant: "Not an active implantable device",
} as const;

export const GSPR_NA_REASON_TR: Record<string, string> = {
  [GSPR_NA_REASON_EN.nonSterile]: "Cihaz steril olarak tedarik edilmemektedir; bu GSPR maddesi uygulanamaz.",
  [GSPR_NA_REASON_EN.suppliedSterile]: "Cihaz steril olarak tedarik edilmektedir; bu madde steril olmayan cihazlar için geçerlidir.",
  [GSPR_NA_REASON_EN.noSoftware]: "Cihaz yazılım içermemektedir; yazılım gereksinimleri uygulanamaz.",
  [GSPR_NA_REASON_EN.noMeasuring]: "Cihazda ölçüm veya tanısal işlev bulunmamaktadır.",
  [GSPR_NA_REASON_EN.notImplantSscp]: "Özet güvenlik ve klinik performans raporu yalnızca Sınıf III ve implantlanabilir cihazlar için gereklidir.",
  [GSPR_NA_REASON_EN.notImplantInvestigation]: "Klinik araştırma gereksinimi bu cihaz sınıfı ve özellikleri için uygulanamaz.",
  [GSPR_NA_REASON_EN.notImplantCard]: "İmplant kartı yalnızca implantlanabilir cihazlar için gereklidir.",
  [GSPR_NA_REASON_EN.notReusable]: "Tek kullanımlık cihazdır; yeniden işleme gereksinimleri uygulanamaz.",
  [GSPR_NA_REASON_EN.notActive]: "Aktif olmayan cihazdır; enerji kaynağı ile ilgili gereksinimler uygulanamaz.",
  [GSPR_NA_REASON_EN.noRadiation]: "Cihaz radyasyon yaymamaktadır.",
  [GSPR_NA_REASON_EN.noDelivery]: "Cihaz ilaç veya enerji vermez/alamaz.",
  [GSPR_NA_REASON_EN.noMedicinal]: "Cihaz tıbbi madde içermemektedir.",
  [GSPR_NA_REASON_EN.noBiological]: "Cihaz biyolojik kökenli materyal içermemektedir.",
  [GSPR_NA_REASON_EN.noCmr]: "Cihaz CMR veya endokrin bozucu madde içermemektedir.",
  [GSPR_NA_REASON_EN.noNano]: "Cihaz nanomateryal içermemektedir.",
  [GSPR_NA_REASON_EN.notLayUser]: "Cihaz yalnızca sağlık profesyonelleri tarafından kullanılmak üzere tasarlanmıştır.",
  [GSPR_NA_REASON_EN.notAbsorbable]: "Cihaz emilebilir veya vücutta dağılabilir değildir.",
  [GSPR_NA_REASON_EN.notActiveImplant]: "Aktif implantlanabilir cihaz değildir.",
};

const EN_NA_VALUES = new Set(Object.values(GSPR_NA_REASON_EN));

/** True when stored text is a known English NA reason or English NA wrapper. */
export function isEnglishNaJustification(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  const t = text.trim();
  if (EN_NA_VALUES.has(t as (typeof GSPR_NA_REASON_EN)[keyof typeof GSPR_NA_REASON_EN])) return true;
  if (/^Not applicable\b/i.test(t)) return true;
  if (/^GSPR \d/.test(t) && /\bapplies to\b/i.test(t)) return true;
  if (/^GSPR \d/.test(t) && /\bbased on device\b/i.test(t)) return true;
  for (const en of EN_NA_VALUES) {
    if (t.includes(en)) return true;
  }
  return false;
}

export function localizeGsprNaReason(reason: string, locale: string): string {
  if (locale === "tr") {
    return GSPR_NA_REASON_TR[reason] ?? "Cihaz özellikleri ve amaçlanan kullanım nedeniyle bu GSPR maddesi uygulanamaz.";
  }
  return `Not applicable based on device characteristics: ${reason}`;
}

/** Localize a stored justification (fixes legacy English NA rows on display / export). */
export function localizeStoredJustification(
  text: string | null | undefined,
  applicable: string,
  locale: string,
): string | undefined {
  if (!text?.trim()) return text ?? undefined;
  if (applicable !== "NO" || locale !== "tr") return text;
  const t = text.trim();
  if (GSPR_NA_REASON_TR[t]) return GSPR_NA_REASON_TR[t];
  if (/^Not applicable\b/i.test(t)) {
    const inner = t.replace(/^Not applicable[^:]*:\s*/i, "").trim();
    return GSPR_NA_REASON_TR[inner] ?? localizeGsprNaReason(inner, locale);
  }
  if (/^Cihaz özellikleri nedeniyle uygulanamaz:\s*/i.test(t)) {
    const inner = t.replace(/^Cihaz özellikleri nedeniyle uygulanamaz:\s*/i, "").trim();
    if (GSPR_NA_REASON_TR[inner]) return GSPR_NA_REASON_TR[inner];
  }
  for (const [en, tr] of Object.entries(GSPR_NA_REASON_TR)) {
    if (t === en || t.includes(en)) return tr;
  }
  return text;
}
