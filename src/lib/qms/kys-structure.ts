/**
 * Certified-style KYS folder tree (client-safe).
 * Mirrors: 01 El Kitabı → 02 Prosedürler → … → 14 Kayıtlar.
 */

import { EXTENDED_PROCEDURE_CHILDREN } from "./procedure-pack-children";
import type { Lang } from "@/lib/i18n/locales";
import { binaryContentLang } from "@/lib/i18n/locales";

export type QmsDocumentLayer =
  | "MANUAL"
  | "PROCEDURE"
  | "OTHER"
  | "PLAN"
  | "DIAGRAM"
  | "LIST"
  | "SPECIFICATION"
  | "JOB_DESCRIPTION"
  | "INSTRUCTION"
  | "FORM"
  | "ASSIGNMENT"
  | "RECORD";

export interface KysLayerDefinition {
  folderNo: string;
  layer: QmsDocumentLayer;
  titleTr: string;
  titleEn: string;
  descriptionTr: string;
  descriptionEn: string;
}

/** Ordered KYS folder tree (ISO 13485 document hierarchy). */
export const KYS_LAYER_DEFINITIONS: KysLayerDefinition[] = [
  {
    folderNo: "01",
    layer: "MANUAL",
    titleTr: "El Kitabı",
    titleEn: "Quality Manual",
    descriptionTr: "KYS üst doküman; kapsam, süreç etkileşimi ve prosedür referansları.",
    descriptionEn: "Top-level QMS document; scope, process interaction and procedure references.",
  },
  {
    folderNo: "02",
    layer: "PROCEDURE",
    titleTr: "Prosedürler",
    titleEn: "Procedures",
    descriptionTr: "ISO 13485 dokümante edilmiş prosedürler (SOP-*).",
    descriptionEn: "ISO 13485 documented procedures (SOP-*).",
  },
  {
    folderNo: "03",
    layer: "OTHER",
    titleTr: "Diğer Dokümanlar",
    titleEn: "Other Documents",
    descriptionTr: "Politika, hedef tabloları ve prosedür dışı kontrollü dokümanlar.",
    descriptionEn: "Policy, objective tables and controlled docs outside procedures.",
  },
  {
    folderNo: "04",
    layer: "PLAN",
    titleTr: "Planlar",
    titleEn: "Plans",
    descriptionTr: "Kalite, iç tetkik ve yönetim gözden geçirme planları.",
    descriptionEn: "Quality, internal audit and management review plans.",
  },
  {
    folderNo: "05",
    layer: "DIAGRAM",
    titleTr: "Şemalar",
    titleEn: "Diagrams",
    descriptionTr: "Organizasyon şeması, süreç haritası ve akış şemaları.",
    descriptionEn: "Organization chart, process map and flow diagrams.",
  },
  {
    folderNo: "06",
    layer: "LIST",
    titleTr: "Listeler",
    titleEn: "Lists",
    descriptionTr: "Doküman listesi, kayıt listesi, ekipman ve tedarikçi listeleri.",
    descriptionEn: "Document list, record list, equipment and supplier lists.",
  },
  {
    folderNo: "07",
    layer: "SPECIFICATION",
    titleTr: "Şartnameler",
    titleEn: "Specifications",
    descriptionTr: "Ürün, malzeme ve hizmet şartnameleri.",
    descriptionEn: "Product, material and service specifications.",
  },
  {
    folderNo: "08",
    layer: "JOB_DESCRIPTION",
    titleTr: "Görev Tanımları",
    titleEn: "Job Descriptions",
    descriptionTr: "Rol bazlı görev, yetki ve sorumluluk tanımları.",
    descriptionEn: "Role-based job descriptions, authority and responsibilities.",
  },
  {
    folderNo: "09",
    layer: "INSTRUCTION",
    titleTr: "Talimatlar",
    titleEn: "Work Instructions",
    descriptionTr: "Prosedür altı iş talimatları (WI-*).",
    descriptionEn: "Work instructions under procedures (WI-*).",
  },
  {
    folderNo: "10",
    layer: "FORM",
    titleTr: "Formlar",
    titleEn: "Forms",
    descriptionTr: "Boş formlar ve şablonlar; kayıt oluşturmak için kullanılır.",
    descriptionEn: "Blank forms and templates used to create records.",
  },
  {
    folderNo: "12",
    layer: "ASSIGNMENT",
    titleTr: "Atamalar",
    titleEn: "Appointments",
    descriptionTr: "Yönetim temsilcisi, PRRC ve kritik rol atama yazıları.",
    descriptionEn: "Management representative, PRRC and key role appointment letters.",
  },
  {
    folderNo: "14",
    layer: "RECORD",
    titleTr: "Kayıtlar",
    titleEn: "Records",
    descriptionTr: "Onaylı formlar, denetim kayıtları ve nesnel kanıtlar.",
    descriptionEn: "Approved forms, audit records and objective evidence.",
  },
];

