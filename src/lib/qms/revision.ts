import type { DocStatus } from "@/lib/domain/types";

/** Default first issue revision for KYS documents. */
export const DEFAULT_QMS_REVISION = "REV00";

export interface RevisionHistoryEntry {
  rev: number;
  date: string;
  by: string;
  note: string;
}

export function revisionNoToLabel(revisionNo: number): string {
  return `REV${String(Math.max(0, revisionNo)).padStart(2, "0")}`;
}

export function parseRevisionNo(version: string | null | undefined): number {
  const trimmed = (version ?? "").trim();
  if (!trimmed) return 0;
  const revMatch = trimmed.match(/^REV\s*(\d+)$/i);
  if (revMatch) return parseInt(revMatch[1], 10);
  const vMatch = trimmed.match(/^v?(\d+)(?:\.\d+)?$/i);
  if (vMatch) return Math.max(0, parseInt(vMatch[1], 10) - 1);
  const digits = trimmed.match(/(\d+)/);
  return digits ? parseInt(digits[1], 10) : 0;
}

/** Normalize legacy values (v1.0) to REV00-style labels. */
export function normalizeQmsRevision(version: string | null | undefined): string {
  if (version && /^REV\d+/i.test(version.trim())) {
    return revisionNoToLabel(parseRevisionNo(version));
  }
  return revisionNoToLabel(parseRevisionNo(version));
}

export function revisionPadded(version: string | null | undefined): string {
  return String(parseRevisionNo(version)).padStart(2, "0");
}

export function parseRevisionHistory(json: unknown): RevisionHistoryEntry[] {
  if (!Array.isArray(json)) return [];
  return json.filter(
    (e): e is RevisionHistoryEntry =>
      e &&
      typeof e === "object" &&
      typeof (e as RevisionHistoryEntry).rev === "number" &&
      typeof (e as RevisionHistoryEntry).date === "string",
  );
}

export function appendRevisionHistory(
  json: unknown,
  entry: RevisionHistoryEntry,
): RevisionHistoryEntry[] {
  return [...parseRevisionHistory(json), entry];
}

export function fmtRegisterDate(d: Date | null | undefined, locale: "tr" | "en"): string {
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return locale === "tr" ? `${day}.${month}.${year}` : `${month}/${day}/${year}`;
}

/** Plan revision bump when document body changes after prior issue or while approved. */
export function planQmsRevisionOnContentChange(doc: {
  status: DocStatus;
  revisionNo: number;
  issueDate: Date | null;
}): { revisionNo: number; status: DocStatus; bump: boolean } {
  const wasPublished = Boolean(doc.issueDate);
  if (doc.status === "APPROVED" || wasPublished) {
    return {
      revisionNo: doc.revisionNo + 1,
      status: "IN_REVIEW",
      bump: true,
    };
  }
  return {
    revisionNo: doc.revisionNo,
    status: doc.status === "MISSING" ? "DRAFT" : doc.status,
    bump: false,
  };
}
