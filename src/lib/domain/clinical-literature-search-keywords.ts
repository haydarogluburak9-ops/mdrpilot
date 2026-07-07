/** Client-safe English PubMed / literature search keywords (max 5). */

export interface LiteratureSearchKeywordInput {
  productName: string;
  model?: string | null;
  indications?: string | null;
  intendedPurpose?: string | null;
  isSterile?: boolean;
  equivalentDeviceNames?: string[];
}

const MAX_KEYWORDS = 5;

const TR_EN: Record<string, string> = {
  steril: "sterile",
  sterile: "sterile",
  sterilizasyon: "sterilization",
  aseptik: "aseptic",
  oftalmik: "ophthalmic",
  ophthalmic: "ophthalmic",
  goz: "eye",
  göz: "eye",
  gozu: "eye",
  kornea: "corneal",
  korneal: "corneal",
  cornea: "corneal",
  sklera: "scleral",
  scleral: "scleral",
  retina: "retinal",
  retinal: "retinal",
  katarakt: "cataract",
  cataract: "cataract",
  vitrektomi: "vitrectomy",
  vitrectomy: "vitrectomy",
  glokom: "glaucoma",
  glaucoma: "glaucoma",
  bicak: "knife",
  bıçak: "knife",
  kesici: "knife",
  knife: "knife",
  blade: "blade",
  scalpel: "scalpel",
  keratome: "keratome",
  microkeratome: "microkeratome",
  insizyon: "incision",
  incision: "incision",
  cerrahi: "surgery",
  surgery: "surgery",
  medikal: "medical",
  medical: "medical",
  tibbi: "medical",
  tıbbi: "medical",
  cihaz: "device",
  device: "device",
  implant: "implant",
  implantable: "implantable",
  kalp: "cardiac",
  cardiac: "cardiac",
  ortopedik: "orthopedic",
  orthopedic: "orthopedic",
  dental: "dental",
  dis: "dental",
  diş: "dental",
  endikasyon: "indication",
  indication: "indication",
  tedavi: "treatment",
  treatment: "treatment",
  perforasyon: "perforation",
  perforation: "perforation",
  enfeksiyon: "infection",
  infection: "infection",
  komplikasyon: "complication",
  complication: "complication",
  advers: "adverse",
  adverse: "adverse",
  guvenlik: "safety",
  güvenlik: "safety",
  safety: "safety",
  performans: "performance",
  performance: "performance",
};

function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .trim();
}

function isLikelyEnglishWord(word: string): boolean {
  return /^[a-z][a-z0-9-]*$/i.test(word) && !TR_EN[normalizeToken(word)];
}

function translateTokens(text: string): string[] {
  const tokens = text.split(/[\s,/;()+–\-]+/).map((t) => t.trim()).filter((t) => t.length > 1);
  const out: string[] = [];
  for (const raw of tokens) {
    const key = normalizeToken(raw);
    const mapped = TR_EN[key];
    if (mapped) {
      out.push(mapped);
      continue;
    }
    if (isLikelyEnglishWord(raw)) {
      out.push(raw.toLowerCase());
    }
  }
  return out;
}

function uniquePhrases(phrases: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const phrase of phrases) {
    const cleaned = phrase.trim().replace(/\s+/g, " ");
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out;
}

/** Translate product profile text to a short English phrase. */
export function translateToEnglishPhrase(text: string): string {
  const tokens = uniquePhrases(translateTokens(text));
  return tokens.join(" ").trim();
}

export function buildEnglishDevicePhrase(productName: string, isSterile?: boolean): string {
  const tokens = uniquePhrases(translateTokens(productName));
  if (isSterile && !tokens.includes("sterile")) {
    tokens.unshift("sterile");
  }
  return tokens.join(" ").trim();
}

function buildEnglishIndicationPhrase(
  indications?: string | null,
  intendedPurpose?: string | null,
): string {
  const source = [indications, intendedPurpose].filter(Boolean).join(" ");
  const tokens = uniquePhrases(translateTokens(source));
  const stop = new Set([
    "medical",
    "device",
    "sterile",
    "ophthalmic",
    "knife",
    "blade",
    "scalpel",
    "treatment",
    "indication",
    "safety",
    "performance",
  ]);
  const meaningful = tokens.filter((t) => !stop.has(t));
  if (!meaningful.length) return "";
  return meaningful.slice(0, 3).join(" ");
}

function buildEnglishEquivalentPhrase(deviceName: string): string {
  const tokens = uniquePhrases(translateTokens(deviceName));
  const generic = tokens.filter(
    (t) =>
      !/^(inc|ltd|llc|gmbh|corp|company|medical|surgical)$/i.test(t) && t.length > 2,
  );
  if (!generic.length) return translateToEnglishPhrase(deviceName);
  return generic.slice(0, 4).join(" ");
}

function pushKeyword(keywords: string[], phrase: string) {
  const cleaned = phrase.trim().replace(/\s+/g, " ");
  if (!cleaned || keywords.length >= MAX_KEYWORDS) return;
  if (keywords.some((k) => k.toLowerCase() === cleaned.toLowerCase())) return;
  keywords.push(cleaned);
}

/** Up to 5 English keywords: device, equivalent product, indication (priority order). */
export function buildLiteratureSearchKeywords(input: LiteratureSearchKeywordInput): string[] {
  const keywords: string[] = [];

  const devicePhrase = buildEnglishDevicePhrase(input.productName, input.isSterile);
  pushKeyword(keywords, devicePhrase);

  for (const name of input.equivalentDeviceNames ?? []) {
    if (keywords.length >= MAX_KEYWORDS) break;
    const before = keywords.length;
    pushKeyword(keywords, buildEnglishEquivalentPhrase(name));
    if (keywords.length > before) break;
  }

  const indicationPhrase = buildEnglishIndicationPhrase(input.indications, input.intendedPurpose);
  pushKeyword(keywords, indicationPhrase);

  if (input.model?.trim() && keywords.length < MAX_KEYWORDS) {
    const modelPhrase = translateToEnglishPhrase(input.model);
    if (modelPhrase && !devicePhrase.toLowerCase().includes(modelPhrase.toLowerCase())) {
      pushKeyword(keywords, modelPhrase);
    }
  }

  if (!keywords.length) {
    pushKeyword(keywords, "medical device");
  }

  return keywords.slice(0, MAX_KEYWORDS);
}

export function buildPubMedQueryFromKeywords(keywords: string[]): string {
  const terms = keywords
    .slice(0, MAX_KEYWORDS)
    .map((k) => k.trim())
    .filter(Boolean);
  if (!terms.length) return "medical device[Title/Abstract]";
  if (terms.length === 1) return `${terms[0]}[Title/Abstract]`;
  return `(${terms.map((t) => `${t}[Title/Abstract]`).join(" OR ")})`;
}

export function buildLiteratureSearchQuery(input: LiteratureSearchKeywordInput): string {
  return buildPubMedQueryFromKeywords(buildLiteratureSearchKeywords(input));
}

/** @deprecated Use buildLiteratureSearchQuery — kept for callers passing legacy blobs. */
export function buildPubMedQueryFromDevice(productName: string, purpose?: string | null): string {
  return buildLiteratureSearchQuery({
    productName,
    intendedPurpose: purpose,
    indications: purpose,
  });
}
