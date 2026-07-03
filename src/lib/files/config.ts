import type { DocumentKind } from "@prisma/client";

export const MAX_UPLOAD_MB = Number(process.env.UPLOAD_MAX_MB ?? 25);
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export type AllowedKind = "pdf" | "docx" | "xlsx" | "png" | "jpg";

export interface AllowedType {
  kind: AllowedKind;
  mimes: string[];
  extensions: string[];
  /** Leading magic bytes (any one matching is enough). */
  magic: number[][];
  isImage: boolean;
}

// ZIP-based OOXML (docx/xlsx) share the "PK\x03\x04" signature.
const PK = [0x50, 0x4b, 0x03, 0x04];

export const ALLOWED_TYPES: AllowedType[] = [
  {
    kind: "pdf",
    mimes: ["application/pdf"],
    extensions: ["pdf"],
    magic: [[0x25, 0x50, 0x44, 0x46]], // %PDF
    isImage: false,
  },
  {
    kind: "docx",
    mimes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    extensions: ["docx"],
    magic: [PK],
    isImage: false,
  },
  {
    kind: "xlsx",
    mimes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    extensions: ["xlsx"],
    magic: [PK],
    isImage: false,
  },
  {
    kind: "png",
    mimes: ["image/png"],
    extensions: ["png"],
    magic: [[0x89, 0x50, 0x4e, 0x47]],
    isImage: true,
  },
  {
    kind: "jpg",
    mimes: ["image/jpeg", "image/jpg"],
    extensions: ["jpg", "jpeg"],
    magic: [[0xff, 0xd8, 0xff]],
    isImage: true,
  },
];

export const DOCUMENT_KINDS: DocumentKind[] = [
  "TEST_REPORT", "IFU", "LABEL", "CERTIFICATE", "RISK_FILE",
  "CLINICAL_EVALUATION", "PMS", "PMCF", "GSPR_EVIDENCE", "TECHNICAL_DRAWING", "OTHER",
];

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  TEST_REPORT: "Test Report",
  IFU: "IFU",
  LABEL: "Label",
  CERTIFICATE: "Certificate",
  RISK_FILE: "Risk File",
  CLINICAL_EVALUATION: "Clinical Evaluation",
  PMS: "PMS",
  PMCF: "PMCF",
  GSPR_EVIDENCE: "GSPR Evidence",
  TECHNICAL_DRAWING: "Technical Drawing",
  OTHER: "Other",
};

/** Lowercase extension without dot, from a (possibly hostile) file name. */
export function extensionOf(fileName: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return m ? m[1].toLowerCase() : "";
}

/**
 * Sanitize a filename: strip directory components, keep a safe charset, cap length.
 * Prevents path traversal and odd characters in stored/displayed names.
 */
export function sanitizeFileName(name: string): string {
  const base = name.replace(/^.*[\\/]/, ""); // drop any path
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, " ")
    .replace(/_{2,}/g, "_")
    .trim();
  const capped = cleaned.slice(0, 180);
  return capped || "upload";
}

function magicMatches(buf: Buffer, sig: number[]): boolean {
  if (buf.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (buf[i] !== sig[i]) return false;
  return true;
}

export interface ValidationResult {
  ok: boolean;
  type?: AllowedType;
  error?: string;
}

/**
 * Validate an upload by checking that MIME, extension AND magic bytes agree on
 * one of the allowed types. All three must be consistent.
 */
export function validateUpload(params: {
  fileName: string;
  mimeType: string;
  size: number;
  head: Buffer;
}): ValidationResult {
  if (params.size <= 0) return { ok: false, error: "Empty file" };
  if (params.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `File exceeds ${MAX_UPLOAD_MB} MB limit` };
  }

  const ext = extensionOf(params.fileName);
  const mime = (params.mimeType || "").toLowerCase();

  const byExt = ALLOWED_TYPES.find((t) => t.extensions.includes(ext));
  if (!byExt) return { ok: false, error: `Unsupported file extension: .${ext || "?"}` };

  // Magic bytes must match the extension's type (this is the authoritative check).
  const magicOk = byExt.magic.some((sig) => magicMatches(params.head, sig));
  if (!magicOk) return { ok: false, error: "File content does not match its extension" };

  // MIME should be consistent too (browsers sometimes send octet-stream — allow that).
  const mimeOk = byExt.mimes.includes(mime) || mime === "application/octet-stream" || mime === "";
  if (!mimeOk) return { ok: false, error: "Declared MIME type does not match file type" };

  return { ok: true, type: byExt };
}
