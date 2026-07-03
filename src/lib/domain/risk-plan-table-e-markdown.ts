import type { RiskPlanTableERow } from "./risk-table-e";

function escCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

function groupKey(row: RiskPlanTableERow): string {
  return `${row.categoryTr}::${row.groupTr ?? ""}`;
}

function renderTable(
  chunk: RiskPlanTableERow[],
  locale: "tr" | "en",
): string {
  const colHazard = locale === "tr" ? "Tehlike örneği" : "Hazard example";
  const colStatus = locale === "tr" ? "Durum" : "Status";
  const colJust = locale === "tr" ? "Değerlendirme" : "Assessment";
  const colFmea = locale === "tr" ? "FMEA risk kodu" : "FMEA risk code";

  const lines = [
    `| ${colHazard} | ${colStatus} | ${colJust} | ${colFmea} |`,
    `| --- | --- | --- | --- |`,
  ];

  for (const row of chunk) {
    const hazard = locale === "tr" ? row.hazardTr : row.hazardEn;
    const just =
      locale === "tr"
        ? row.justificationTr || row.justificationEn
        : row.justificationEn || row.justificationTr;
    const status = row.status || "—";
    const fmea = row.linkedRiskNo?.trim() || "—";
    lines.push(`| ${escCell(hazard)} | ${status} | ${escCell(just)} | ${fmea} |`);
  }
  return lines.join("\n");
}

export function buildTableEMarkdown(
  rows: RiskPlanTableERow[],
  locale: "tr" | "en",
  intro?: string,
): string {
  const parts: string[] = [];
  if (intro?.trim()) parts.push(intro.trim());

  let currentCategory = "";
  let currentGroupKey = "";
  let chunk: RiskPlanTableERow[] = [];

  const flush = () => {
    if (!chunk.length) return;
    parts.push(renderTable(chunk, locale));
    chunk = [];
  };

  for (const row of rows) {
    const category = locale === "tr" ? row.categoryTr : row.categoryEn;
    const gk = groupKey(row);
    const group = locale === "tr" ? row.groupTr : row.groupEn;

    if (category && category !== currentCategory) {
      flush();
      currentCategory = category;
      currentGroupKey = "";
      parts.push(`\n### ${category}`);
    }
    if (group && gk !== currentGroupKey) {
      flush();
      currentGroupKey = gk;
      parts.push(`\n#### ${group}`);
    }
    chunk.push(row);
  }
  flush();

  return parts.join("\n\n").trim();
}

export function buildTableE1PlanSection(
  rows: RiskPlanTableERow[],
  locale: "tr" | "en",
  fmeaRef: string,
  annexARef: string,
): string {
  const intro =
    locale === "tr"
      ? `ISO/TR 24971 Ek E.1 tehlike örnekleri ürün için değerlendirilmiştir. Riskli etkiler «A» ile işaretlenmiştir; uygulanmayan etkiler «N/A» olarak tanımlanmıştır.\n\nDetaylı FMEA satırları ${fmeaRef} ile; Ek A (${annexARef}) ile ilişkilendirilir. «FMEA risk kodu» sütunu kategori baş harfleri ve sıra numarasından oluşan risk kodunu gösterir (ör. TS1, EH2).`
      : `ISO/TR 24971 Annex E.1 hazard examples have been evaluated for the product. Risky effects are marked «A»; non-applicable effects are «N/A».\n\nDetailed FMEA rows are linked via ${fmeaRef} and Annex A (${annexARef}). The FMEA risk code column shows the category-initials risk code (e.g. TS1, EH2).`;

  const body = buildTableEMarkdown(rows, locale);
  const caption =
    locale === "tr"
      ? "*Tablo E.1 — Tehlike Örnekleri*"
      : "*Table E.1 — Hazard Examples*";

  return `${intro}\n\n${body}\n\n${caption}`;
}

