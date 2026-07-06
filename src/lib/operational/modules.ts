import type { OperationalModuleKind } from "@prisma/client";

export type OperationalModuleSlug =
  | "internal-audit"
  | "ncp"
  | "fsca"
  | "vigilance"
  | "change-control"
  | "management-review"
  | "training"
  | "supplier-eval"
  | "traceability"
  | "calibration";

export type OperationalModuleIconKey =
  | "clipboard-check"
  | "alert-octagon"
  | "shield-alert"
  | "eye"
  | "git-branch"
  | "users"
  | "graduation-cap"
  | "truck"
  | "alert-triangle"
  | "message-square"
  | "package"
  | "gauge";

export type OperationalHubSlug = OperationalModuleSlug | "capa" | "complaints";

export interface OperationalHubItem {
  slug: OperationalHubSlug;
  labelKey: string;
  descKey: string;
  iconKey: OperationalModuleIconKey;
  href: string;
  formCode?: string;
  sopCode?: string;
}

export interface OperationalModuleDef {
  slug: OperationalModuleSlug;
  kind: OperationalModuleKind;
  formCode: string;
  sopCode: string;
  labelKey: string;
  descKey: string;
  iconKey: OperationalModuleIconKey;
  statusOrder: readonly string[];
  referenceAliases: string[];
  titleAliases: string[];
  descriptionAliases: string[];
  ownerAliases: string[];
  dueDateAliases: string[];
  capaRefAliases: string[];
  eventDateAliases: string[];
}

