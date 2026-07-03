export interface LiteratureEvidenceDocxSpec {
  locale: "tr" | "en";
  title: string;
  screenshots: { base64: string; caption: string }[];
}

export const LIT_EVIDENCE_MARKER_PREFIX = "<!--MEDDOC_LIT_EVIDENCE:";

export function embedLiteratureEvidenceMarker(spec: LiteratureEvidenceDocxSpec): string {
  const payload = Buffer.from(JSON.stringify(spec), "utf8").toString("base64");
  return `${LIT_EVIDENCE_MARKER_PREFIX}${payload}-->`;
}

export function parseLiteratureEvidenceMarker(line: string): LiteratureEvidenceDocxSpec | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith(LIT_EVIDENCE_MARKER_PREFIX) || !trimmed.endsWith("-->")) return null;
  const payload = trimmed.slice(LIT_EVIDENCE_MARKER_PREFIX.length, -3);
  try {
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as LiteratureEvidenceDocxSpec;
  } catch {
    return null;
  }
}