/** Plan markdown içinde Bölüm 6/7 tablolarını FMEA bağlantılı içerikle değiştirir. */
export function injectPlanTableESections(
  markdown: string,
  tableE1Detail: string,
  tableE2Detail: string,
  locale: "tr" | "en",
): string {
  const block6 =
    locale === "tr"
      ? `## 6. Tablo E.1 — Tehlike Örnekleri\n\n${tableE1Detail}`
      : `## 6. Table E.1 — Hazard Examples\n\n${tableE1Detail}`;
  const block7 =
    locale === "tr"
      ? `## 7. Tablo E.2 — Tetikleyen Olay ve Durum Örnekleri\n\n${tableE2Detail}`
      : `## 7. Table E.2 — Initiating Event and Circumstance Examples\n\n${tableE2Detail}`;

  let out = markdown;
  const re6 = /## 6\.[^\n]*\n[\s\S]*?(?=\n## 7\.)/;
  const re7 = /## 7\.[^\n]*\n[\s\S]*?(?=\n## 8\.)/;
  if (re6.test(out)) out = out.replace(re6, `${block6}\n\n`);
  else out = `${out.trim()}\n\n${block6}`;
  if (re7.test(out)) out = out.replace(re7, `${block7}\n\n`);
  else out = `${out.trim()}\n\n${block7}`;
  return out.trim();
}

export function buildPlanApprovalMarkdown(locale: "tr" | "en", date: string): string {
  if (locale === "tr") {
    return [
      "## Onay",
      "",
      "| Görev | Ad / Ünvan | İmza | Tarih |",
      "| --- | --- | --- | --- |",
      `| Hazırlayan | Risk Yönetim Ekibi | | ${date} |`,
      `| Onaylayan | Kalite Müdürü | | ${date} |`,
    ].join("\n");
  }
  return [
    "## Approval",
    "",
    "| Role | Name / Title | Signature | Date |",
    "| --- | --- | --- | --- |",
    `| Prepared by | Risk Management Team | | ${date} |`,
    `| Approved by | Quality Manager | | ${date} |`,
  ].join("\n");
}

/** Plan sonundaki onay bloğunu tablo + imza sütunu ile değiştirir. */
export function injectPlanApprovalBlock(markdown: string, date: string, locale: "tr" | "en"): string {
  const block = buildPlanApprovalMarkdown(locale, date);
  const compMarker =
    locale === "tr" ? "**Risk yönetim dosyası bileşenleri:**" : "**Risk management file components:**";

  if (/## (?:Onay|Approval)\b/i.test(markdown)) {
    const re = new RegExp(
      `## (?:Onay|Approval)\\b[\\s\\S]*?(?=\\n${compMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|$)`,
      "i",
    );
    if (re.test(markdown)) return markdown.replace(re, block + "\n\n");
  }

  const inlineRe = /\*{0,2}Hazırlayan\*{0,2}:.*$/m;
  if (inlineRe.test(markdown)) {
    return markdown.replace(inlineRe, block);
  }

  if (markdown.includes(compMarker)) {
    return markdown.replace(compMarker, `${block}\n\n${compMarker}`);
  }

  return `${markdown.trim()}\n\n${block}`;
}

export function buildTableE2PlanSection(rows: RiskPlanTableERow[], locale: "tr" | "en", fmeaRef: string): string {
  const intro =
    locale === "tr"
      ? `ISO/TR 24971 Ek E.2 tetikleyen olay ve durum örnekleri değerlendirilmiştir. Riskli etkiler «A» ile işaretlenmiştir; uygulanmayan etkiler «N/A» olarak tanımlanmıştır.\n\n«FMEA risk kodu» sütunu ${fmeaRef} formundaki kategori bazlı risk koduna bağlantıdır (ör. TS1).`
      : `ISO/TR 24971 Annex E.2 initiating events and circumstances have been evaluated. Risky effects are marked «A»; non-applicable items are «N/A».\n\nThe FMEA risk code column links to the category-based risk code in ${fmeaRef} (e.g. TS1).`;

  const body = buildTableEMarkdown(rows, locale);
  const caption =
    locale === "tr"
      ? "*Tablo E.2 — Tetikleyen Olay ve Durum Örnekleri*"
      : "*Table E.2 — Initiating Event and Circumstance Examples*";

  return `${intro}\n\n${body}\n\n${caption}`;
}
