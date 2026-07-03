/** MDRpilot risk yönetim doküman kodları (ISO 14971 teknik dosya Bölüm 8). */
export type RiskDocSubtype = "plan" | "report" | "policy";

export interface RiskDocumentIdentity {
  docCode?: string;
  revision?: string;
  documentDate?: string;
}

export const RISK_DOC_SUBTYPE_LABEL: Record<RiskDocSubtype, { tr: string; en: string }> = {
  plan: { tr: "Risk yönetim planı", en: "Risk management plan" },
  report: { tr: "Risk yönetim raporu", en: "Risk management report" },
  policy: { tr: "Risk yönetim politikası", en: "Risk management policy" },
};

const SUBTYPE_PATTERNS: Record<RiskDocSubtype, RegExp[]> = {
  plan: [
    /risk\s*management\s*plan/i,
    /risk\s*plan/i,
    /yönetim\s*plan/i,
    /\brmp\b/i,
    /MD-RM-01/i,
    /TF\.04-04\.01/i,
  ],
  report: [
    /risk\s*management\s*report/i,
    /risk\s*report/i,
    /yönetim\s*rapor/i,
    /MD-RM-04/i,
    /TF\.04-04\.04/i,
  ],
  policy: [
    /risk\s*management\s*polic/i,
    /risk\s*polic/i,
    /yönetim\s*politik/i,
    /MD-RM-05/i,
    /TF\.04-04\.05/i,
  ],
};

const DOC_CODE_RE =
  /\b((?:MD-RM-\d{2}|TF\.\d{2}-\d{2}\.\d{2}|[A-Z]{2,5}-[A-Z]{2,5}-\d{2,3}))\b/i;
const REV_RE = /(?:rev\.?|revizyon|revision)\s*[:\s]*(\d{1,3})/i;
const DATE_RE = /\b(\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{4}-\d{2}-\d{2})\b/;

export function extractRiskDocumentIdentity(fileName: string, text?: string | null): RiskDocumentIdentity {
  const hay = `${fileName} ${text?.slice(0, 4000) ?? ""}`;
  const codeMatch = hay.match(DOC_CODE_RE);
  const revMatch = hay.match(REV_RE);
  const dateMatch = hay.match(DATE_RE);
  return {
    docCode: codeMatch?.[1]?.toUpperCase(),
    revision: revMatch?.[1],
    documentDate: dateMatch?.[1],
  };
}

export function detectRiskDocSubtype(fileName: string, text?: string | null): RiskDocSubtype | null {
  const hay = `${fileName} ${text?.slice(0, 4000) ?? ""}`;
  let best: { subtype: RiskDocSubtype; score: number } | null = null;
  for (const subtype of Object.keys(SUBTYPE_PATTERNS) as RiskDocSubtype[]) {
    let score = 0;
    for (const re of SUBTYPE_PATTERNS[subtype]) {
      if (re.test(hay)) score++;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { subtype, score };
    }
  }
  return best?.subtype ?? null;
}

export function formatRiskDocumentLabel(
  identity: RiskDocumentIdentity,
  fileName: string,
  locale: "tr" | "en" = "tr",
): string {
  const parts: string[] = [];
  if (identity.docCode) parts.push(identity.docCode);
  if (identity.revision) parts.push(`Rev.${identity.revision}`);
  if (identity.documentDate) parts.push(identity.documentDate);
  if (parts.length > 0) return parts.join(" · ");
  return fileName;
}

export function subtypeForUploadField(
  field: "planUploadedFileId" | "reportUploadedFileId" | "policyUploadedFileId",
): RiskDocSubtype {
  if (field === "planUploadedFileId") return "plan";
  if (field === "reportUploadedFileId") return "report";
  return "policy";
}

export function enrichRiskFileAnalysis(
  fileName: string,
  text: string | null | undefined,
  analysisJson: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const base = analysisJson ? { ...analysisJson } : {};
  const subtype = detectRiskDocSubtype(fileName, text);
  const identity = extractRiskDocumentIdentity(fileName, text);
  if (subtype) base.riskDocSubtype = subtype;
  if (identity.docCode || identity.revision || identity.documentDate) {
    base.riskDocumentIdentity = identity;
  }
  return base;
}
