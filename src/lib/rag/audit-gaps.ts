import type { Product } from "@/lib/domain/types";

export interface ClauseGap {
  standardCode: string;
  clauseNo: string;
  label: string;
  message: string;
  severity: "high" | "medium";
}

/**
 * Deterministic, clause-level audit readiness gaps.
 * Maps the product dossier state onto specific standard clauses so findings are
 * actionable (e.g. "MDR Annex II — Device description incomplete") rather than generic.
 * Clause numbers align with the seeded Standards Knowledge Base.
 */
export function computeClauseGaps(product: Product): ClauseGap[] {
  const gaps: ClauseGap[] = [];
  const sections = product.technicalSections ?? [];
  const gspr = product.gsprItems ?? [];
  const risks = product.riskItems ?? [];

  const section = (key: string) => sections.find((s) => s.key === key);
  const gsprItem = (no: string) => gspr.find((g) => g.gsprNo === no);
  const gsprMissing = (g?: { applicable?: string; evidenceDocument?: string | null; status?: string }) =>
    !!g && g.applicable !== "NO" && (!g.evidenceDocument || g.status === "MISSING");

  // MDR Annex II — device description
  const desc = section("device-description");
  if (!desc || desc.status !== "APPROVED") {
    gaps.push({ standardCode: "MDR 2017/745", clauseNo: "Annex II 1.1", label: "Device description and specification",
      message: "Device description and specification is incomplete or not approved.", severity: "high" });
  }

  // MDR Annex I GSPR 10.1 — biological safety
  if (gsprMissing(gsprItem("10.1"))) {
    gaps.push({ standardCode: "MDR 2017/745", clauseNo: "Annex I 10.1", label: "Chemical/physical/biological properties",
      message: "Biological safety / biocompatibility evidence (ISO 10993) is missing.", severity: "high" });
  }

  // MDR Annex I GSPR 11.2 — sterility (only when sterile)
  if (product.isSterile && gsprMissing(gsprItem("11.2"))) {
    gaps.push({ standardCode: "MDR 2017/745", clauseNo: "Annex I 11.2", label: "Devices in a sterile state",
      message: "Sterilization validation evidence (ISO 11135 / ISO 11607) is missing.", severity: "high" });
  }

  // ISO 13485 4.2.3 — medical device file
  const notApproved = sections.filter((s) => s.status !== "APPROVED").length;
  if (notApproved > 0) {
    gaps.push({ standardCode: "ISO 13485", clauseNo: "4.2.3", label: "Medical Device File",
      message: `Medical Device File incomplete — ${notApproved} technical file section(s) not approved.`, severity: "medium" });
  }

  // ISO 14971 — risk controls & verification
  const uncontrolled = risks.filter((r) => !r.riskControlMeasure || !r.verificationOfControl).length;
  if (uncontrolled > 0) {
    gaps.push({ standardCode: "ISO 14971", clauseNo: "Clause 7-8", label: "Risk control & residual risk",
      message: `Risk control or verification of control incomplete for ${uncontrolled} hazard(s).`, severity: "high" });
  }

  // MDR Annex XIV — clinical evaluation (Clinical module)
  if (risks.length === 0) {
    gaps.push({ standardCode: "ISO 14971", clauseNo: "Clause 4", label: "Risk management file",
      message: "Risk management file has no documented hazards — use the Risk Management tab.", severity: "high" });
  }

  // PSUR / PMS report reference in technical file
  const psurPms = section("psur-report");
  if (!psurPms || psurPms.status === "MISSING") {
    gaps.push({ standardCode: "MDR 2017/745", clauseNo: "Art. 86", label: "PSUR / PMS report",
      message: "PSUR / PMS report reference missing in technical file (full PMS in PMS module).", severity: "medium" });
  }

  return gaps;
}
