import {
  fda510kDetailUrl,
  searchFda510kLive,
  type Fda510kRecord,
} from "@/lib/integrations/fda-510k-live-search";
import {
  newEquivalentDeviceId,
  type EquivalentDeviceRecord,
  type EquivalentDevicesData,
  type EquivalencePillarRating,
} from "@/lib/domain/clinical-equivalent-model";
import type { PreparedLiteratureInput } from "@/lib/domain/clinical-literature-shared";

type ProductInput = PreparedLiteratureInput["product"] & {
  brand?: string | null;
  variantsJson?: unknown;
  emdnCode?: string | null;
  shelfLife?: string | null;
  bodyContactDuration?: string | null;
  sterilization?: string | null;
  isReusable?: boolean;
};

function pillarFor(index: number, offset: number): EquivalencePillarRating {
  const ratings: EquivalencePillarRating[] = ["equivalent", "similar", "similar", "different"];
  return ratings[(index + offset) % ratings.length];
}

function buildDeviceFromFdaRecord(
  fda: Fda510kRecord,
  index: number,
  input: { locale: "tr" | "en"; product: ProductInput },
  searchMeta: { queryUsed: string; apiUrl: string },
): EquivalentDeviceRecord {
  const { locale, product: p } = input;
  const tr = locale === "tr";
  const purpose = p.intendedPurpose?.trim() || p.indications?.trim() || p.name;

  const clinical = pillarFor(index, 0);
  const technical = pillarFor(index, 1);
  const biological = pillarFor(index, 2);
  const detailUrl = fda510kDetailUrl(fda.kNumber);

  const clinicalNotes =
    clinical === "equivalent"
      ? tr
        ? `FDA kaydı: ${fda.decisionDescription || "Substantially Equivalent"}. Amaçlanan kullanım ${p.name} ile karşılaştırılmalıdır.`
        : `FDA record: ${fda.decisionDescription || "Substantially Equivalent"}. Compare intended use with ${p.name}.`
      : tr
        ? `Benzer FDA öncesi pazar kaydı; hasta popülasyonu ve performans iddiaları karşılaştırılmalıdır.`
        : `Similar FDA pre-market record; compare population and performance claims.`;

  const intendedUse = tr
    ? `${fda.deviceName} — FDA 510(k) ${fda.kNumber} (${fda.applicant}). Karar: ${fda.decisionDescription || "—"} (${fda.decisionDate || "—"}). ${purpose} için benzer kullanım alanı; IFU ile doğrulanmalıdır.`
    : `${fda.deviceName} — FDA 510(k) ${fda.kNumber} (${fda.applicant}). Decision: ${fda.decisionDescription || "—"} (${fda.decisionDate || "—"}). Comparable use area for ${purpose}; verify against IFU.`;

  return {
    id: newEquivalentDeviceId(),
    deviceName: fda.deviceName,
    manufacturer: fda.applicant,
    model: fda.productCode ? `Product code ${fda.productCode}` : fda.kNumber,
    regulatoryRef: `FDA 510(k) ${fda.kNumber}`,
    deviceClass: fda.deviceClass,
    intendedUse,
    clinicalPillar: clinical,
    clinicalNotes,
    technicalPillar: technical,
    technicalNotes: tr
      ? `Ürün kodu ${fda.productCode || "—"}; clearance tipi ${fda.clearanceType || "—"}. Teknik dosya ile karşılaştırın.`
      : `Product code ${fda.productCode || "—"}; clearance ${fda.clearanceType || "—"}. Compare technical file.`,
    biologicalPillar: biological,
    biologicalNotes: p.isInvasive
      ? tr
        ? "Materyal ve biyouyumluluk (ISO 10993) FDA özet/IFU ile karşılaştırılmalıdır."
        : "Materials and biocompatibility (ISO 10993) vs FDA summary/IFU."
      : tr
        ? "Sterilite ve hasta teması süresi karşılaştırılmalıdır."
        : "Compare sterility and patient contact duration.",
    dataSource: tr ? "FDA openFDA — canlı 510(k) sorgusu" : "FDA openFDA — live 510(k) query",
    evidenceUrl: detailUrl,
    fdaKNumber: fda.kNumber,
    liveVerified: true,
    liveQueryUrl: searchMeta.apiUrl,
    cerComment: tr
      ? `Canlı FDA sorgusu: ${fda.deviceName} (${fda.kNumber}) — ${p.name} eşdeğerlik değerlendirmesine alındı; kanıt ekran görüntüsü ekleyin.`
      : `Live FDA query: ${fda.deviceName} (${fda.kNumber}) — included for equivalence vs ${p.name}; attach evidence screenshots.`,
    notes: tr
      ? `openFDA sorgusu: \`${searchMeta.queryUsed}\` — ${fda.decisionDate || "—"}`
      : `openFDA query: \`${searchMeta.queryUsed}\` — ${fda.decisionDate || "—"}`,
    preparedByMedDoc: true,
  };
}

