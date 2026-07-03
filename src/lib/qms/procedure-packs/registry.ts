import {
  KYS_STRUCTURE_TEMPLATES,
  type KysStructureTemplate,
  type QmsDocumentLayer,
} from "../kys-structure";
import { procedureChildHintPlaceholder } from "../procedure-hint-examples";

/** All SOP codes that have scaffolded child documents in KYS structure. */
export function listProcedureCodesWithChildren(): string[] {
  const set = new Set<string>();
  for (const t of KYS_STRUCTURE_TEMPLATES) {
    const parent = t.parentProcedureCode?.trim().toUpperCase();
    if (parent?.startsWith("SOP-")) set.add(parent);
  }
  return [...set].sort();
}

export function getStructureChildrenForProcedure(procedureCode: string): KysStructureTemplate[] {
  const parent = procedureCode.trim().toUpperCase();
  return KYS_STRUCTURE_TEMPLATES.filter(
    (t) => t.parentProcedureCode?.trim().toUpperCase() === parent,
  );
}

export function hasProcedurePackChildren(procedureCode: string): boolean {
  return getStructureChildrenForProcedure(procedureCode).length > 0;
}

/** Default AI hints for pack children (procedure + layer aware). */
export function buildDefaultChildAiHints(
  procedureCode: string,
  children: KysStructureTemplate[],
): Record<string, { tr: string; en: string }> {
  const out: Record<string, { tr: string; en: string }> = {};
  for (const child of children) {
    const layer = child.layer as QmsDocumentLayer;
    out[child.code] = {
      tr: procedureChildHintPlaceholder(procedureCode, layer, child.code, "tr"),
      en: procedureChildHintPlaceholder(procedureCode, layer, child.code, "en"),
    };
  }
  return out;
}