export interface KysStructureTemplate {
  code: string;
  title: string;
  layer: QmsDocumentLayer;
  clauseRefs?: string;
  parentProcedureCode?: string;
}

/** Scaffold documents beyond ISO 13485 SOP register (one folder tree). */
export const KYS_STRUCTURE_TEMPLATES: KysStructureTemplate[] = [
  { code: "DOC-OTH-01", title: "Quality Policy and Objectives Package", layer: "OTHER", clauseRefs: "5.2, 5.3, 5.4.1", parentProcedureCode: "SOP-MR" },
  { code: "PLAN-QA-01", title: "Annual Quality Plan", layer: "PLAN", clauseRefs: "5.4.2", parentProcedureCode: "SOP-MR" },
  { code: "PLAN-IA-01", title: "Internal Audit Plan", layer: "PLAN", clauseRefs: "8.2.4", parentProcedureCode: "SOP-IA" },
  { code: "PLAN-MR-01", title: "Management Review Plan", layer: "PLAN", clauseRefs: "5.6", parentProcedureCode: "SOP-MR" },
  { code: "DIA-ORG-01", title: "Organization Chart", layer: "DIAGRAM", clauseRefs: "5.5.1", parentProcedureCode: "SOP-ORG" },
  { code: "DIA-PRC-01", title: "Process Map", layer: "DIAGRAM", clauseRefs: "4.1.2", parentProcedureCode: "SOP-ORG" },
  { code: "LIST-DC-01", title: "Master Document List", layer: "LIST", clauseRefs: "4.2.4", parentProcedureCode: "SOP-DC" },
  { code: "LIST-RC-01", title: "Master Record List", layer: "LIST", clauseRefs: "4.2.5", parentProcedureCode: "SOP-RC" },
  { code: "LIST-EQ-01", title: "Equipment and Calibration List", layer: "LIST", clauseRefs: "7.6", parentProcedureCode: "SOP-ME" },
  { code: "SPEC-PRD-01", title: "Product Specification Template", layer: "SPECIFICATION", clauseRefs: "7.1", parentProcedureCode: "SOP-DD" },
  { code: "JD-GM-01", title: "General Manager Job Description", layer: "JOB_DESCRIPTION", clauseRefs: "5.5.1", parentProcedureCode: "SOP-ORG" },
  { code: "JD-QM-01", title: "Quality Manager Job Description", layer: "JOB_DESCRIPTION", clauseRefs: "5.5.1", parentProcedureCode: "SOP-ORG" },
  { code: "JD-PRRC-01", title: "PRRC Job Description", layer: "JOB_DESCRIPTION", clauseRefs: "5.5.1", parentProcedureCode: "SOP-ORG" },
  { code: "WI-GEN-01", title: "General Work Instruction Template", layer: "INSTRUCTION", clauseRefs: "7.5.1", parentProcedureCode: "SOP-PC" },
  { code: "FORM-CH-01", title: "Complaint Form", layer: "FORM", clauseRefs: "8.2.2", parentProcedureCode: "SOP-CH" },
  { code: "FORM-CH-02", title: "Complaint–CAPA Linkage Form (when CAPA required)", layer: "FORM", clauseRefs: "8.2.2 / 8.5.2", parentProcedureCode: "SOP-CH" },
  { code: "FORM-CAPA-01", title: "CAPA Form", layer: "FORM", clauseRefs: "8.5.2", parentProcedureCode: "SOP-CAPA" },
  { code: "FORM-IA-01", title: "Internal Audit Checklist", layer: "FORM", clauseRefs: "8.2.4", parentProcedureCode: "SOP-IA" },
  { code: "FORM-MR-01", title: "Management Review Form", layer: "FORM", clauseRefs: "5.6", parentProcedureCode: "SOP-MR" },
  { code: "FORM-NCP-01", title: "Nonconforming Product Form", layer: "FORM", clauseRefs: "8.3", parentProcedureCode: "SOP-NCP" },
  { code: "ASG-YT-01", title: "Management Representative Appointment", layer: "ASSIGNMENT", clauseRefs: "5.5.2", parentProcedureCode: "SOP-ORG" },
  { code: "ASG-PRRC-01", title: "PRRC Appointment Letter", layer: "ASSIGNMENT", clauseRefs: "5.5.1", parentProcedureCode: "SOP-ORG" },
  { code: "REC-GUIDE-01", title: "Records Filing Guide", layer: "RECORD", clauseRefs: "4.2.5", parentProcedureCode: "SOP-RC" },
  // SOP-AN — Advisory / FSCA pack
  { code: "DIA-AN-01", title: "Advisory vs FSCA Decision Flow and Reporting Timelines", layer: "DIAGRAM", clauseRefs: "8.3.3 / MDR Art. 87-90", parentProcedureCode: "SOP-AN" },
  { code: "FORM-AN-01", title: "FSCA Initiation and Initial Assessment Form", layer: "FORM", clauseRefs: "8.3.3", parentProcedureCode: "SOP-AN" },
  { code: "FORM-AN-02", title: "Field Safety Notice (FSN) Template", layer: "FORM", clauseRefs: "8.3.3 / MDR Art. 95", parentProcedureCode: "SOP-AN" },
  { code: "FORM-AN-03", title: "Advisory Notice Template", layer: "FORM", clauseRefs: "8.3.3", parentProcedureCode: "SOP-AN" },
  { code: "FORM-AN-04", title: "FSN Distribution and Read-Receipt Log", layer: "FORM", clauseRefs: "8.3.3", parentProcedureCode: "SOP-AN" },
  { code: "FORM-AN-05", title: "RMA / Return / Recall Tracking Form", layer: "FORM", clauseRefs: "8.3.3 / 7.5.9", parentProcedureCode: "SOP-AN" },
  { code: "FORM-AN-06", title: "FSCA Effectiveness Verification Checklist", layer: "FORM", clauseRefs: "8.3.3 / 8.5.2", parentProcedureCode: "SOP-AN" },
  { code: "WI-AN-01", title: "EUDAMED and National Portal FSCA Reporting Work Instruction", layer: "INSTRUCTION", clauseRefs: "8.3.3 / MDR Art. 95", parentProcedureCode: "SOP-AN" },
  { code: "LIST-AN-01", title: "Customer / Distributor FSN Contact List", layer: "LIST", clauseRefs: "8.3.3", parentProcedureCode: "SOP-AN" },
  { code: "REC-AN-01", title: "Sample Completed FSCA Case Record (Mock Recall)", layer: "RECORD", clauseRefs: "4.2.5 / 8.3.3", parentProcedureCode: "SOP-AN" },
  // SOP-CC — Change control pack
  { code: "DIA-CC-01", title: "Change Control Process Flow", layer: "DIAGRAM", clauseRefs: "4.1.4 / MDR Art. 120", parentProcedureCode: "SOP-CC" },
  { code: "FORM-CC-01", title: "Change Request (CR) Form", layer: "FORM", clauseRefs: "4.1.4", parentProcedureCode: "SOP-CC" },
  { code: "FORM-CC-02", title: "Change Impact Assessment Form", layer: "FORM", clauseRefs: "4.1.4 / 7.3.9", parentProcedureCode: "SOP-CC" },
  { code: "FORM-CC-03", title: "Significant Change Assessment Form (MDCG 2020-3)", layer: "FORM", clauseRefs: "MDR Art. 120 / MDCG 2020-3", parentProcedureCode: "SOP-CC" },
  { code: "LIST-CC-01", title: "Change Register", layer: "LIST", clauseRefs: "4.1.4", parentProcedureCode: "SOP-CC" },
  { code: "REC-CC-01", title: "Sample Completed Change Request Record", layer: "RECORD", clauseRefs: "4.2.5 / 4.1.4", parentProcedureCode: "SOP-CC" },
  ...EXTENDED_PROCEDURE_CHILDREN,
];

