/** ISO/TR 24971:2020 Annex A — safety-related characteristics (Ek A soru listesi). */

import { ANNEX_A_SEEDS_EN, ANNEX_A_SEEDS_TR } from "./risk-annex-a-seeds";

export interface RiskAnnexARow {
  id: string;
  no: string;
  characteristic: string;
  question: string;
  answer: string;
  approved?: boolean;
}

type RowSeed = Omit<RiskAnnexARow, "answer">;

export function defaultAnnexASeeds(locale: "tr" | "en" = "tr"): RowSeed[] {
  return locale === "tr" ? ANNEX_A_SEEDS_TR : ANNEX_A_SEEDS_EN;
}

export function emptyAnnexARows(locale: "tr" | "en" = "tr"): RiskAnnexARow[] {
  return defaultAnnexASeeds(locale).map((r) => ({ ...r, answer: "", approved: false }));
}

export function parseAnnexARowsJson(raw: unknown, locale: "tr" | "en" = "tr"): RiskAnnexARow[] {
  const defaults = emptyAnnexARows(locale);
  if (!Array.isArray(raw)) return defaults;

  const byId = new Map<string, RiskAnnexARow>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : typeof r.no === "string" ? r.no : "";
    if (!id) continue;
    byId.set(id, {
      id,
      no: typeof r.no === "string" ? r.no : id,
      characteristic: typeof r.characteristic === "string" ? r.characteristic : "",
      question: typeof r.question === "string" ? r.question : "",
      answer: typeof r.answer === "string" ? r.answer : "",
      approved: r.approved === true,
    });
  }

  return defaults.map((d) => {
    const stored = byId.get(d.id);
    if (!stored) return d;
    return {
      ...d,
      characteristic: stored.characteristic || d.characteristic,
      question: stored.question || d.question,
      answer: stored.answer,
      approved: stored.approved ?? false,
    };
  });
}

export function annexAHasAnswers(rows: RiskAnnexARow[]): boolean {
  return rows.some((r) => r.answer.trim().length > 0);
}

function na(locale: "tr" | "en") {
  return locale === "tr" ? "Uygulanmaz." : "Not applicable.";
}

