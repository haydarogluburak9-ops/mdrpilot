/** KYS references for Quality Manual assembly (client-safe). No procedure body copy-paste. */

import { isBooleanTrue } from "./steps";
import { QM_PROCEDURE_CATALOG, QM_PROCEDURE_FIELD_TO_QMS_CODE } from "./procedure-codes";

export interface KysDocForManual {
  code: string | null;
  title: string;
  content: string | null;
  status: string;
  standard?: string;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, "/").replace(/\n/g, " ");
}

/** Procedure codes referenced in the manual index (wizard refs + scope). */
export function resolveManualProcedureCodes(
  answers: Record<string, unknown>,
  docs: KysDocForManual[],
): string[] {
  const fromWizard = Object.values(QM_PROCEDURE_FIELD_TO_QMS_CODE);
  const codes = new Set<string>(fromWizard);

  if (isBooleanTrue(answers.sterileProductsIncluded)) codes.add("SOP-ST").add("SOP-CLN");
  if (!isBooleanTrue(answers.distributionOnly)) codes.add("SOP-PC");
  if (isBooleanTrue(answers.designAndDevelopmentIncluded)) codes.add("SOP-DD").add("SOP-CRP");

  const inRegister = new Set(
    docs.filter((d) => d.code?.trim()).map((d) => d.code!.trim()),
  );

  const ordered: string[] = [];
  for (const c of codes) if (inRegister.has(c)) ordered.push(c);
  for (const d of docs) {
    const c = d.code?.trim();
    if (!c || !inRegister.has(c)) continue;
    if (!ordered.includes(c) && (d.standard?.includes("13485") || c.startsWith("SOP-"))) {
      ordered.push(c);
    }
  }
  return ordered.slice(0, 40);
}

export function buildDocumentRegisterTable(docs: KysDocForManual[], locale: "tr" | "en"): string {
  const tr = locale === "tr";
  const header = tr
    ? "| Kod | Başlık | Durum |\n| --- | --- | --- |"
    : "| Code | Title | Status |\n| --- | --- | --- |";
  const rows = docs
    .filter((d) => d.code)
    .map((d) => `| ${escapeCell(d.code!)} | ${escapeCell(d.title)} | ${escapeCell(d.status)} |`);
  return [header, ...rows].join("\n");
}

/**
 * Manual-level procedure index: code, title, ISO clause, role in the manual.
 * Does not reproduce procedure text — controlled copies live in KYS only.
 */
export function buildProcedureReferenceIndex(
  answers: Record<string, unknown>,
  docs: KysDocForManual[],
  locale: "tr" | "en",
): string {
  const tr = locale === "tr";
  const header = tr
    ? "| Kod | Başlık | ISO 13485 | El kitabındaki konum |\n| --- | --- | --- | --- |"
    : "| Code | Title | ISO 13485 | Role in manual |\n| --- | --- | --- | --- |";

  const catalogByCode = new Map(QM_PROCEDURE_CATALOG.map((c) => [c.code, c]));
  const docByCode = new Map(docs.filter((d) => d.code).map((d) => [d.code!.trim(), d]));
  const codes = resolveManualProcedureCodes(answers, docs);

  const rows = codes.map((code) => {
    const cat = catalogByCode.get(code);
    const doc = docByCode.get(code);
    const wizardCode = str(answers[cat?.fieldKey ?? ""]) || code;
    const title = tr
      ? (doc?.title ?? cat?.titleTr ?? code)
      : (doc?.title ?? cat?.titleEn ?? code);
    const clause = cat?.clause ?? "—";
    const role = tr
      ? (cat?.manualRoleTr ?? "Detaylı uygulama prosedürde tanımlıdır; el kitabı metni içermez.")
      : (cat?.manualRoleEn ?? "Detailed implementation is in the procedure; the manual does not reproduce procedure text.");
    return `| ${escapeCell(wizardCode)} | ${escapeCell(title)} | ${escapeCell(clause)} | ${escapeCell(role)} |`;
  });

  return [header, ...rows].join("\n");
}
