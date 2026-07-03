import "server-only";
import type { TranslatorFileKind } from "./types";

export const MAX_TRANSLATE_CHARS = 100_000;

export interface ExtractedDocument {
  text: string;
  truncated: boolean;
}

function clip(text: string): { text: string; truncated: boolean } {
  const normalized = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").trim();
  if (normalized.length <= MAX_TRANSLATE_CHARS) {
    return { text: normalized, truncated: false };
  }
  return {
    text: normalized.slice(0, MAX_TRANSLATE_CHARS) + "\n\n[… truncated for translation limit]",
    truncated: true,
  };
}

export async function extractDocumentText(kind: TranslatorFileKind, buffer: Buffer): Promise<ExtractedDocument> {
  let raw = "";
  switch (kind) {
    case "pdf": {
      const mod = (await import("pdf-parse")) as unknown as { default?: (b: Buffer) => Promise<{ text: string }> };
      const pdfParse = mod.default ?? (mod as unknown as (b: Buffer) => Promise<{ text: string }>);
      const data = await pdfParse(buffer);
      raw = data.text ?? "";
      break;
    }
    case "docx": {
      const mod = (await import("mammoth")) as unknown as {
        extractRawText?: (o: { buffer: Buffer }) => Promise<{ value: string }>;
        default?: { extractRawText: (o: { buffer: Buffer }) => Promise<{ value: string }> };
      };
      const extractRawText = mod.extractRawText ?? mod.default?.extractRawText;
      if (!extractRawText) throw new Error("DOCX extraction unavailable");
      const res = await extractRawText({ buffer });
      raw = res.value ?? "";
      break;
    }
    case "xlsx": {
      const mod = (await import("exceljs")) as unknown as { default?: typeof import("exceljs") } & typeof import("exceljs");
      const ExcelJS = mod.default ?? mod;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as unknown as ArrayBuffer);
      const parts: string[] = [];
      wb.eachSheet((ws) => {
        parts.push(`# Sheet: ${ws.name}`);
        let rows = 0;
        ws.eachRow((row) => {
          if (rows >= 500) return;
          const values = (row.values as unknown[])
            .slice(1)
            .map((v) => (v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v)));
          if (values.some((v) => v !== "")) {
            parts.push(values.join(" | "));
            rows++;
          }
        });
      });
      raw = parts.join("\n");
      break;
    }
    default:
      throw new Error("Unsupported file type");
  }

  const clipped = clip(raw);
  if (!clipped.text.trim()) throw new Error("No extractable text in file");
  return clipped;
}
