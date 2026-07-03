import type { DocumentKind, SterilizationMethod } from "@prisma/client";
import { editionOf, joinStandards } from "@/lib/domain/standards-catalog";

/** Product fields used to resolve harmonised / state-of-the-art standard references per GSPR. */
export interface GsprStandardContext {
  isSterile: boolean;
  sterilization: SterilizationMethod;
  hasMeasuringFn: boolean;
  containsSoftware: boolean;
  isInvasive: boolean;
  isActive: boolean;
  emitsRadiation: boolean;
  administersMedicineOrEnergy: boolean;
  containsMedicinalSubstance: boolean;
  containsBiologicalMaterial: boolean;
  isAbsorbable: boolean;
  containsCmrOrEndocrine: boolean;
  containsNanomaterial: boolean;
  isForLayUser: boolean;
  isReusable: boolean;
  isImplantable: boolean;
  bodyContactDuration: string | null;
  materials: string | null;
}

const RM = editionOf("ISO 14971");
const QMS = editionOf("ISO 13485");
const USAB = editionOf("IEC 62366-1");
const BIO = editionOf("ISO 10993-1");
const LABEL = joinStandards("ISO 15223-1", "ISO 20417");
const PACK = editionOf("ISO 11607-1");
const SW = editionOf("IEC 62304");
const EMC = editionOf("IEC 60601-1-2");
const ELEC = editionOf("IEC 60601-1");
const CYBER = editionOf("IEC 81001-5-1");

const BASE: Record<string, string> = {
  "1": RM,
  "2": RM,
  "3": RM,
  "4": RM,
  "5": USAB,
  "6": QMS,
  "7": QMS,
  "8": RM,
  "10.1": BIO,
  "10.2": BIO,
  "10.3": BIO,
  "10.4": `${editionOf("ISO 10993-17")} / MDR Annex I 10.4`,
  "10.5": BIO,
  "10.6": editionOf("ISO/TR 10993-22"),
  "11.1": RM,
  "11.2": joinStandards("ISO 17664", "ISO 17665"),
  "11.3": editionOf("ISO 15223-1"),
  "11.4": joinStandards("ISO 11135", "ISO 11137", "ISO 17665"),
  "11.5": joinStandards("ISO 11135", "ISO 11137", "ISO 17665"),
  "11.6": QMS,
  "11.7": PACK,
  "11.8": editionOf("ISO 15223-1"),
  "12.1": "MDR Annex I 12.1 / Directive 2001/83/EC",
  "12.2": "Directive 2001/83/EC Annex I",
  "13.1": "Directive 2004/23/EC",
  "13.2": `Regulation (EU) 722/2012 / ${editionOf("ISO 22442")}`,
  "13.3": RM,
  "14.1": RM,
  "14.2": EMC,
  "14.3": RM,
  "14.4": QMS,
  "14.5": `${SW} / ${RM}`,
  "14.6": USAB,
  "14.7": RM,
  "15.1": `Device-specific / ${QMS}`,
  "15.2": "Directive 80/181/EEC",
  "16.1": editionOf("IEC 60601-1-3"),
  "16.2": editionOf("IEC 60601-1-3"),
  "16.3": editionOf("IEC 60601-1-3"),
  "16.4": "Directive 2013/59/Euratom",
  "17.1": SW,
  "17.2": SW,
  "17.3": SW,
  "17.4": `${CYBER} / MDCG 2019-16`,
  "18.1": ELEC,
  "18.2": ELEC,
  "18.3": ELEC,
  "18.4": editionOf("IEC 60601-1-8"),
  "18.5": EMC,
  "18.6": EMC,
  "18.7": ELEC,
  "18.8": CYBER,
  "19.1": `${ELEC} / ${editionOf("ISO 14708")}`,
  "19.2": editionOf("ISO 14708"),
  "19.3": QMS,
  "19.4": editionOf("ISO 14708"),
  "20.1": RM,
  "20.2": RM,
  "20.3": RM,
  "20.4": RM,
  "20.5": ELEC,
  "20.6": ELEC,
  "21.1": RM,
  "21.2": RM,
  "21.3": USAB,
  "22.1": USAB,
  "22.2": USAB,
  "22.3": USAB,
  "23.1": LABEL,
  "23.2": LABEL,
  "23.3": PACK,
  "23.4": editionOf("ISO 20417"),
};