export function ruleBasedAnnexARows(
  ctx: {
    intendedPurpose: string;
    indications?: string;
    contraindications?: string;
    materials: string;
    sterilization: string;
    containsSoftware: boolean;
    isImplantable: boolean;
    isInvasive: boolean;
    isSterile: boolean;
    isActive: boolean;
    isReusable: boolean;
    fmeaRef: string;
    reportRef: string;
  },
  locale: "tr" | "en" = "tr",
): RiskAnnexARow[] {
  const softwareNote =
    locale === "tr"
      ? ctx.containsSoftware
        ? "Yazılım içerir — IEC 62304 değerlendirmesi uygulanır."
        : "Yazılım içermez."
      : ctx.containsSoftware
        ? "Contains software — IEC 62304 assessment applies."
        : "No software.";

  const singleUse =
    locale === "tr"
      ? "Tek kullanımlık; kullanım sonrası imha edilir."
      : "Single-use; disposed after use.";

  const answersTr: Record<string, string> = {
    "A.2.1": `${ctx.intendedPurpose}. Endikasyonlar: ${ctx.indications ?? "—"}. Kontrendikasyonlar: ${ctx.contraindications ?? "—"}. Yanlış kullanım IFU ile kontrol edilir.`,
    "A.2.2": ctx.isImplantable ? "İmplant — implantasyon yeri ve ömür risk dosyasında değerlendirilmiştir." : "İmplant değil.",
    "A.2.3": ctx.isInvasive ? "Hasta ile invaziv temas (cerrahi kullanım)." : "Yüzey teması veya temas yok — ürün özelliklerine göre.",
    "A.2.4": `Materyal: ${ctx.materials}. ISO 10993 biyouyumluluk değerlendirmesi.`,
    "A.2.5": ctx.isActive ? "Aktif cihaz — enerji transferi risk dosyasında değerlendirilir." : "Enerji transferi yok.",
    "A.2.6": na("tr"),
    "A.2.7": na("tr"),
    "A.2.8": ctx.isSterile ? `${ctx.sterilization}. ISO 11607 paketleme validasyonu.` : "Steril değil veya sterilizasyon uygulanmaz.",
    "A.2.9": ctx.isReusable ? "Yeniden işleme prosedürü IFU'da tanımlanır." : "Tek kullanımlık; rutin temizlik/dezenfeksiyon uygulanmaz.",
    "A.2.10": na("tr"),
    "A.2.11": na("tr"),
    "A.2.12": na("tr"),
    "A.2.13": "Cerrahi prosedür ve uygun ekipman ile kullanım.",
    "A.2.14": na("tr"),
    "A.2.15": "Taşıma, depolama ve kullanım ortamı IFU ve etiket ile tanımlanır.",
    "A.2.16": na("tr"),
    "A.2.17": na("tr"),
    "A.2.18": ctx.isReusable ? "Bakım gereksinimleri IFU'da." : "Tek kullanımlık — bakım/kalibrasyon uygulanmaz.",
    "A.2.19": softwareNote,
    "A.2.20": ctx.containsSoftware ? "Yazılım güncellemesi ve erişim kontrolleri değerlendirilir." : na("tr"),
    "A.2.21": ctx.containsSoftware ? "Veri bütünlüğü ve güvenliği değerlendirilir." : na("tr"),
    "A.2.22": "Raf ömrü ambalaj ve sterilizasyon validasyonuna göre; etiket/IFU.",
    "A.2.23": na("tr"),
    "A.2.24": "Mekanik kuvvetler cerrahi kullanım sırasında değerlendirilir.",
    "A.2.25": singleUse,
    "A.2.26": singleUse,
    "A.2.27": "Tek kullanımlık tıbbi atık olarak bertaraf; IFU.",
    "A.2.28": "Eğitimli sağlık personeli. IFU ve eğitim materyalleri.",
    "A.2.29": "IFU, etiketleme ve teknik dosya ile güvenlik bilgisi sağlanır.",
    "A.2.30": "Üretim süreçleri ISO 13485 ve validasyon kayıtları ile kontrol edilir.",
    "A.2.31": "IFU ve etiketleme; IEC 62366 (uygulanabilir olduğunda).",
    "A.2.31.1": "Etiket, semboller ve fiziksel tasarım IEC 62366 ile uyumlu.",
    "A.2.31.2": "Ameliyathane ortamı — dikkat dağınıklığı IFU ile yönetilir.",
    "A.2.31.3": na("tr"),
    "A.2.31.4": na("tr"),
    "A.2.31.5": "Etiket ve IFU bilgileri görünür ve anlaşılır.",
    "A.2.31.6": ctx.containsSoftware ? "Yazılım arayüzü IEC 62304/62366 ile değerlendirilir." : na("tr"),
    "A.2.31.7": "Eğitimli sağlık personeli / hekim.",
    "A.2.31.8": na("tr"),
    "A.2.31.9": na("tr"),
    "A.2.32": na("tr"),
    "A.2.33": "Makul öngörülebilir yanlış kullanım IFU'da tanımlanır.",
    "A.2.34": na("tr"),
    "A.2.35": na("tr"),
    "A.2.36": na("tr"),
    "A.2.37": na("tr"),
  };

  const answersEn: Record<string, string> = {
    "A.2.1": `${ctx.intendedPurpose}. Indications: ${ctx.indications ?? "—"}. Contraindications: ${ctx.contraindications ?? "—"}. Misuse controlled via IFU.`,
    "A.2.2": ctx.isImplantable ? "Implant — site and lifetime assessed in risk file." : "Not an implant.",
    "A.2.3": ctx.isInvasive ? "Invasive patient contact (surgical use)." : "Surface contact or no contact per device characteristics.",
    "A.2.4": `Materials: ${ctx.materials}. ISO 10993 biocompatibility assessment.`,
    "A.2.5": ctx.isActive ? "Active device — energy transfer assessed in risk file." : "No energy transfer.",
    "A.2.6": na("en"),
    "A.2.7": na("en"),
    "A.2.8": ctx.isSterile ? `${ctx.sterilization}. ISO 11607 packaging validation.` : "Not sterile or sterilization not applicable.",
    "A.2.9": ctx.isReusable ? "Reprocessing procedure defined in IFU." : "Single-use; no routine cleaning/disinfection.",
    "A.2.10": na("en"),
    "A.2.11": na("en"),
    "A.2.12": na("en"),
    "A.2.13": "Used with appropriate surgical procedure and equipment.",
    "A.2.14": na("en"),
    "A.2.15": "Transport, storage and use environment per IFU and label.",
    "A.2.16": na("en"),
    "A.2.17": na("en"),
    "A.2.18": ctx.isReusable ? "Maintenance per IFU." : "Single-use — no maintenance/calibration.",
    "A.2.19": softwareNote,
    "A.2.20": ctx.containsSoftware ? "Software update and access controls assessed." : na("en"),
    "A.2.21": ctx.containsSoftware ? "Data integrity and security assessed." : na("en"),
    "A.2.22": "Shelf life per packaging and sterilization validation; label/IFU.",
    "A.2.23": na("en"),
    "A.2.24": "Mechanical forces assessed during surgical use.",
    "A.2.25": singleUse,
    "A.2.26": singleUse,
    "A.2.27": "Disposed as single-use medical waste; IFU.",
    "A.2.28": "Trained healthcare professional. IFU and training materials.",
    "A.2.29": "Safety information via IFU, labelling and technical file.",
    "A.2.30": "Manufacturing processes controlled per ISO 13485 and validation records.",
    "A.2.31": "IFU and labelling; IEC 62366 where applicable.",
    "A.2.31.1": "Label, symbols and physical design per IEC 62366.",
    "A.2.31.2": "Surgical environment — distractions managed via IFU.",
    "A.2.31.3": na("en"),
    "A.2.31.4": na("en"),
    "A.2.31.5": "Label and IFU information visible and understandable.",
    "A.2.31.6": ctx.containsSoftware ? "Software UI assessed per IEC 62304/62366." : na("en"),
    "A.2.31.7": "Trained healthcare professional / physician.",
    "A.2.31.8": na("en"),
    "A.2.31.9": na("en"),
    "A.2.32": na("en"),
    "A.2.33": "Reasonably foreseeable misuse defined in IFU.",
    "A.2.34": na("en"),
    "A.2.35": na("en"),
    "A.2.36": na("en"),
    "A.2.37": na("en"),
  };

  const answers = locale === "tr" ? answersTr : answersEn;
  return emptyAnnexARows(locale).map((r) => ({
    ...r,
    answer: answers[r.id] ?? na(locale),
  }));
}
