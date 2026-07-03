import type { QmsDocumentLayer } from "./kys-structure";
import { SOP_AN_CHILD_AI_HINTS } from "./procedure-packs/sop-an-pack";
import { SOP_CC_CHILD_AI_HINTS } from "./procedure-packs/sop-cc-pack";

import type { Lang } from "@/lib/i18n/locales";
import { binaryContentLang } from "@/lib/i18n/locales";

type Locale = Lang;

/** Contextual AI hint examples per procedure + document layer (ISO 13485 KYS). */
const BY_PROCEDURE_LAYER: Record<string, Partial<Record<QmsDocumentLayer, { tr: string; en: string }>>> = {
  "SOP-IA": {
    FORM: {
      tr: "örn. İç tetkik kontrol listesi — ISO 13485 maddeleri 4.2.4, 7.5, 8.2.4; denetçi: kalite müdürü; kapsam: üretim + depo",
      en: "e.g. Internal audit checklist — ISO 13485 clauses 4.2.4, 7.5, 8.2.4; lead auditor: quality manager; scope: production + warehouse",
    },
    PLAN: {
      tr: "örn. 2026 yıllık iç tetkik planı — Q1 üretim, Q2 satın alma, Q3 steril alan; denetçi atamaları",
      en: "e.g. 2026 annual internal audit plan — Q1 production, Q2 purchasing, Q3 clean area; auditor assignments",
    },
    INSTRUCTION: {
      tr: "örn. İç tetkik açılış/kapanış toplantısı — bulgu sınıflandırma (majör/minör), CAPA referansı",
      en: "e.g. Internal audit opening/closing — finding classification (major/minor), CAPA reference",
    },
    LIST: {
      tr: "örn. Denetçi yetkinlik listesi — ISO 19011 eğitimi, denetim deneyimi",
      en: "e.g. Auditor competence list — ISO 19011 training, audit experience",
    },
    DIAGRAM: {
      tr: "örn. İç tetkik süreç akışı — planlama → saha → rapor → CAPA",
      en: "e.g. Internal audit process flow — plan → fieldwork → report → CAPA",
    },
  },
  "SOP-PC": {
    INSTRUCTION: {
      tr: "örn. Enjeksiyon makinası bakım talimatı — marka Arburg, model 320C, aylık yağlama",
      en: "e.g. Injection machine maintenance WI — brand Arburg, model 320C, monthly lubrication",
    },
    FORM: {
      tr: "örn. Üretim günlük kontrol formu — hat no, parti no, operatör, serbest bırakma",
      en: "e.g. Production daily check form — line no, batch no, operator, release signature",
    },
  },
  "SOP-CH": {
    FORM: {
      tr: "örn. Şikâyet formu — ürün, lot, değerlendirme; CAPA gerekmezse yalnız FORM-CH-01",
      en: "e.g. Complaint form — product, lot, assessment; FORM-CH-01 only when no CAPA",
    },
  },
  "SOP-CAPA": {
    FORM: {
      tr: "örn. DÖF formu — uygunsuzluk kaynağı, düzeltici faaliyet, etkinlik doğrulama",
      en: "e.g. CAPA form — nonconformity source, corrective action, effectiveness check",
    },
  },
  "SOP-CC": {
    DIAGRAM: {
      tr: "Değişiklik kontrol süreç akışı — CR, etki, önemli değişiklik, onay, uygulama",
      en: "Change control process flow — CR, impact, significant change, approval, implementation",
    },
    FORM: {
      tr: "Değişiklik talebi / etki / önemli değişiklik formu — CR no, etkilenen ürün, NB gerekliliği",
      en: "Change request / impact / significant change form — CR no, affected product, NB need",
    },
    LIST: {
      tr: "Değişiklik kayıt defteri — CR no, durum, sorumlu, hedef tarih",
      en: "Change register — CR no, status, owner, target date",
    },
    RECORD: {
      tr: "Dolu örnek CR kaydı — etiket revizyonu senaryosu",
      en: "Completed sample CR record — label revision scenario",
    },
  },
  "SOP-AN": {
    DIAGRAM: {
      tr: "Danışma vs FSCA karar ağacı ve MDR bildirim süreleri",
      en: "Advisory vs FSCA decision tree and MDR reporting timelines",
    },
    FORM: {
      tr: "FSN / FSCA formu — ürün, UDI, lot, dağıtım teyidi",
      en: "FSN / FSCA form — product, UDI, lot, distribution acknowledgement",
    },
    INSTRUCTION: {
      tr: "EUDAMED / TİTCK portal bildirim adımları",
      en: "EUDAMED / national portal reporting steps",
    },
    RECORD: {
      tr: "Dolu örnek FSCA vaka kaydı (mock recall)",
      en: "Completed sample FSCA case record (mock recall)",
    },
  },
  "SOP-ORG": {
    DIAGRAM: {
      tr: "örn. Organizasyon şeması — genel müdür, kalite müdürü, üretim, PRRC",
      en: "e.g. Organization chart — GM, quality manager, production, PRRC",
    },
    JOB_DESCRIPTION: {
      tr: "örn. Kalite müdürü görev tanımı — KYS sorumluluğu, yönetim temsilcisi",
      en: "e.g. Quality manager job description — QMS responsibility, management rep",
    },
  },
};