export function inferQmsLayerFromCode(code: string | null | undefined): QmsDocumentLayer {
  if (!code) return "OTHER";
  const c = code.trim().toUpperCase();
  if (c.startsWith("QM-")) return "MANUAL";
  if (c.startsWith("SOP-")) return "PROCEDURE";
  if (c.startsWith("WI-") || c.startsWith("TAL-")) return "INSTRUCTION";
  if (c.startsWith("FORM-") || c.startsWith("FRM-")) return "FORM";
  if (c.startsWith("PLAN-")) return "PLAN";
  if (c.startsWith("DIA-") || c.startsWith("SCH-")) return "DIAGRAM";
  if (c.startsWith("LIST-") || c.startsWith("LST-")) return "LIST";
  if (c.startsWith("SPEC-")) return "SPECIFICATION";
  if (c.startsWith("JD-") || c.startsWith("GT-")) return "JOB_DESCRIPTION";
  if (c.startsWith("DOC-") || c.startsWith("OTH-")) return "OTHER";
  if (c.startsWith("ASG-") || c.startsWith("ATM-")) return "ASSIGNMENT";
  if (c.startsWith("REC-") || c.startsWith("KAY-")) return "RECORD";
  if (c.startsWith("9001-")) return "OTHER";
  return "PROCEDURE";
}