export const OPERATIONAL_MODULES: Record<OperationalModuleSlug, OperationalModuleDef> = {
  "internal-audit": {
    slug: "internal-audit",
    kind: "INTERNAL_AUDIT",
    formCode: "FORM-IA-01",
    sopCode: "SOP-IA",
    labelKey: "operational.modules.internalAudit",
    descKey: "operational.modules.internalAuditDesc",
    iconKey: "clipboard-check",
    statusOrder: ["OPEN", "IN_PROGRESS", "CLOSED", "OVERDUE"],
    referenceAliases: ["tetkik no", "audit no"],
    titleAliases: ["kapsam / alan", "scope / area"],
    descriptionAliases: ["not", "note"],
    ownerAliases: ["denetçi", "lead auditor"],
    dueDateAliases: ["tarih", "date"],
    capaRefAliases: ["capa no", "capa no."],
    eventDateAliases: ["tarih", "date"],
  },
  ncp: {
    slug: "ncp",
    kind: "NCP",
    formCode: "FORM-NCP-01",
    sopCode: "SOP-NCP",
    labelKey: "operational.modules.ncp",
    descKey: "operational.modules.ncpDesc",
    iconKey: "alert-octagon",
    statusOrder: ["OPEN", "IN_PROGRESS", "CLOSED", "OVERDUE"],
    referenceAliases: ["ncp no", "ncp no.", "referans no", "reference no"],
    titleAliases: ["ürün / lot", "product / lot", "açıklama", "description"],
    descriptionAliases: ["uygunsuzluk açıklaması", "nonconformity description", "açıklama", "description"],
    ownerAliases: ["sorumlu", "owner", "değerlendiren", "assessed by"],
    dueDateAliases: ["hedef tarih", "target date", "düzeltme tarihi", "correction date"],
    capaRefAliases: ["capa ref", "capa no", "capa no."],
    eventDateAliases: ["tespit tarihi", "detection date", "tarih", "date"],
  },
  fsca: {
    slug: "fsca",
    kind: "FSCA",
    formCode: "FORM-AN-01",
    sopCode: "SOP-AN",
    labelKey: "operational.modules.fsca",
    descKey: "operational.modules.fscaDesc",
    iconKey: "shield-alert",
    statusOrder: ["OPEN", "IN_PROGRESS", "MONITORING", "CLOSED"],
    referenceAliases: ["fsca no", "fsca no.", "referans no", "reference no", "vaka no", "case no"],
    titleAliases: ["ürün / model", "product / model", "olay özeti", "event summary"],
    descriptionAliases: ["olay açıklaması", "event description", "açıklama", "description"],
    ownerAliases: ["sorumlu", "owner", "fsca sorumlusu", "fsca owner"],
    dueDateAliases: ["hedef tarih", "target date", "bildirim tarihi", "notification date"],
    capaRefAliases: ["capa no", "capa no."],
    eventDateAliases: ["olay tarihi", "event date", "tarih", "date"],
  },
  vigilance: {
    slug: "vigilance",
    kind: "VIGILANCE",
    formCode: "FORM-VG-01",
    sopCode: "SOP-VG",
    labelKey: "operational.modules.vigilance",
    descKey: "operational.modules.vigilanceDesc",
    iconKey: "eye",
    statusOrder: ["OPEN", "IN_PROGRESS", "MONITORING", "CLOSED"],
    referenceAliases: ["vigilans no", "vigilance no", "bildirim no", "report no", "referans no", "reference no"],
    titleAliases: ["ürün", "product", "olay türü", "incident type"],
    descriptionAliases: ["olay açıklaması", "incident description", "açıklama", "description"],
    ownerAliases: ["bildiren", "reporter", "sorumlu", "owner"],
    dueDateAliases: ["bildirim tarihi", "report date", "son tarih", "deadline"],
    capaRefAliases: ["capa no", "capa no.", "şikâyet ref", "complaint ref"],
    eventDateAliases: ["olay tarihi", "incident date", "tarih", "date"],
  },
  "change-control": {
    slug: "change-control",
    kind: "CHANGE_CONTROL",
    formCode: "FORM-CC-01",
    sopCode: "SOP-CC",
    labelKey: "operational.modules.changeControl",
    descKey: "operational.modules.changeControlDesc",
    iconKey: "git-branch",
    statusOrder: ["OPEN", "IN_PROGRESS", "CLOSED", "OVERDUE"],
    referenceAliases: ["cr no", "değişiklik no", "change no", "referans no", "reference no"],
    titleAliases: ["değişiklik tanımı", "change description", "başlık", "title"],
    descriptionAliases: ["değişiklik açıklaması", "change description", "açıklama", "description"],
    ownerAliases: ["talep eden", "requested by", "sorumlu", "owner"],
    dueDateAliases: ["hedef uygulama tarihi", "target implementation date", "hedef tarih", "target date"],
    capaRefAliases: ["capa no", "capa no."],
    eventDateAliases: ["talep tarihi", "request date", "tarih", "date"],
  },
  "management-review": {
    slug: "management-review",
    kind: "MANAGEMENT_REVIEW",
    formCode: "FORM-MR-01",
    sopCode: "SOP-MR",
    labelKey: "operational.modules.managementReview",
    descKey: "operational.modules.managementReviewDesc",
    iconKey: "users",
    statusOrder: ["OPEN", "IN_PROGRESS", "CLOSED"],
    referenceAliases: ["toplantı no", "meeting no", "referans no", "reference no"],
    titleAliases: ["katılımcılar", "participants"],
    descriptionAliases: ["iç tetkik sonuçları", "internal audit results", "capa durumu", "capa status"],
    ownerAliases: ["yönetim temsilcisi", "management representative", "sorumlu", "owner"],
    dueDateAliases: ["toplantı tarihi", "meeting date", "tarih", "date"],
    capaRefAliases: [],
    eventDateAliases: ["toplantı tarihi", "meeting date"],
  },
  training: {
    slug: "training",
    kind: "TRAINING",
    formCode: "FORM-HR-01",
    sopCode: "SOP-HR",
    labelKey: "operational.modules.training",
    descKey: "operational.modules.trainingDesc",
    iconKey: "graduation-cap",
    statusOrder: ["OPEN", "IN_PROGRESS", "CLOSED"],
    referenceAliases: ["eğitim no", "training no", "kayıt no", "record no", "referans no", "reference no"],
    titleAliases: ["eğitim konusu", "training topic", "konu", "topic"],
    descriptionAliases: ["eğitim içeriği", "training content", "açıklama", "description"],
    ownerAliases: ["eğitmen", "trainer", "sorumlu", "owner"],
    dueDateAliases: ["eğitim tarihi", "training date", "tarih", "date"],
    capaRefAliases: [],
    eventDateAliases: ["eğitim tarihi", "training date"],
  },
  "supplier-eval": {
    slug: "supplier-eval",
    kind: "SUPPLIER_EVAL",
    formCode: "FORM-SE-01",
    sopCode: "SOP-SE",
    labelKey: "operational.modules.supplierEval",
    descKey: "operational.modules.supplierEvalDesc",
    iconKey: "truck",
    statusOrder: ["OPEN", "IN_PROGRESS", "CLOSED", "OVERDUE"],
    referenceAliases: ["değerlendirme no", "evaluation no", "referans no", "reference no"],
    titleAliases: ["tedarikçi adı", "supplier name", "tedarikçi", "supplier"],
    descriptionAliases: ["değerlendirme özeti", "evaluation summary", "açıklama", "description", "not", "note"],
    ownerAliases: ["değerlendiren", "evaluator", "sorumlu", "owner"],
    dueDateAliases: ["yeniden değerlendirme tarihi", "re-evaluation date", "hedef tarih", "target date"],
    capaRefAliases: ["capa no", "capa no."],
    eventDateAliases: ["değerlendirme tarihi", "evaluation date", "tarih", "date"],
  },
  traceability: {
    slug: "traceability",
    kind: "TRACEABILITY",
    formCode: "FORM-TR-01",
    sopCode: "SOP-TR",
    labelKey: "operational.modules.traceability",
    descKey: "operational.modules.traceabilityDesc",
    iconKey: "package",
    statusOrder: ["OPEN", "IN_PROGRESS", "CLOSED", "OVERDUE"],
    referenceAliases: ["lot no", "batch no", "seri no", "serial no", "referans no", "reference no"],
    titleAliases: ["ürün", "product", "lot / seri", "lot / serial"],
    descriptionAliases: ["izlenebilirlik notu", "traceability note", "açıklama", "description"],
    ownerAliases: ["sorumlu", "owner", "kayıt sahibi", "record owner"],
    dueDateAliases: ["kayıt tarihi", "record date", "tarih", "date"],
    capaRefAliases: ["capa no", "capa no.", "şikâyet ref", "complaint ref"],
    eventDateAliases: ["üretim tarihi", "production date", "tarih", "date"],
  },
  calibration: {
    slug: "calibration",
    kind: "CALIBRATION",
    formCode: "FORM-ME-01",
    sopCode: "SOP-ME",
    labelKey: "operational.modules.calibration",
    descKey: "operational.modules.calibrationDesc",
    iconKey: "gauge",
    statusOrder: ["OPEN", "IN_PROGRESS", "CLOSED", "OVERDUE", "MONITORING"],
    referenceAliases: ["cihaz kodu", "ekipman no", "equipment no", "device code", "cihaz no", "device id", "referans no", "reference no"],
    titleAliases: ["cihaz adı", "ekipman adı", "equipment name", "ölçüm cihazı", "measuring device"],
    descriptionAliases: ["kalibrasyon notu", "calibration note", "açıklama", "description"],
    ownerAliases: ["cihaz sorumlusu", "sorumlu", "owner", "kalibrasyon sorumlusu", "calibration owner"],
    dueDateAliases: ["gelecek kalibrasyon tarihi", "sonraki kalibrasyon", "next calibration", "hedef tarih", "target date"],
    capaRefAliases: ["capa no", "capa no."],
    eventDateAliases: ["kalibrasyon tarihi", "calibration date", "tarih", "date"],
  },
};