const BY_CHILD_CODE: Record<string, { tr: string; en: string }> = {
  "FORM-IA-01": {
    tr: "örn. İç tetkik kontrol listesi — doküman kontrolü, kayıtlar, üretim, izlenebilirlik, CAPA",
    en: "e.g. Internal audit checklist — document control, records, production, traceability, CAPA",
  },
  "PLAN-IA-01": {
    tr: "örn. Yıllık iç tetkik takvimi — denetim alanları, sorumlu denetçiler, rapor tarihleri",
    en: "e.g. Annual internal audit calendar — areas, lead auditors, report dates",
  },
};

const LAYER_FALLBACK: Record<QmsDocumentLayer, { tr: string; en: string }> = {
  INSTRUCTION: {
    tr: "örn. İş talimatı — ekipman, adımlar, güvenlik, kabul kriterleri",
    en: "e.g. Work instruction — equipment, steps, safety, acceptance criteria",
  },
  FORM: {
    tr: "örn. Form alanları — tarih, sorumlu, onay, kayıt kodu",
    en: "e.g. Form fields — date, responsible person, approval, record code",
  },
  DIAGRAM: {
    tr: "örn. Süreç akışı — adımlar ve sorumlular",
    en: "e.g. Process flow — steps and owners",
  },
  PLAN: {
    tr: "örn. Plan dönemi, aktiviteler, sorumlular, frekans",
    en: "e.g. Plan period, activities, owners, frequency",
  },
  LIST: {
    tr: "örn. Liste sütunları ve güncelleme sorumlusu",
    en: "e.g. List columns and update responsibility",
  },
  SPECIFICATION: {
    tr: "örn. Gereklilik maddeleri ve kabul limitleri",
    en: "e.g. Requirement clauses and acceptance limits",
  },
  JOB_DESCRIPTION: {
    tr: "örn. Rol, raporlama, yetki ve sorumluluklar",
    en: "e.g. Role, reporting line, authority and responsibilities",
  },
  ASSIGNMENT: {
    tr: "örn. Atama kapsamı ve geçerlilik",
    en: "e.g. Appointment scope and validity",
  },
  RECORD: {
    tr: "örn. Kayıt saklama yeri ve süresi",
    en: "e.g. Record storage location and retention",
  },
  OTHER: {
    tr: "örn. Prosedürle ilişkili ek doküman detayı",
    en: "e.g. Supplementary document detail for this procedure",
  },
  MANUAL: { tr: "", en: "" },
  PROCEDURE: { tr: "", en: "" },
};

export function procedureChildHintPlaceholder(
  procedureCode: string | null | undefined,
  layer: QmsDocumentLayer,
  childCode?: string | null,
  locale: Locale = "tr",
): string {
  const contentLocale = binaryContentLang(locale);
  const code = childCode?.trim().toUpperCase();
  if (code && SOP_AN_CHILD_AI_HINTS[code]) {
    return contentLocale === "tr" ? SOP_AN_CHILD_AI_HINTS[code].tr : SOP_AN_CHILD_AI_HINTS[code].en;
  }
  if (code && SOP_CC_CHILD_AI_HINTS[code]) {
    return contentLocale === "tr" ? SOP_CC_CHILD_AI_HINTS[code].tr : SOP_CC_CHILD_AI_HINTS[code].en;
  }
  if (code && BY_CHILD_CODE[code]) {
    return contentLocale === "tr" ? BY_CHILD_CODE[code].tr : BY_CHILD_CODE[code].en;
  }

  const sop = procedureCode?.trim().toUpperCase() ?? "";
  const procLayer = BY_PROCEDURE_LAYER[sop]?.[layer];
  if (procLayer) {
    return contentLocale === "tr" ? procLayer.tr : procLayer.en;
  }

  const fb = LAYER_FALLBACK[layer];
  return contentLocale === "tr" ? fb.tr : fb.en;
}

export function procedureExtraHintPlaceholder(
  procedureCode: string | null | undefined,
  layer: QmsDocumentLayer,
  locale: Locale = "tr",
): string {
  return procedureChildHintPlaceholder(procedureCode, layer, null, locale);
}
