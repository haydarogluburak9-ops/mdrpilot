import "server-only";
import { NotFoundError } from "@/lib/auth/errors";
import {
  INTERNAL_AUDIT_FORM_CODES,
  internalAuditDocKindFromCode,
  type InternalAuditDocKind,
} from "@/lib/operational/internal-audit-codes";
import { getInternalAuditCycle } from "@/lib/operational/internal-audit-service";
import { generateOperationalQmsForm } from "@/lib/operational/operational-generate";
import { OPERATIONAL_MODULES } from "@/lib/operational/modules";

function formCodeForKind(kind: InternalAuditDocKind): string {
  if (kind === "plan") return INTERNAL_AUDIT_FORM_CODES.plan;
  if (kind === "checklist") return INTERNAL_AUDIT_FORM_CODES.checklist;
  return INTERNAL_AUDIT_FORM_CODES.report;
}

export async function generateInternalAuditDoc(params: {
  companyId: string;
  cycleId: string;
  kind: InternalAuditDocKind;
  locale: "tr" | "en";
  generatedBy: string;
  userContext?: string;
}) {
  const cycle = await getInternalAuditCycle(params.companyId, params.cycleId);
  if (!cycle) throw new NotFoundError();

  const formCode = formCodeForKind(params.kind);
  const hint =
    params.userContext?.trim() || `${cycle.year} iç tetkik — ${formCode}`;

  return generateOperationalQmsForm({
    companyId: params.companyId,
    formCode,
    sopCode: OPERATIONAL_MODULES["internal-audit"].sopCode,
    locale: params.locale,
    generatedBy: params.generatedBy,
    userContext: hint,
    operationalLink: { module: "internal-audit", id: params.cycleId },
  });
}

/** @deprecated use internalAuditDocKindFromCode */
export function isInternalAuditQmsCode(code: string | null | undefined): boolean {
  return internalAuditDocKindFromCode(code) !== null;
}