export function layerFolderNo(layer: QmsDocumentLayer): string {
  return KYS_LAYER_DEFINITIONS.find((l) => l.layer === layer)?.folderNo ?? "02";
}

export function layerTitle(layer: QmsDocumentLayer, locale: Lang): string {
  const def = KYS_LAYER_DEFINITIONS.find((l) => l.layer === layer);
  if (!def) return layer;
  const contentLocale = binaryContentLang(locale);
  return contentLocale === "tr" ? def.titleTr : def.titleEn;
}

export function sortQmsDocsByKysTree<T extends { layer?: QmsDocumentLayer | string | null; code: string | null }>(
  docs: T[],
): T[] {
  const order = KYS_LAYER_DEFINITIONS.map((l) => l.layer);
  return [...docs].sort((a, b) => {
    const la = (a.layer as QmsDocumentLayer) ?? inferQmsLayerFromCode(a.code);
    const lb = (b.layer as QmsDocumentLayer) ?? inferQmsLayerFromCode(b.code);
    const ai = order.indexOf(la);
    const bi = order.indexOf(lb);
    if (ai !== bi) return ai - bi;
    return (a.code ?? "").localeCompare(b.code ?? "", undefined, { numeric: true });
  });
}

export function groupQmsDocsByLayer<T extends { layer?: QmsDocumentLayer | string | null; code: string | null }>(
  docs: T[],
): Array<{ layer: QmsDocumentLayer; docs: T[] }> {
  const sorted = sortQmsDocsByKysTree(docs);
  const groups = new Map<QmsDocumentLayer, T[]>();
  for (const layer of KYS_LAYER_DEFINITIONS) groups.set(layer.layer, []);
  for (const doc of sorted) {
    const layer = (doc.layer as QmsDocumentLayer) ?? inferQmsLayerFromCode(doc.code);
    const bucket = groups.get(layer) ?? groups.get("PROCEDURE")!;
    bucket.push(doc);
  }
  return KYS_LAYER_DEFINITIONS.map((def) => ({ layer: def.layer, docs: groups.get(def.layer) ?? [] }));
}
