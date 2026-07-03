import "server-only";
import fs from "fs";
import path from "path";

/**
 * Loads ISO 15223-1 symbol pictograms to embed next to each "Symbols used" line
 * in the technical-file DOCX export.
 *
 * Drop your (licensed) symbol image files into  public/iso-symbols/  named by the
 * ISO 15223-1 clause, e.g. "5.1.1.png", "5.2.3.png". Two special keys:
 *   - "udi.png" for the UDI carrier (ISO 20417)
 *   - "ce.png"  for the CE marking (MDR Annex V)
 * Supported formats: png, jpg, jpeg, gif. Missing files simply fall back to text.
 */
const DIR = path.join(process.cwd(), "public", "iso-symbols");
const EXTS = ["png", "jpg", "jpeg", "gif"] as const;

export interface SymbolImage {
  data: Buffer;
  width: number;
  height: number;
}

function baseForClause(clause: string): string {
  const c = clause.trim();
  if (/20417/i.test(c)) return "udi";
  if (/annex\s*v/i.test(c)) return "ce";
  return c.replace(/\s+/g, "");
}

function imageSize(buf: Buffer): { width: number; height: number } | null {
  // PNG
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // GIF
  if (buf.length > 10 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }
  // JPEG: scan SOF markers
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off + 9 < buf.length) {
      if (buf[off] !== 0xff) { off++; continue; }
      const marker = buf[off + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7) };
      }
      off += 2 + buf.readUInt16BE(off + 2);
    }
  }
  return null;
}

export function loadSymbolImage(clause: string): SymbolImage | null {
  const base = baseForClause(clause);

  for (const ext of EXTS) {
    const fp = path.join(DIR, `${base}.${ext}`);
    try {
      if (fs.existsSync(fp)) {
        const data = fs.readFileSync(fp);
        const dim = imageSize(data) ?? { width: 40, height: 40 };
        return { data, width: dim.width || 40, height: dim.height || 40 };
      }
    } catch {
      /* ignore unreadable file, fall back to text */
    }
  }
  return null;
}

/** Pixel dimensions for embedding a symbol in the DOCX table (aspect ratio preserved). */
export function symbolDisplaySize(clause: string, img: SymbolImage): { width: number; height: number } {
  const isCE = /annex\s*v/i.test(clause);
  // CE mark is wider; other symbols fit in a near-square cell.
  const maxW = isCE ? 96 : 52;
  const maxH = isCE ? 40 : 52;
  const ratio = img.width / img.height;
  if (ratio >= maxW / maxH) {
    const w = maxW;
    return { width: w, height: Math.max(16, Math.round(w / ratio)) };
  }
  const h = maxH;
  return { width: Math.max(16, Math.round(h * ratio)), height: h };
}
