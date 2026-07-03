export const TRANSLATOR_LOCALES = ["tr", "en", "de", "fr", "es", "it", "nl"] as const;

export type TranslatorLocale = (typeof TRANSLATOR_LOCALES)[number];

/** Native language names for UI dropdowns. */
export const TRANSLATOR_LOCALE_LABELS: Record<TranslatorLocale, string> = {
  tr: "Türkçe",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  nl: "Nederlands",
};

/** English names for AI translation prompts. */
export const TRANSLATOR_LOCALE_AI_NAMES: Record<TranslatorLocale, string> = {
  tr: "Turkish",
  en: "English",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  nl: "Dutch",
};

export function isTranslatorLocale(v: unknown): v is TranslatorLocale {
  return typeof v === "string" && (TRANSLATOR_LOCALES as readonly string[]).includes(v);
}

/** Heuristic locale detection for uploaded documents (auto source language). */
export function detectDocumentLocale(text: string): TranslatorLocale {
  const sample = text.slice(0, 15000);
  if (/[ğıüşöçİĞÜŞÖÇ]/.test(sample)) return "tr";

  const scores: Record<TranslatorLocale, number> = {
    tr: 0,
    en: 0,
    de: 0,
    fr: 0,
    es: 0,
    it: 0,
    nl: 0,
  };

  if (/[äöüßÄÖÜ]/.test(sample)) scores.de += 8;
  if (/[àâçéèêëîïôùûüœæ]/i.test(sample)) scores.fr += 6;
  if (/[ñ¿¡]/i.test(sample) || /\b(el|la|los|las|para|con|por)\b/i.test(sample)) scores.es += 4;
  if (/\b(il|gli|della|delle|perché|è)\b/i.test(sample)) scores.it += 4;
  if (/\b(het|een|van|voor|niet|zijn)\b/i.test(sample)) scores.nl += 4;

  const wordHits: [TranslatorLocale, RegExp][] = [
    ["en", /\b(the|and|procedure|device|manufacturer|shall|requirements)\b/gi],
    ["de", /\b(und|der|die|das|für|nicht|gerät|hersteller|verfahren)\b/gi],
    ["fr", /\b(et|le|la|les|pour|dispositif|fabricant|procédure)\b/gi],
    ["es", /\b(y|el|la|los|dispositivo|fabricante|procedimiento)\b/gi],
    ["it", /\b(e|il|la|dispositivo|fabbricante|procedura)\b/gi],
    ["nl", /\b(en|het|de|apparaat|fabrikant|procedure)\b/gi],
    ["tr", /\b(ve|bu|için|cihaz|üretici|prosedür)\b/gi],
  ];

  for (const [locale, re] of wordHits) {
    scores[locale] += sample.match(re)?.length ?? 0;
  }

  let best: TranslatorLocale = "en";
  let bestScore = -1;
  for (const locale of TRANSLATOR_LOCALES) {
    if (scores[locale] > bestScore) {
      bestScore = scores[locale];
      best = locale;
    }
  }
  return best;
}
