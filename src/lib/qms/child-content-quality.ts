import type { QmsDocumentLayer } from "./kys-structure";

const PROCEDURE_MARKERS_TR = [
  /^##?\s*1\.\s*Amaç/m,
  /^##?\s*2\.\s*Kapsam/m,
  /^##?\s*3\.\s*Sorumluluklar/m,
  /^##?\s*4\.\s*Tanımlar/m,
  /^##?\s*5\.\s*Prosedür/m,
  /^##?\s*6\.\s*Kayıtlar/m,
  /^##?\s*7\.\s*Referanslar/m,
  /Bu prosedür,/,
  /kalite yönetim sistemi kapsamındaki ilgili tüm süreçler/,
];

const PROCEDURE_MARKERS_EN = [
  /^##?\s*1\.\s*Purpose/m,
  /^##?\s*2\.\s*Scope/m,
  /^##?\s*3\.\s*Responsibilities/m,
  /^##?\s*4\.\s*Definitions/m,
  /^##?\s*5\.\s*Procedure/m,
  /^##?\s*6\.\s*Records/m,
  /^##?\s*7\.\s*References/m,
  /Defines activities for/,
  /Applies to all relevant QMS processes/,
];

const GOOD_CHILD_MARKERS = [
  /Form şablonu|Form template/i,
  /İş talimatı|Work instruction/i,
  /Şema —|Diagram —/i,
  /Liste —|List —/i,
  /Kayıt örneği|Sample record/i,
  /Akış özeti|Flow summary/i,
  /Form alanları|Form fields/i,
  /## Adımlar|## Steps/,
];

/** Child doc content was wrongly generated as SOP (Purpose/Scope/Procedure…). */
export function looksLikeProcedureContent(
  content: string | null | undefined,
  layer?: string | null,
): boolean {
  if (!content?.trim()) return false;
  if (layer === "PROCEDURE" || layer === "MANUAL") return false;

  const text = content.trim();
  for (const m of GOOD_CHILD_MARKERS) {
    if (m.test(text)) return false;
  }

  const markers = [...PROCEDURE_MARKERS_TR, ...PROCEDURE_MARKERS_EN];
  let hits = 0;
  for (const m of markers) {
    if (m.test(text)) hits++;
  }
  return hits >= 2;
}

export function childContentNeedsRegeneration(
  content: string | null | undefined,
  layer?: string | null,
  onlyEmpty = true,
): boolean {
  if (!content?.trim()) return true;
  if (looksLikeProcedureContent(content, layer)) return true;
  if (!onlyEmpty) return true;
  return false;
}

export function auditChildContentLabel(
  content: string | null | undefined,
  layer?: string | null,
): "empty" | "procedure_format" | "ok" | "unknown" {
  if (!content?.trim()) return "empty";
  if (looksLikeProcedureContent(content, layer)) return "procedure_format";
  for (const m of GOOD_CHILD_MARKERS) {
    if (m.test(content)) return "ok";
  }
  return "unknown";
}
