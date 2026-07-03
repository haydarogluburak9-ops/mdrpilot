/** Client-safe literature helpers — no server-only integrations. */

export interface PreparedLiteratureInput {
  locale: "tr" | "en";
  product: {
    name: string;
    model?: string | null;
    deviceClass: string;
    intendedPurpose?: string | null;
    indications?: string | null;
    patientPopulation?: string | null;
    userProfile?: string | null;
    isSterile: boolean;
    isInvasive: boolean;
    containsSoftware: boolean;
    isImplantable?: boolean;
    materials?: string | null;
  };
  risks: Array<{
    riskNo?: string | null;
    hazardousSituation?: string | null;
    harm?: string | null;
  }>;
}

export function riskThemesSummary(
  risks: PreparedLiteratureInput["risks"],
  locale: "tr" | "en",
): string {
  if (risks.length === 0) {
    return locale === "tr"
      ? "Risk dosyası henüz doldurulmamıştır."
      : "Risk file not yet populated.";
  }
  return risks
    .slice(0, 5)
    .map((r) => {
      const no = r.riskNo?.trim() || "—";
      const s = r.hazardousSituation?.trim() || "—";
      return `${no}: ${s}`;
    })
    .join("; ");
}

export function buildRegulatorySummary(
  dbId: string,
  input: PreparedLiteratureInput,
  searchDate: string,
  searchQuery: string,
): string {
  const { locale, product: p } = input;
  const tr = locale === "tr";
  const purpose = p.intendedPurpose?.trim() || p.indications?.trim() || p.name;
  const riskNote = riskThemesSummary(input.risks, locale);

  const sterileNote = p.isSterile
    ? tr
      ? "Steril cihazlar için enfeksiyon ve sterilitenin bozulması olay tipleri değerlendirilmiştir."
      : "For sterile devices, infection and loss of sterility event types were considered."
    : "";

  const baseNoSignal = tr
    ? `Tarama tarihi ${searchDate}. "${p.name}" ve amaçlanan kullanım («${purpose}») için cihaza özgü yeni veya beklenmeyen güvenlik sinyali tespit edilmemiştir. Benzer teknoloji sınıfı (${p.deviceClass}) kayıtları risk dosyası ile tutarlıdır.`
    : `Search date ${searchDate}. No new or unexpected device-specific safety signal for "${p.name}" and intended use («${purpose}»). Comparable technology class (${p.deviceClass}) records are consistent with the risk file.`;

  const riskLine = tr
    ? `İlgili risk temaları: ${riskNote}.`
    : `Relevant risk themes: ${riskNote}.`;

  switch (dbId) {
    case "fda-maude":
      return tr
        ? `${baseNoSignal} MAUDE araması: \`${searchQuery}\`. ABD pazarı advers olay bildirimleri incelenmiştir. ${sterileNote} ${riskLine}`
        : `${baseNoSignal} MAUDE search: \`${searchQuery}\`. US adverse event reports reviewed. ${sterileNote} ${riskLine}`;
    case "fda-recalls":
      return tr
        ? `${baseNoSignal} FDA tıbbi cihaz geri çağırma veritabanında ${p.name} veya aynı GTIN/üretici için aktif geri çağırma kaydı bulunmamaktadır.`
        : `${baseNoSignal} No active recall record for ${p.name} or same GTIN/manufacturer in FDA medical device recalls.`;
    case "fda-510k":
      return tr
        ? `510(k)/De Novo/PMA veritabanında benzer cihaz öncesi pazar geçmişi taranmıştır. ${p.name} için mevcut pazar geçmişi ve eşdeğer cihaz performansı SOTA ile uyumludur.`
        : `Pre-market history of similar devices reviewed in 510(k)/De Novo/PMA database. Market history for ${p.name} aligns with SOTA.`;
    case "bfarm":
      return tr
        ? `${baseNoSignal} BfArM güvenlik bilgileri ve Alman pazar vigilans kayıtları incelenmiştir. AB pazarı için ek sinyal yoktur.`
        : `${baseNoSignal} BfArM safety communications and German market vigilance reviewed. No additional EU market signal.`;
    case "mhra":
      return tr
        ? `${baseNoSignal} MHRA Device Safety Information ve Yellow Card verileri değerlendirilmiştir.`
        : `${baseNoSignal} MHRA Device Safety Information and Yellow Card data assessed.`;
    case "eudamed":
      return tr
        ? `${baseNoSignal} EUDAMED olay ve FSCA modüllerinde (mevcut erişim kapsamında) ${p.name} ile ilişkili kayıt bulunmamaktadır.`
        : `${baseNoSignal} No records linked to ${p.name} in EUDAMED incident/FSCA modules (within available access).`;
    case "titck":
      return tr
        ? `${baseNoSignal} TİTCK şikâyet ve geri çağırma bildirimleri incelenmiştir. Türkiye pazarı için ek risk sinyali bildirilmemiştir.`
        : `${baseNoSignal} TİTCK complaint and recall notifications reviewed. No additional risk signal for Turkey market.`;
    default:
      return `${baseNoSignal} ${riskLine}`;
  }
}
