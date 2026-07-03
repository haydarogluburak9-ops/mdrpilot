import { mergeProcessMapFromKys } from "./process-map-from-kys";

/**
 * Client-safe: pull Quality Manual wizard answers from KYS document content.
 * Only fills empty fields by default so manual edits are preserved.
 */

export interface QmsDocSyncRef {
  code: string | null;
  content: string | null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function fieldEmpty(answers: Record<string, unknown>, key: string): boolean {
  return !str(answers[key]);
}

function docsByCode(docs: QmsDocSyncRef[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const d of docs) {
    const code = d.code?.trim();
    const content = d.content?.trim();
    if (code && content) map.set(code, content);
  }
  return map;
}

/** Split markdown into ## sections. */
function splitMarkdownSections(content: string): { heading: string; body: string }[] {
  const lines = content.replace(/```[\s\S]*?```/g, "").split("\n");
  const sections: { heading: string; body: string }[] = [];
  let currentHeading = "";
  let bodyLines: string[] = [];

  const push = () => {
    if (currentHeading || bodyLines.length) {
      sections.push({ heading: currentHeading, body: bodyLines.join("\n").trim() });
    }
  };

  for (const line of lines) {
    const hMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (hMatch) {
      push();
      currentHeading = hMatch[1].trim();
      bodyLines = [];
    } else {
      bodyLines.push(line);
    }
  }
  push();
  return sections;
}

function sectionMatches(heading: string, patterns: RegExp[]): boolean {
  const h = heading.toLowerCase();
  return patterns.some((p) => p.test(h));
}

function findSectionBody(content: string, patterns: RegExp[]): string {
  const sections = splitMarkdownSections(content);
  for (const s of sections) {
    if (sectionMatches(s.heading, patterns)) return s.body.trim();
  }
  return "";
}

function procedureExcerpt(content: string, maxLen = 1800): string {
  const sections = splitMarkdownSections(content);
  const picked = sections.filter((s) =>
    sectionMatches(s.heading, [
      /amaç|purpose/i,
      /kapsam|scope/i,
      /prosedür|procedure/i,
      /^5\./,
      /^4\./,
    ]),
  );
  const text = picked.map((s) => (s.heading ? `${s.heading}\n${s.body}` : s.body)).join("\n\n").trim();
  if (text) return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
  const flat = content.replace(/```[\s\S]*?```/g, "").trim();
  return flat.length > maxLen ? `${flat.slice(0, maxLen)}…` : flat;
}

const ORG_STRUCTURE_PATTERNS = [
  /organizasyon\s*yap/i,
  /organization\s*struct/i,
  /^5\.1/,
  /5\.1\s+organizasyon/i,
];
const ORG_CHART_PATTERNS = [
  /organizasyon\s*şema/i,
  /organization\s*chart/i,
  /^5\.2/,
  /5\.2\s+organizasyon/i,
];
const ORG_MATRIX_PATTERNS = [
  /roller\s*ve\s*sorumluluk/i,
  /roles\s*and\s*responsibilities/i,
  /^5\.3/,
  /sorumluluk\s*matris/i,
  /responsibility\s*matrix/i,
];

/** Pull organization narrative, chart and role matrix from SOP-ORG (names stay in wizard fields). */
export function mergeOrganizationFromSopOrg(
  answers: Record<string, unknown>,
  docs: QmsDocSyncRef[],
  onlyFillEmpty = true,
): Record<string, unknown> {
  const byCode = docsByCode(docs);
  const orgContent = byCode.get("SOP-ORG");
  if (!orgContent) return answers;

  const merged = { ...answers };
  const structure = findSectionBody(orgContent, ORG_STRUCTURE_PATTERNS);
  const chart = findSectionBody(orgContent, ORG_CHART_PATTERNS);
  const matrix = findSectionBody(orgContent, ORG_MATRIX_PATTERNS);

  if (structure && (onlyFillEmpty ? fieldEmpty(merged, "organizationStructureText") : true)) {
    merged.organizationStructureText = structure;
  }
  if (chart && (onlyFillEmpty ? fieldEmpty(merged, "organizationChartText") : true)) {
    merged.organizationChartText = chart;
  }
  if (matrix && (onlyFillEmpty ? fieldEmpty(merged, "organizationRolesMatrixText") : true)) {
    merged.organizationRolesMatrixText = matrix;
  }

  if (onlyFillEmpty && fieldEmpty(merged, "organizationProcedureCode")) {
    merged.organizationProcedureCode = "SOP-ORG";
  }

  return merged;
}

/** Wizard textarea fields filled from matching KYS procedure content (steps 6–8). */
export const QM_ANSWER_FIELD_TO_QMS_CODE: Record<string, string> = {
  qualityRisks: "SOP-RM",
  regulatoryRisks: "SOP-VG",
  supplierRisks: "SOP-SE",
  productionRisks: "SOP-PC",
  postMarketRisks: "SOP-FB",
  riskManagementStandard: "SOP-RM",
  applicableRegulations: "SOP-VG",
  manufacturingMethods: "SOP-PC",
  sterilizationMethod: "SOP-ST",
  traceabilityMethod: "SOP-TR",
  packagingValidation: "SOP-PP",
  testAndInspectionActivities: "SOP-MON",
  nonconformingProductControl: "SOP-NCP",
  customerFeedbackMethod: "SOP-FB",
  complaintHandlingMethod: "SOP-CH",
  vigilanceReportingMethod: "SOP-VG",
  pmsMethod: "SOP-FB",
  capaMethod: "SOP-CAPA",
  recallMethod: "SOP-AN",
  trendAnalysisMethod: "SOP-DA",
};

export function mergeWizardAnswersFromKys(
  answers: Record<string, unknown>,
  docs: QmsDocSyncRef[],
  onlyFillEmpty = true,
): Record<string, unknown> {
  const byCode = docsByCode(docs);
  if (byCode.size === 0) return answers;

  const merged = { ...answers };

  for (const [fieldKey, sopCode] of Object.entries(QM_ANSWER_FIELD_TO_QMS_CODE)) {
    if (onlyFillEmpty && !fieldEmpty(merged, fieldKey)) continue;
    const content = byCode.get(sopCode);
    if (!content) continue;

    if (fieldKey === "riskManagementStandard") {
      const refs = findSectionBody(content, [/referans|reference/i]);
      merged[fieldKey] = refs ? refs.slice(0, 500) : "ISO 14971";
      continue;
    }
    if (fieldKey === "applicableRegulations") {
      const refs = findSectionBody(content, [/referans|reference|mdr|ivdr/i]);
      merged[fieldKey] = refs ? refs.slice(0, 800) : procedureExcerpt(content, 600);
      continue;
    }
    if (fieldKey === "sterilizationMethod") {
      const body = findSectionBody(content, [/sterilizasyon|sterilization/i]) || procedureExcerpt(content, 400);
      merged[fieldKey] = body.split("\n")[0]?.slice(0, 200) ?? body.slice(0, 200);
      continue;
    }

    merged[fieldKey] = procedureExcerpt(content);
  }

  return merged;
}

/** Steps >= 5: procedure codes + KYS content for downstream form fields. */
export function mergeAnswersFromKysRegister(
  answers: Record<string, unknown>,
  docs: QmsDocSyncRef[],
  step: number,
  onlyFillEmpty = true,
  locale: "tr" | "en" = "tr",
): Record<string, unknown> {
  let merged = { ...answers };
  if (step >= 3) {
    merged = mergeOrganizationFromSopOrg(merged, docs, onlyFillEmpty);
  }
  if (step >= 4) {
    merged = mergeProcessMapFromKys(merged, docs, locale, onlyFillEmpty);
  }
  if (step >= 6) {
    merged = mergeWizardAnswersFromKys(merged, docs, onlyFillEmpty);
  }
  return merged;
}
