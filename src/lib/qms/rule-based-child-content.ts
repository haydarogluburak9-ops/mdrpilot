import { getRuleBasedDiagramContent } from "./diagram-flow-templates";
import { getRuleBasedFormContent } from "./form-templates";
import { inferQmsLayerFromCode, type QmsDocumentLayer } from "./kys-structure";
import { buildLayerContent } from "./layer-content-templates";
import { getSampleRecordContent } from "./sample-record-templates";

export interface RuleBasedChildContentInput {
  code: string | null | undefined;
  title: string;
  layer: string | null | undefined;
  locale: "tr" | "en";
  parentProcedureCode?: string | null;
  clauseRefs?: string | null;
}

const LAYER_CONTENT_LAYERS: QmsDocumentLayer[] = [
  "INSTRUCTION",
  "FORM",
  "DIAGRAM",
  "LIST",
  "PLAN",
  "RECORD",
  "JOB_DESCRIPTION",
  "ASSIGNMENT",
  "SPECIFICATION",
  "OTHER",
];

/** Rule-based content for child docs — layer-appropriate (form/WI/diagram…), not generic SOP. */
export function getRuleBasedChildContent(input: RuleBasedChildContentInput): string | null {
  const code = input.code?.trim().toUpperCase() ?? "";
  if (!code) return null;

  const docLayer = (input.layer as QmsDocumentLayer) ?? inferQmsLayerFromCode(code);
  if (docLayer === "PROCEDURE" || docLayer === "MANUAL") return null;

  const meta = {
    title: input.title,
    parentProcedureCode: input.parentProcedureCode,
    clauseRefs: input.clauseRefs,
  };

  if (docLayer === "DIAGRAM" || code.startsWith("DIA-")) {
    const diagram = getRuleBasedDiagramContent(code, input.locale, meta);
    if (diagram) return diagram;
  }

  if (docLayer === "FORM" || code.startsWith("FORM-")) {
    const form = getRuleBasedFormContent(code, input.locale, meta);
    if (form) return form;
  }

  if (LAYER_CONTENT_LAYERS.includes(docLayer)) {
    if (docLayer === "RECORD" && code.startsWith("REC-")) {
      const sample = getSampleRecordContent(code, "Örnek Şirket", input.locale);
      if (sample) return sample;
    }
    return buildLayerContent(docLayer, {
      code,
      title: input.title,
      locale: input.locale,
      parentProcedureCode: input.parentProcedureCode,
      clauseRefs: input.clauseRefs,
    });
  }

  return null;
}