function sterilizationStandard(method: SterilizationMethod): string {
  switch (method) {
    case "EO":
      return editionOf("ISO 11135");
    case "GAMMA":
      return editionOf("ISO 11137");
    case "STEAM":
      return editionOf("ISO 17665");
    default:
      return joinStandards("ISO 11135", "ISO 11137", "ISO 17665");
  }
}

function hasBodyContact(ctx: GsprStandardContext): boolean {
  return !!(ctx.materials?.trim() || ctx.bodyContactDuration?.trim() || ctx.isInvasive);
}

/** Resolve the primary harmonised standard reference for a GSPR row from device properties. */
export function resolveStandardForGspr(gsprNo: string, ctx: GsprStandardContext): string | null {
  if (gsprNo.startsWith("10.") && !hasBodyContact(ctx) && !ctx.containsCmrOrEndocrine && !ctx.containsNanomaterial) {
    return null;
  }
  const sterileGspr = new Set(["11.4", "11.5", "11.6", "11.8"]);
  if (sterileGspr.has(gsprNo) && !ctx.isSterile) return null;
  if (gsprNo === "11.2" && !ctx.isReusable) return null;
  if (gsprNo === "11.7" && ctx.isSterile) return null;
  if (gsprNo === "11.4" || gsprNo === "11.5") {
    return ctx.isSterile ? `${sterilizationStandard(ctx.sterilization)}; ${PACK}` : null;
  }
  if (gsprNo === "10.4" && !ctx.containsCmrOrEndocrine) return null;
  if ((gsprNo === "10.4.2" || gsprNo === "10.4.5") && !ctx.containsCmrOrEndocrine) return null;

  if (gsprNo.startsWith("23.2.")) return LABEL;
  if (gsprNo.startsWith("23.3.")) return PACK;
  if (gsprNo.startsWith("23.4.")) return editionOf("ISO 20417");
  if (gsprNo.startsWith("10.4.")) return `${editionOf("ISO 10993-17")} / MDR Annex I 10.4`;
  if (gsprNo === "12.1" && !ctx.containsMedicinalSubstance) return null;
  if (gsprNo === "12.2" && !ctx.isAbsorbable) return null;
  if (gsprNo.startsWith("13.") && !ctx.containsBiologicalMaterial) return null;
  if (gsprNo.startsWith("19.") && !(ctx.isActive && ctx.isImplantable)) return null;
  if (gsprNo.startsWith("15.") && !ctx.hasMeasuringFn) return null;
  if (gsprNo.startsWith("16.") && !ctx.emitsRadiation) return null;
  if (gsprNo.startsWith("17.") && !ctx.containsSoftware) return null;
  if (gsprNo.startsWith("18.") && !ctx.isActive) return null;
  if (gsprNo.startsWith("21.") && !ctx.administersMedicineOrEnergy) return null;
  if (gsprNo.startsWith("22.") && !ctx.isForLayUser) return null;
  if (gsprNo === "5" && !ctx.isForLayUser && !ctx.isInvasive) return RM;
  if (gsprNo === "14.2" && !ctx.isActive) return null;
  if (gsprNo === "20.5" && !ctx.isActive) return null;

  return BASE[gsprNo] ?? null;
}

/** Expected evidence document types per GSPR (used for hints and file-kind mapping). */
export const GSPR_EVIDENCE_HINTS: Record<string, string> = {
  "1": `Risk management file / benefit-risk analysis (${RM})`,
  "3": `Risk management plan and report (${RM})`,
  "5": `Usability engineering file (${USAB})`,
  "10.1": `Biological evaluation plan/report (${BIO})`,
  "11.2": `Reprocessing / cleaning validation (${editionOf("ISO 17664")})`,
  "11.4": "Sterilization validation report",
  "17.2": `Software lifecycle records (${SW})`,
  "23.1": `Label and IFU (${LABEL})`,
  "23.2": "Label artwork",
  "23.4": "Instructions for use",
};

/** Map uploaded document kinds to GSPR numbers they typically support. */
export const DOCUMENT_KIND_TO_GSPR: Partial<Record<DocumentKind, string[]>> = {
  RISK_FILE: ["1", "2", "3", "4", "5", "8"],
  IFU: ["23.1", "23.4"],
  LABEL: ["23.1", "23.2"],
  CLINICAL_EVALUATION: ["1", "8"],
  PMS: ["1", "3"],
  PMCF: ["1", "8"],
  TEST_REPORT: ["10.1", "11.4", "6"],
  CERTIFICATE: ["1"],
  GSPR_EVIDENCE: [],
  TECHNICAL_DRAWING: ["6", "7", "20.1"],
};
