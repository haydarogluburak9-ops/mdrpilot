/**

 * Current harmonised / state-of-the-art edition suffixes for standard references.

 * Regulatory citations (MDR, Directives) are passed through unchanged.

 */

export const STANDARD_EDITIONS: Record<string, string> = {

  "ISO 14971": "ISO 14971:2019",

  "ISO 13485": "ISO 13485:2016",

  "ISO 9001": "ISO 9001:2015",

  "ISO 10993": "ISO 10993-1:2018",

  "ISO 10993-1": "ISO 10993-1:2018",

  "ISO 10993-17": "ISO 10993-17:2023",

  "ISO/TR 10993-22": "ISO/TR 10993-22:2017",

  "ISO 15223-1": "ISO 15223-1:2021",

  "ISO 20417": "ISO 20417:2021",

  "ISO 11607": "ISO 11607-1:2019",

  "ISO 11607-1": "ISO 11607-1:2019",

  "ISO 11607-2": "ISO 11607-2:2019",

  "ISO 11135": "ISO 11135:2014",

  "ISO 11137": "ISO 11137-1:2006",

  "ISO 11137-1": "ISO 11137-1:2006",

  "ISO 17665": "ISO 17665:2006",

  "ISO 17664": "ISO 17664-1:2021",

  "ISO 17664-1": "ISO 17664-1:2021",

  "ISO 14708": "ISO 14708-1:2014",

  "ISO 14708-1": "ISO 14708-1:2014",

  "ISO 14155": "ISO 14155:2020",

  "ISO 22442": "ISO 22442-1:2020",

  "ISO 22442-1": "ISO 22442-1:2020",

  "IEC 62366-1": "IEC 62366-1:2015+A1:2020",

  "IEC 62304": "IEC 62304:2006+A1:2015",

  "IEC 60601-1": "IEC 60601-1:2005+A1:2012+A2:2020",

  "IEC 60601-1-2": "IEC 60601-1-2:2014",

  "IEC 60601-1-3": "IEC 60601-1-3:2008+A1:2013",

  "IEC 60601-1-8": "IEC 60601-1-8:2006+A1:2012",

  "IEC 81001-5-1": "IEC 81001-5-1:2021",

};



/** Strip harmonised "EN" prefix for catalogue lookup. */

export function bareStandardKey(standard: string): string {

  return standard.trim().replace(/^EN\s+/i, "");

}



function lookupEdition(token: string): string | undefined {

  const t = token.trim();

  return STANDARD_EDITIONS[t] ?? STANDARD_EDITIONS[bareStandardKey(t)];

}



/** Expand a single standard token to its edition-qualified form if known. */

export function editionOf(standard: string): string {

  const t = standard.trim();

  const ed = lookupEdition(t);

  if (!ed) return t;

  if (/^EN\s+/i.test(t)) return `EN ${ed}`;

  return ed;

}



/** Format a compound standard reference (slash / semicolon separated) with edition years. */

export function formatStandardReference(ref: string | null | undefined): string | null {

  if (!ref?.trim()) return ref ?? null;

  return ref

    .split(/\s*[/;]\s*/)

    .map((part) => editionOf(part))

    .join(" / ");

}



/** Join multiple standards with full edition labels. */

export function joinStandards(...parts: string[]): string {

  return parts.map(editionOf).join(" / ");

}



const STD_TOKEN_RE = /\b((?:EN\s+)?(?:ISO(?:\/TR)?|IEC)\s+\d+(?:-\d+)*)\b(?!\s*:\d)/gi;



/**

 * Expand short ISO/IEC tokens inside free text (parentheses, comma lists, hints).

 * Skips tokens that already include an edition year (e.g. ISO 14971:2019).

 */

export function formatStandardsInText(text: string | null | undefined): string | null {

  if (!text?.trim()) return text ?? null;

  return text.replace(STD_TOKEN_RE, (match) => editionOf(match));

}



/** Display label for stored standard codes (e.g. ISO_14971 → ISO 14971:2019). */

export function displayStandardCode(code: string): string {

  const normalized = code.replace(/_/g, " ").trim();

  if (normalized === "MDR") return "MDR 2017/745";

  return editionOf(normalized);

}



/** Standards library list/detail: code + optional DB version → full reference. */

export function formatStandardLabel(code: string, version?: string | null): string {

  const ed = editionOf(code);

  if (ed !== code.trim()) return ed;

  const v = version?.trim();

  if (v && !/:\d{4}/.test(code)) return `${code}:${v}`;

  return code;

}


