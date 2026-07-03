/** Client-safe procedure pack registry (no server-only imports). */

import { listProcedureCodesWithChildren } from "./registry";



export const PROCEDURE_PACK_CODES = listProcedureCodesWithChildren();



export function hasProcedurePack(procedureCode: string): boolean {

  return PROCEDURE_PACK_CODES.includes(procedureCode.trim().toUpperCase());

}

