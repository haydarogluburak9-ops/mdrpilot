/** Bilingual TR/EN helpers for certified-style quality manuals (KEK-01 pattern). */

export function bi(tr: string, en: string): string {
  const a = tr.trim();
  const b = en.trim();
  if (a && b) return `${a}\n\n${b}`;
  return a || b;
}

export function sectionHeading(num: string, titleTr: string, titleEn: string): string {
  return `${num} ${titleTr} / ${titleEn}`;
}

export function clauseHeading(clauseNo: string, titleTr: string, titleEn: string): string {
  return `${clauseNo} ${titleTr} / ${titleEn}`;
}

export function chapterHeading(num: string, titleTr: string, titleEn: string): string {
  return `${num}. ${titleTr} / ${titleEn}`;
}
