import type { QmsDocumentLayer } from "./kys-structure";

/** AI hints per KYS layer — what to produce under a parent procedure. */
export function childLayerAiGuidance(layer: QmsDocumentLayer, locale: "tr" | "en"): string {
  const guides: Record<QmsDocumentLayer, { tr: string; en: string }> = {
    INSTRUCTION: {
      tr: "İş talimatı (WI): adım adım operasyon, güvenlik, malzeme/ekipman, kabul kriterleri, kayıt referansları. Marka/model spesifik detayları kullanıcı notuna göre ekle.",
      en: "Work instruction (WI): step-by-step operations, safety, materials/equipment, acceptance criteria, record references. Add brand/model specifics from user notes.",
    },
    FORM: {
      tr: "Boş form şablonu: başlık alanları, onay imza satırları, revizyon kutusu, prosedürdeki kayıt kodu referansı.",
      en: "Blank form template: header fields, approval signature rows, revision box, record code reference from the procedure.",
    },
    DIAGRAM: {
      tr: "Şema/akış diyagramı: prosedür yapısı KULLANMA. Özet adım tablosu (Markdown); Word dışa aktarımda kutu şeması (yatay sayfa).",
      en: "Diagram/flowchart: do NOT use procedure sections. Summary step table in Markdown; Word export uses boxed flowchart (landscape).",
    },
    PLAN: {
      tr: "Plan: dönem, sorumlu, aktivite listesi, frekans ve kayıt referansları.",
      en: "Plan: period, owner, activity list, frequency and record references.",
    },
    LIST: {
      tr: "Liste: sütun başlıkları, örnek satırlar, güncelleme sorumlusu.",
      en: "List: column headers, sample rows, update responsibility.",
    },
    SPECIFICATION: {
      tr: "Şartname: gereklilik maddeleri, kabul limitleri, referans standartlar.",
      en: "Specification: requirement clauses, acceptance limits, reference standards.",
    },
    JOB_DESCRIPTION: {
      tr: "Görev tanımı: raporlama ilişkisi, yetki, sorumluluklar, gerekli yetkinlik.",
      en: "Job description: reporting line, authority, responsibilities, required competence.",
    },
    ASSIGNMENT: {
      tr: "Atama yazısı: atama kapsamı, yetki devri, geçerlilik, imza blokları.",
      en: "Appointment letter: scope of appointment, delegated authority, validity, signature blocks.",
    },
    RECORD: {
      tr: "Kayıt rehberi: hangi kayıt nerede saklanır, saklama süresi, erişim.",
      en: "Records guide: which record is stored where, retention, access.",
    },
    OTHER: {
      tr: "Kontrollü doküman: prosedürle tutarlı politika veya ek doküman.",
      en: "Controlled document: policy or supplementary doc aligned with the procedure.",
    },
    MANUAL: { tr: "", en: "" },
    PROCEDURE: { tr: "", en: "" },
  };
  const g = guides[layer];
  return locale === "tr" ? g.tr : g.en;
}

/** Layers users can create under a procedure from the extra creator. */
export const PROCEDURE_CREATABLE_LAYERS: QmsDocumentLayer[] = [
  "INSTRUCTION",
  "FORM",
  "DIAGRAM",
  "PLAN",
  "LIST",
  "SPECIFICATION",
  "JOB_DESCRIPTION",
  "ASSIGNMENT",
  "RECORD",
  "OTHER",
];
