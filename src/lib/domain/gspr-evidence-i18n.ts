import { editionOf, joinStandards } from "./standards-catalog";

const RM = editionOf("ISO 14971");
const USAB = editionOf("IEC 62366-1");
const BIO = editionOf("ISO 10993-1");
const LABEL = joinStandards("ISO 15223-1", "ISO 20417");
const SW = editionOf("IEC 62304");
const ISO17664 = editionOf("ISO 17664");

const HINTS_EN: Record<string, string> = {
  "1": `Risk management file / benefit-risk analysis (${RM})`,
  "3": `Risk management plan and report (${RM})`,
  "5": `Usability engineering file (${USAB})`,
  "10.1": `Biological evaluation plan/report (${BIO})`,
  "11.2": `Reprocessing / cleaning validation (${ISO17664})`,
  "11.4": "Sterilization validation report",
  "17.2": `Software lifecycle records (${SW})`,
  "23.1": `Label and IFU (${LABEL})`,
  "23.2": "Label artwork",
  "23.4": "Instructions for use",
};

const HINTS_TR: Record<string, string> = {
  "1": `Risk yönetim dosyası / fayda-risk analizi (${RM})`,
  "3": `Risk yönetim planı ve raporu (${RM})`,
  "5": `Kullanılabilirlik mühendisliği dosyası (${USAB})`,
  "10.1": `Biyolojik değerlendirme planı/raporu (${BIO})`,
  "11.2": `Yeniden işleme / temizlik validasyonu (${ISO17664})`,
  "11.4": "Sterilizasyon validasyon raporu",
  "17.2": `Yazılım yaşam döngüsü kayıtları (${SW})`,
  "23.1": `Etiket ve KIF (${LABEL})`,
  "23.2": "Etiket görseli",
  "23.4": "Kullanım kılavuzu (KIF)",
};

/** Auto-fill evidence hint for a GSPR row in the user's locale. */
export function getGsprEvidenceHint(gsprNo: string, locale: string): string | undefined {
  const map = locale === "tr" ? HINTS_TR : HINTS_EN;
  return map[gsprNo];
}

export function ifuEvidenceHint(version: string, locale: string): string {
  return locale === "tr" ? `Kullanım kılavuzu ${version}` : `IFU ${version}`;
}

export function labelArtworkHint(locale: string): string {
  return locale === "tr" ? "Etiket görseli (uygulama içi)" : "Label artwork (in-app)";
}

const ALL_AUTO_HINTS = new Set([
  ...Object.values(HINTS_EN),
  ...Object.values(HINTS_TR),
]);

/** Normalize hint text so edition-year differences still match auto-fill placeholders. */
function normalizeGsprHintText(text: string): string {
  return text
    .trim()
    .replace(/:\d{4}(?:\+[^\s)]*)?/g, "")
    .replace(/\s+/g, " ");
}

/** True when evidenceDocument is an auto-suggested placeholder, not user/file evidence. */
export function isGsprAutoHint(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  const t = text.trim();
  if (ALL_AUTO_HINTS.has(t)) return true;
  const normalized = normalizeGsprHintText(t);
  for (const hint of ALL_AUTO_HINTS) {
    if (normalizeGsprHintText(hint) === normalized) return true;
  }
  if (/^IFU\s+\S+/i.test(t)) return true;
  if (/^Kullanım kılavuzu\s+\S+/i.test(t)) return true;
  return false;
}

const EXACT_MAP = new Map<string, string>();
for (const key of Object.keys(HINTS_EN)) {
  EXACT_MAP.set(HINTS_EN[key], HINTS_TR[key]);
}
EXACT_MAP.set("Label artwork (in-app)", "Etiket görseli (uygulama içi)");

/** Localize stored evidence text for display (auto-hints and legacy English rows). */
export function localizeEvidenceDocument(
  text: string | null | undefined,
  locale: string,
  gsprNo?: string,
): string | null {
  if (!text?.trim()) return text ?? null;
  if (locale !== "tr") return text;
  const t = text.trim();

  if (gsprNo && isGsprAutoHint(t)) {
    const hint = getGsprEvidenceHint(gsprNo, "tr");
    if (hint) return hint;
  }

  const exact = EXACT_MAP.get(t);
  if (exact) return exact;

  const normalized = normalizeGsprHintText(t);
  for (const [en, tr] of EXACT_MAP) {
    if (normalizeGsprHintText(en) === normalized) return tr;
  }

  const ifu = t.match(/^IFU\s+(.+)$/i);
  if (ifu) return `Kullanım kılavuzu ${ifu[1]}`;
  return t;
}
