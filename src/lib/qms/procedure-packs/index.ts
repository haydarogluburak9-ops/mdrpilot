import { prisma } from "@/lib/db";

import { DEFAULT_QMS_REVISION } from "@/lib/qms/revision";

import { inferQmsLayerFromCode } from "@/lib/qms/kys-structure";

import { scaffoldCompanyQms } from "@/lib/qms/scaffold";

import {

  SOP_AN_CHILDREN,

  SOP_AN_CHILD_AI_HINTS,

  SOP_AN_PROCEDURE_CODE,

  SOP_AN_SHARED_LINKS,

} from "./sop-an-pack";

import {

  SOP_CC_CHILD_AI_HINTS,

  SOP_CC_PROCEDURE_CODE,

} from "./sop-cc-pack";

import {

  buildDefaultChildAiHints,

  getStructureChildrenForProcedure,

  listProcedureCodesWithChildren,

} from "./registry";

import type { KysStructureTemplate } from "../kys-structure";



export interface ProcedurePackDefinition {

  procedureCode: string;

  children: KysStructureTemplate[];

  sharedLinks: Record<string, string[]>;

  childAiHints: Record<string, { tr: string; en: string }>;

}



function buildAutoPack(procedureCode: string): ProcedurePackDefinition | null {

  const children = getStructureChildrenForProcedure(procedureCode);

  if (children.length === 0) return null;



  const sharedLinks: Record<string, string[]> = {};

  for (const [docCode, procedures] of Object.entries(SOP_AN_SHARED_LINKS)) {

    if (procedures.includes(procedureCode)) {

      sharedLinks[docCode] = [...procedures];

    }

  }



  let childAiHints = buildDefaultChildAiHints(procedureCode, children);

  if (procedureCode === SOP_AN_PROCEDURE_CODE) {

    childAiHints = { ...childAiHints, ...SOP_AN_CHILD_AI_HINTS };

  }

  if (procedureCode === SOP_CC_PROCEDURE_CODE) {

    childAiHints = { ...childAiHints, ...SOP_CC_CHILD_AI_HINTS };

  }



  return {

    procedureCode,

    children,

    sharedLinks,

    childAiHints,

  };

}



function buildPackRegistry(): Record<string, ProcedurePackDefinition> {

  const registry: Record<string, ProcedurePackDefinition> = {};



  for (const code of listProcedureCodesWithChildren()) {

    const pack = buildAutoPack(code);

    if (pack) registry[code] = pack;

  }



  // SOP-AN: explicit children list + shared link source definitions

  registry[SOP_AN_PROCEDURE_CODE] = {

    procedureCode: SOP_AN_PROCEDURE_CODE,

    children: SOP_AN_CHILDREN,

    sharedLinks: { ...SOP_AN_SHARED_LINKS },

    childAiHints: {

      ...buildDefaultChildAiHints(SOP_AN_PROCEDURE_CODE, SOP_AN_CHILDREN),

      ...SOP_AN_CHILD_AI_HINTS,

    },

  };



  return registry;

}



const PACK_BY_PROCEDURE = buildPackRegistry();



export function getProcedurePack(procedureCode: string): ProcedurePackDefinition | null {

  return PACK_BY_PROCEDURE[procedureCode.trim().toUpperCase()] ?? null;

}



export function listProcedurePackCodes(): string[] {

  return Object.keys(PACK_BY_PROCEDURE).sort();

}



export function parseLinkedProcedureCodes(json: unknown): string[] {

  if (!Array.isArray(json)) return [];

  return json

    .filter((x): x is string => typeof x === "string")

    .map((s) => s.trim().toUpperCase())

    .filter(Boolean);

}



export function mergeLinkedProcedureCodes(existing: unknown, add: string[]): string[] {

  const set = new Set(parseLinkedProcedureCodes(existing));

  for (const code of add) set.add(code.trim().toUpperCase());

  return [...set];

}



export function docLinkedToProcedure(

  doc: { parentProcedureCode?: string | null; linkedProcedureCodesJson?: unknown },

  procedureCode: string,

): boolean {

  const parent = procedureCode.trim().toUpperCase();

  if (doc.parentProcedureCode?.trim().toUpperCase() === parent) return true;

  return parseLinkedProcedureCodes(doc.linkedProcedureCodesJson).includes(parent);

}



export function getProcedurePackChildHints(

  procedureCode: string,

  locale: "tr" | "en",

): Record<string, string> {

  const pack = getProcedurePack(procedureCode);

  if (!pack) return {};

  const out: Record<string, string> = {};

  for (const [code, hints] of Object.entries(pack.childAiHints)) {

    out[code] = locale === "tr" ? hints.tr : hints.en;

  }

  return out;

}



export async function ensureProcedurePack(

  companyId: string,

  procedureCode: string,

): Promise<{ created: string[]; linked: string[] }> {

  const pack = getProcedurePack(procedureCode);

  if (!pack) return { created: [], linked: [] };



  await scaffoldCompanyQms(companyId, ["ISO 13485"]);



  const parent = await prisma.qMSDocument.findFirst({

    where: { companyId, code: pack.procedureCode, deletedAt: null, layer: "PROCEDURE" },

    select: { standard: true, clauseRefs: true },

  });

  if (!parent) return { created: [], linked: [] };



  const existing = await prisma.qMSDocument.findMany({

    where: { companyId, deletedAt: null },

    select: { id: true, code: true, linkedProcedureCodesJson: true },

  });

  const byCode = new Map(

    existing.filter((d) => d.code).map((d) => [d.code!.trim().toUpperCase(), d]),

  );



  const created: string[] = [];



  for (const child of pack.children) {

    const code = child.code.trim().toUpperCase();

    if (byCode.has(code)) continue;

    const row = await prisma.qMSDocument.create({

      data: {

        companyId,

        code: child.code,

        title: child.title,

        standard: parent.standard,

        layer: child.layer ?? inferQmsLayerFromCode(child.code),

        parentProcedureCode: child.parentProcedureCode ?? pack.procedureCode,

        clauseRefs: child.clauseRefs ?? parent.clauseRefs,

        status: "MISSING",

        version: DEFAULT_QMS_REVISION,

        revisionNo: 0,

      },

      select: { code: true },

    });

    created.push(row.code!);

    byCode.set(code, { id: "", code: row.code, linkedProcedureCodesJson: null });

  }



  const linked: string[] = [];

  for (const [docCode, procedures] of Object.entries(pack.sharedLinks)) {

    const row = await prisma.qMSDocument.findFirst({

      where: { companyId, code: docCode, deletedAt: null },

      select: { id: true, linkedProcedureCodesJson: true },

    });

    if (!row) continue;

    const merged = mergeLinkedProcedureCodes(row.linkedProcedureCodesJson, procedures);

    const prev = parseLinkedProcedureCodes(row.linkedProcedureCodesJson);

    if (merged.length === prev.length && merged.every((c, i) => c === prev[i])) continue;

    await prisma.qMSDocument.update({

      where: { id: row.id },

      data: { linkedProcedureCodesJson: merged },

    });

    linked.push(docCode);

  }



  return { created, linked };

}



/** Procedure codes that use product portfolio in child AI context. */

export function procedureUsesProductContext(procedureCode: string): boolean {

  const code = procedureCode.trim().toUpperCase();

  return code === SOP_AN_PROCEDURE_CODE || code === "SOP-CH" || code === "SOP-VG";

}


