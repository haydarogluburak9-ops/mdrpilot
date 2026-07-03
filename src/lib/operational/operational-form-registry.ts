import { INTERNAL_AUDIT_FORM_CODES } from "@/lib/operational/internal-audit-codes";
import {
  FORM_CODE_TO_MODULE,
  OPERATIONAL_HUB_ITEMS,
  operationalModuleForFormCode,
  type OperationalLinkModule,
} from "@/lib/operational/modules";
import { PARENT_PROCEDURE_BY_CODE } from "@/lib/qms/procedure-children";

/** Form codes edited in Kalite Operasyonları (not under KYS procedure workspace). */
export const OPERATIONAL_MANAGED_FORM_CODES = new Set<string>([
  "FORM-CAPA-01",
  "FORM-CH-01",
  "FORM-CH-02",
  ...Object.keys(FORM_CODE_TO_MODULE),
  ...Object.values(INTERNAL_AUDIT_FORM_CODES),
]);

export function operationalHrefForModule(module: OperationalLinkModule): string {
  if (module === "capa") return "/operational/capa";
  if (module === "complaint") return "/operational/complaints";
  return `/operational/${module}`;
}

export function operationalHrefForFormCode(code: string | null | undefined): string | null {
  const linkModule = operationalModuleForFormCode(code);
  return linkModule ? operationalHrefForModule(linkModule) : null;
}

export function isOperationalManagedChild(procedureCode: string, childCode: string | null | undefined): boolean {
  const proc = procedureCode.trim().toUpperCase();
  const code = (childCode ?? "").trim().toUpperCase();
  if (!code || !OPERATIONAL_MANAGED_FORM_CODES.has(code)) return false;
  const parent = PARENT_PROCEDURE_BY_CODE[code];
  return parent === proc;
}

export function operationalNoticeForSop(sopCode: string): {
  href: string;
  labelKey: string;
  linkLabelKey: string;
} | null {
  const sop = sopCode.trim().toUpperCase();
  const hub = OPERATIONAL_HUB_ITEMS.find((item) => (item.sopCode ?? "").toUpperCase() === sop);
  if (!hub) return null;
  if (hub.slug === "internal-audit") {
    return { href: hub.href, labelKey: "operational.internalAudit.kysNotice", linkLabelKey: hub.labelKey };
  }
  return { href: hub.href, labelKey: "operational.kysNotice", linkLabelKey: hub.labelKey };
}
