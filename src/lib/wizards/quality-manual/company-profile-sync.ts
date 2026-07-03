/**
 * Phase 0 — merge Settings company profile into QM wizard answers (client-safe).
 */

export interface CompanyProfileFields {
  name: string;
  legalName?: string | null;
  country?: string | null;
  address?: string | null;
  manufacturingSites?: string | null;
  authorizedRep?: string | null;
  srnNumber?: string | null;
  notifiedBody?: string | null;
  notifiedBodyNumber?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function setIfEmpty(merged: Record<string, unknown>, key: string, value: string) {
  if (!value) return;
  if (!str(merged[key])) merged[key] = value;
}

/** Pull company settings into wizard step-1 fields when wizard fields are empty. */
export function mergeCompanyProfileIntoWizardAnswers(
  answers: Record<string, unknown>,
  company: CompanyProfileFields,
  onlyFillEmpty = true,
): Record<string, unknown> {
  const merged = { ...answers };
  const apply = (key: string, value: string) => {
    if (!value) return;
    if (onlyFillEmpty && str(merged[key])) return;
    merged[key] = value;
  };

  apply("companyLegalName", str(company.legalName) || company.name);
  apply("tradeName", company.name !== company.legalName ? company.name : "");
  apply("address", str(company.address));
  apply("sites", str(company.manufacturingSites) || str(company.address));
  apply("contactEmail", str(company.contactEmail));
  apply("contactPhone", str(company.contactPhone));

  const markets: string[] = [];
  if (company.country) markets.push(company.country);
  if (company.authorizedRep) markets.push("EU (AR)");
  apply("regulatoryMarkets", markets.join(", "));

  const standards: string[] = [];
  if (company.notifiedBody || company.notifiedBodyNumber) standards.push("ISO 13485", "MDR 2017/745");
  apply("applicableStandards", standards.join(", "));

  if (company.notifiedBody) {
    const nb = `${company.notifiedBody}${company.notifiedBodyNumber ? ` (${company.notifiedBodyNumber})` : ""}`;
    setIfEmpty(merged, "applicableRegulations", `MDR 2017/745; NB: ${nb}`);
  }

  return merged;
}

export interface ProfileCompletenessItem {
  key: string;
  labelKey: string;
  done: boolean;
}

/** Phase 0 checklist for settings UI. */
export function companyProfileCompleteness(
  company: CompanyProfileFields,
): { percent: number; items: ProfileCompletenessItem[] } {
  const items: ProfileCompletenessItem[] = [
    { key: "name", labelKey: "settings.phase0.name", done: Boolean(str(company.name)) },
    { key: "legalName", labelKey: "settings.phase0.legalName", done: Boolean(str(company.legalName)) },
    { key: "country", labelKey: "settings.phase0.country", done: Boolean(str(company.country)) },
    { key: "address", labelKey: "settings.phase0.address", done: Boolean(str(company.address)) },
    { key: "sites", labelKey: "settings.phase0.sites", done: Boolean(str(company.manufacturingSites)) },
    { key: "srn", labelKey: "settings.phase0.srn", done: Boolean(str(company.srnNumber)) },
    { key: "nb", labelKey: "settings.phase0.nb", done: Boolean(str(company.notifiedBody)) },
    { key: "contact", labelKey: "settings.phase0.contact", done: Boolean(str(company.contactEmail)) },
  ];
  const done = items.filter((i) => i.done).length;
  return { percent: Math.round((done / items.length) * 100), items };
}