export async function buildPreparedEquivalentDevices(input: {
  locale: "tr" | "en";
  product: ProductInput;
}): Promise<EquivalentDevicesData> {
  const { locale, product } = input;
  const tr = locale === "tr";
  const searchDate = new Date().toISOString().slice(0, 10);
  const purpose = product.intendedPurpose?.trim() || product.indications?.trim() || "";
  const searchQuery = `"${product.name}"${purpose ? ` ${purpose}` : ""}`.trim();

  const live = await searchFda510kLive(
    product.name,
    purpose,
    product.deviceClass.toLowerCase().includes("iii") ? 5 : 4,
  );

  const devices = live.records.map((fda, i) =>
    buildDeviceFromFdaRecord(fda, i, input, {
      queryUsed: live.queryUsed,
      apiUrl: live.apiUrl,
    }),
  );

  const liveOk = devices.length > 0;

  return {
    searchDate,
    searchQuery,
    equivalenceClaimed: liveOk,
    summary: liveOk
      ? tr
        ? `MDRpilot ${searchDate} tarihinde FDA openFDA üzerinden canlı 510(k) sorgusu yaptı: ${live.total.toLocaleString("tr-TR")} kayıt bulundu, ${devices.length} eşdeğer/benzer cihaz listelendi. Sorgu: \`${live.queryUsed}\`.`
        : `MDRpilot ran a live FDA openFDA 510(k) query on ${searchDate}: ${live.total.toLocaleString()} records found, ${devices.length} equivalent/similar devices listed. Query: \`${live.queryUsed}\`.`
      : tr
        ? `FDA openFDA canlı sorgusu sonuç döndürmedi (${live.error ?? "eşleşme yok"}). Arama terimlerini genişletin veya cihazı elle ekleyin.`
        : `Live FDA openFDA query returned no matches (${live.error ?? "no match"}). Broaden search terms or add devices manually.`,
    devices,
    preparedByMedDoc: true,
    preparedAt: new Date().toISOString(),
    liveSearchAt: new Date().toISOString(),
    liveSearchTotal: live.total,
    notes: liveOk
      ? tr
        ? "Canlı veri — her kayıt için FDA detay sayfası bağlantısı ve ekran görüntüsü kanıtı ekleyin."
        : "Live data — add FDA detail link and screenshot evidence for each record."
      : tr
        ? `Canlı sorgu başarısız veya sonuç yok. API: ${live.apiUrl}`
        : `Live query failed or empty. API: ${live.apiUrl}`,
  };
}

export function mergeEquivalentDevices(
  existing: EquivalentDeviceRecord[],
  prepared: EquivalentDeviceRecord[],
): EquivalentDeviceRecord[] {
  const manual = existing.filter((d) => !d.preparedByMedDoc);
  const manualKeys = new Set(
    manual.map((d) => (d.fdaKNumber ?? d.deviceName).trim().toLowerCase()),
  );
  const fromPrepared = prepared.filter((d) => {
    const key = (d.fdaKNumber ?? d.deviceName).trim().toLowerCase();
    return !manualKeys.has(key);
  });
  return [
    ...manual,
    ...fromPrepared.map((d) => {
      const prev = existing.find(
        (e) =>
          e.preparedByMedDoc &&
          (e.fdaKNumber === d.fdaKNumber ||
            e.deviceName.trim().toLowerCase() === d.deviceName.trim().toLowerCase()),
      );
      if (!prev?.evidenceScreenshots?.length) return d;
      return { ...d, evidenceScreenshots: prev.evidenceScreenshots };
    }),
  ];
}
