import { inferQmsLayerFromCode, type QmsDocumentLayer } from "./kys-structure";

function layerFromCode(code?: string | null, layer?: string | null): QmsDocumentLayer {
  if (layer && layer !== "PROCEDURE" && layer !== "MANUAL") return layer as QmsDocumentLayer;
  return inferQmsLayerFromCode(code);
}

/** Layer-specific AI instructions — child docs must NOT use SOP Purpose/Scope structure. */
export function childDocumentPromptGuidance(
  code: string | null | undefined,
  layer: string | null | undefined,
  locale: "tr" | "en",
): string {
  const docLayer = layerFromCode(code, layer);

  const guides: Record<QmsDocumentLayer, { tr: string; en: string } | null> = {
    DIAGRAM: {
      tr: [
        "Bu bir ŞEMA (akış diyagramı) dokümanıdır — prosedür (SOP) DEĞİLDİR.",
        "Amaç, Kapsam, Sorumluluklar, Tanımlar, Prosedür bölümleri YAZMA.",
        "Yapı: kısa başlık + özet adım tablosu (Markdown). Word dışa aktarımda kutu akış şeması üretilir.",
        "Kayıt kodlarını adımlarda göster (FORM-AN-01 vb.).",
      ].join("\n"),
      en: [
        "This is a DIAGRAM (flowchart) — NOT a procedure (SOP).",
        "Do NOT write Purpose, Scope, Responsibilities, Definitions, Procedure sections.",
        "Structure: short title + summary step table (Markdown). Word export renders a boxed flowchart.",
        "Show record codes in steps (e.g. FORM-AN-01).",
      ].join("\n"),
    },
    INSTRUCTION: {
      tr: [
        "Bu bir İŞ TALİMATI (WI) dokümanıdır — prosedür (SOP) DEĞİLDİR.",
        "Amaç/Kapsam bölümleri kısa (en fazla 2 cümle); ana gövde numaralı adımlar.",
        "Her adımda: eylem, sorumlu, kayıt/form referansı, kabul kriteri.",
      ].join("\n"),
      en: [
        "This is a WORK INSTRUCTION (WI) — NOT a procedure (SOP).",
        "Purpose/Scope at most 2 sentences; main body is numbered steps.",
        "Each step: action, owner, record/form reference, acceptance criteria.",
      ].join("\n"),
    },
    FORM: {
      tr: [
        "Bu bir FORM şablonudur — prosedür (SOP) DEĞİLDİR.",
        "Amaç, Kapsam, Sorumluluklar, Tanımlar, Prosedür bölümleri YAZMA.",
        "Yapı: form bilgileri tablosu + alan tabloları + onay imza satırları + örnek doldurulmuş satır.",
        "Boş alanlar için __________ veya tablo hücreleri kullan.",
      ].join("\n"),
      en: [
        "This is a FORM template — NOT a procedure (SOP).",
        "Do NOT write Purpose, Scope, Responsibilities, Definitions, Procedure sections.",
        "Structure: form info table + field tables + approval signatures + one filled example row.",
        "Use __________ or empty table cells for blank fields.",
      ].join("\n"),
    },
    LIST: {
      tr: "Bu bir LİSTE dokümanıdır. Sütun başlıkları + örnek satırlar; prosedür yapısı kullanma.",
      en: "This is a LIST document. Column headers + sample rows; no procedure structure.",
    },
    RECORD: {
      tr: "Bu bir KAYIT / örnek vaka dokümanıdır. Dolu örnek kayıt formatında yaz; prosedür yapısı kullanma.",
      en: "This is a RECORD / sample case document. Write as a completed example; no procedure structure.",
    },
    PLAN: null,
    SPECIFICATION: null,
    JOB_DESCRIPTION: null,
    ASSIGNMENT: null,
    OTHER: null,
    MANUAL: null,
    PROCEDURE: null,
  };

  const g = guides[docLayer];
  if (!g) return "";
  return locale === "tr" ? g.tr : g.en;
}

export function isChildQmsDocument(code: string | null | undefined, layer: string | null | undefined): boolean {
  const docLayer = layerFromCode(code, layer);
  return docLayer !== "PROCEDURE" && docLayer !== "MANUAL";
}
