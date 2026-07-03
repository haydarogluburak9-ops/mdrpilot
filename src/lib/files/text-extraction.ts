import "server-only";
import type { AllowedKind } from "./config";

export const MAX_EXTRACT_CHARS = 20000;

function clip(text: string): string {
  const normalized = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").trim();
  return normalized.length > MAX_EXTRACT_CHARS
    ? normalized.slice(0, MAX_EXTRACT_CHARS) + "\n…[truncated]"
    : normalized;
}

/**
 * Extract a best-effort text representation from an uploaded file.
 * Never throws — on failure returns an empty string so the upload still succeeds.
 */
export async function extractText(kind: AllowedKind, buffer: Buffer): Promise<string> {
  try {
    switch (kind) {
      case "pdf": {
        const mod = (await import("pdf-parse")) as unknown as { default?: (b: Buffer) => Promise<{ text: string }> };
        const pdfParse = mod.default ?? (mod as unknown as (b: Buffer) => Promise<{ text: string }>);
        const data = await pdfParse(buffer);
        return clip(data.text ?? "");
      }
      case "docx": {
        const mod = (await import("mammoth")) as unknown as {
          extractRawText?: (o: { buffer: Buffer }) => Promise<{ value: string }>;
          default?: { extractRawText: (o: { buffer: Buffer }) => Promise<{ value: string }> };
        };
        const extractRawText = mod.extractRawText ?? mod.default?.extractRawText;
        if (!extractRawText) return "";
        const res = await extractRawText({ buffer });
        return clip(res.value ?? "");
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
            if (rows >= 200) return;
            const values = (row.values as unknown[])
              .slice(1)
              .map((v) => (v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v)));
            if (values.some((v) => v !== "")) {
              parts.push(values.join(" | "));
              rows++;
            }
          });
        });
        return clip(parts.join("\n"));
      }
      case "png":
      case "jpg":
        // No OCR — record only that an image was uploaded.
        return `[image file uploaded — no text extraction performed]`;
      default:
        return "";
    }
  } catch (err) {
    console.error("[text-extraction] failed", err);
    return "";
  }
}