export const OPERATIONAL_MODULE_SLUGS = Object.keys(OPERATIONAL_MODULES) as OperationalModuleSlug[];

/** Hub cards: CAPA + complaints first, then extended operational modules. */
export const OPERATIONAL_HUB_ITEMS: OperationalHubItem[] = [
  {
    slug: "complaints",
    labelKey: "nav.complaints",
    descKey: "operational.modules.complaintsDesc",
    iconKey: "message-square",
    href: "/operational/complaints",
    formCode: "FORM-CH-01",
    sopCode: "SOP-CH",
  },
  {
    slug: "capa",
    labelKey: "nav.capa",
    descKey: "operational.modules.capaDesc",
    iconKey: "alert-triangle",
    href: "/operational/capa",
    formCode: "FORM-CAPA-01",
    sopCode: "SOP-CAPA",
  },
  ...OPERATIONAL_MODULE_SLUGS.map((slug) => {
    const def = OPERATIONAL_MODULES[slug];
    return {
      slug,
      labelKey: def.labelKey,
      descKey: def.descKey,
      iconKey: def.iconKey,
      href: `/operational/${slug}`,
      formCode: def.formCode,
      sopCode: def.sopCode,
    };
  }),
];

export const FORM_CODE_TO_MODULE: Record<string, OperationalModuleSlug> = {
  "FORM-NCP-01": "ncp",
  "FORM-AN-01": "fsca",
  "FORM-VG-01": "vigilance",
  "FORM-CC-01": "change-control",
  "FORM-CC-02": "change-control",
  "FORM-CC-03": "change-control",
  "FORM-MR-01": "management-review",
  "FORM-HR-01": "training",
  "FORM-SE-01": "supplier-eval",
  "FORM-TR-01": "traceability",
  "FORM-ME-01": "calibration",
};

export function getModuleDef(slug: string): OperationalModuleDef | null {
  const key = slug.trim().toLowerCase() as OperationalModuleSlug;
  return OPERATIONAL_MODULES[key] ?? null;
}

export function getModuleByFormCode(code: string): OperationalModuleDef | null {
  const slug = FORM_CODE_TO_MODULE[code.trim().toUpperCase()];
  return slug ? OPERATIONAL_MODULES[slug] : null;
}

export type OperationalLinkModule = OperationalModuleSlug | "capa" | "complaint";

export function operationalModuleForFormCode(code: string | null | undefined): OperationalLinkModule | null {
  const c = (code ?? "").trim().toUpperCase();
  if (!c) return null;
  if (c === "FORM-CAPA-01") return "capa";
  if (c === "FORM-CH-01" || c === "FORM-CH-02") return "complaint";
  if (c === "FORM-IA-01" || c === "PLAN-IA-01" || c === "REC-IA-01") return "internal-audit";
  const slug = FORM_CODE_TO_MODULE[c];
  return slug ?? null;
}

export function parseOperationalLink(
  recordParam: string | undefined,
): { module: OperationalLinkModule; id: string } | undefined {
  const trimmed = recordParam?.trim();
  if (!trimmed?.includes(":")) return undefined;
  const [mod, id] = trimmed.split(":", 2);
  if (!id?.trim()) return undefined;
  const modSlug = mod.trim().toLowerCase();
  if (modSlug === "capa" || modSlug === "complaint") {
    return { module: modSlug, id: id.trim() };
  }
  if (OPERATIONAL_MODULE_SLUGS.includes(modSlug as OperationalModuleSlug)) {
    return { module: modSlug as OperationalModuleSlug, id: id.trim() };
  }
  return undefined;
}
