import type { DeviceClass } from "./types";

/**
 * Device characteristics that drive which technical-file sections and GSPR
 * requirements are applicable. Mirrors the boolean flags on the Product model.
 */
export interface ApplicabilityInput {
  deviceClass: DeviceClass;
  isSterile: boolean;
  containsSoftware: boolean;
  hasMeasuringFn: boolean;
  isInvasive: boolean;
  isImplantable: boolean;
  isActive: boolean;
  isReusable: boolean;
  emitsRadiation: boolean;
  administersMedicineOrEnergy: boolean;
  containsMedicinalSubstance: boolean;
  containsBiologicalMaterial: boolean;
  isAbsorbable: boolean;
  containsCmrOrEndocrine: boolean;
  containsNanomaterial: boolean;
  isForLayUser: boolean;
}

export interface NaEntry {
  /** technical-file section key or GSPR number */
  id: string;
  /** short, human-readable reason (English; UI may localise the badge label) */
  reason: string;
}

export interface ApplicabilityResult {
  sections: NaEntry[];
  gspr: NaEntry[];
}

const REASON = {
  nonSterile: "Non-sterile device",
  suppliedSterile: "Device supplied sterile",
  noSoftware: "Device contains no software",
  noMeasuring: "Device has no measuring/diagnostic function",
  notImplantSscp: "SSCP is required only for Class III and implantable devices",
  notImplantInvestigation: "Own clinical investigation expected mainly for Class III / implantable devices",
  notImplantCard: "Implant card is required only for implantable devices",
  notReusable: "Single-use device (no reprocessing)",
  notActive: "Non-active device (no electrical/energy source)",
  noRadiation: "Device does not emit radiation",
  noDelivery: "Device does not administer or remove medicines or energy",
  noMedicinal: "Device incorporates no medicinal substance",
  noBiological: "Device contains no materials of biological origin",
  noCmr: "Device contains no CMR / endocrine-disrupting substances",
  noNano: "Device contains no nanomaterials",
  notLayUser: "Device is intended for professional use only",
  notAbsorbable: "Device is not absorbable or locally dispersed in the body",
  notActiveImplant: "Not an active implantable device",
};

/**
 * Conservative applicability rules. An item is marked "not applicable" only when
 * a device flag lets us infer it with confidence; everything else stays
 * applicable so the user can decide. The rules never look at content/status —
 * that guarding is done by the apply step so manual work is never overwritten.
 *
 * Covers all MDR device classes and the full set of characteristic-driven
 * sections / Annex I GSPRs (sterility, software, measuring, active/energy,
 * radiation, medicinal/biological substances, CMR, nanomaterials, implants,
 * reusable instruments and lay-user devices).
 */
export function evaluateApplicability(input: ApplicabilityInput): ApplicabilityResult {
  const sections: NaEntry[] = [];
  const gspr: NaEntry[] = [];

  const isClassIII = input.deviceClass === "CLASS_III";
  // MDR Art. 32 / Art. 18: SSCP + implant card scope.
  const needsSscp = isClassIII || input.isImplantable;

  // --- Sterility (MDR Annex I Section 11.4–11.8, 23.3) ---
  if (!input.isSterile) {
    sections.push({ id: "sterilization", reason: REASON.nonSterile });
    sections.push({ id: "packaging", reason: REASON.nonSterile });
    for (const no of ["11.4", "11.5", "11.6", "11.8", "23.3"]) {
      gspr.push({ id: no, reason: REASON.nonSterile });
    }
  } else {
    gspr.push({ id: "11.7", reason: REASON.suppliedSterile });
  }

  // --- Reusable / reprocessing (11.2) ---
  if (!input.isReusable) {
    sections.push({ id: "reprocessing", reason: REASON.notReusable });
    gspr.push({ id: "11.2", reason: REASON.notReusable });
  }

  // --- Software ---
  if (!input.containsSoftware) {
    sections.push({ id: "software-validation", reason: REASON.noSoftware });
    for (const no of ["17.1", "17.2", "17.3", "17.4"]) {
      gspr.push({ id: no, reason: REASON.noSoftware });
    }
  }

  // --- Measuring / diagnostic function ---
  if (!input.hasMeasuringFn) {
    for (const no of ["15.1", "15.2"]) {
      gspr.push({ id: no, reason: REASON.noMeasuring });
    }
  }

  // --- Active devices (electrical / energy source) ---
  if (!input.isActive) {
    sections.push({ id: "electrical-safety", reason: REASON.notActive });
    for (const no of ["18.1", "18.2", "18.3", "18.4", "18.5", "18.6", "18.7", "18.8", "20.2", "20.3", "21.3"]) {
      gspr.push({ id: no, reason: REASON.notActive });
    }
  }

  // --- Radiation ---
  if (!input.emitsRadiation) {
    for (const no of ["16.1", "16.2", "16.3", "16.4"]) {
      gspr.push({ id: no, reason: REASON.noRadiation });
    }
  }

  // --- Delivery / removal of medicines or energy ---
  if (!input.administersMedicineOrEnergy) {
    for (const no of ["21.1", "21.2"]) {
      gspr.push({ id: no, reason: REASON.noDelivery });
    }
  }

  // --- Medicinal substance with ancillary action ---
  if (!input.containsMedicinalSubstance) {
    gspr.push({ id: "12.1", reason: REASON.noMedicinal });
  }

  // --- Absorbable / locally dispersed ---
  if (!input.isAbsorbable) {
    gspr.push({ id: "12.2", reason: REASON.notAbsorbable });
  }

  // --- Materials of biological origin ---
  if (!input.containsBiologicalMaterial) {
    gspr.push({ id: "13.1", reason: REASON.noBiological });
    gspr.push({ id: "13.2", reason: REASON.noBiological });
    gspr.push({ id: "13.3", reason: REASON.noBiological });
  }

  // --- Active implantable devices (Section 19) ---
  if (!input.isImplantable || !input.isActive) {
    for (const no of ["19.1", "19.2", "19.3", "19.4"]) {
      gspr.push({ id: no, reason: REASON.notActiveImplant });
    }
  }

  // --- CMR / endocrine-disrupting substances ---
  if (!input.containsCmrOrEndocrine) {
    gspr.push({ id: "10.4", reason: REASON.noCmr });
  }

  // --- Nanomaterials ---
  if (!input.containsNanomaterial) {
    gspr.push({ id: "10.6", reason: REASON.noNano });
  }

  // --- Lay-user devices ---
  if (!input.isForLayUser) {
    for (const no of ["22.1", "22.2", "22.3"]) {
      gspr.push({ id: no, reason: REASON.notLayUser });
    }
  }

  // --- Implantable / Class III specific documentation ---
  if (!input.isImplantable) {
    sections.push({ id: "implant-card", reason: REASON.notImplantCard });
  }
  if (!needsSscp) {
    sections.push({ id: "sscp", reason: REASON.notImplantSscp });
  }

  return { sections, gspr };
}

/** Resolve NA reason for any GSPR row including detailed sub-clauses (23.2.a, 23.4.ab, …). */
export function resolveGsprNaReason(gsprNo: string, input: ApplicabilityInput): string | undefined {
  const base = evaluateApplicability(input);
  const exact = base.gspr.find((e) => e.id === gsprNo);
  if (exact) return exact.reason;

  const sterilePackaging = gsprNo.startsWith("23.3.");
  const sterileLabel = gsprNo === "23.2.l" || gsprNo === "23.4.l";
  const nonSterileSterilise = gsprNo === "23.4.m";
  if ((sterilePackaging || sterileLabel) && !input.isSterile) return REASON.nonSterile;
  if (nonSterileSterilise && input.isSterile) return REASON.suppliedSterile;

  if (gsprNo.startsWith("23.4.n") || gsprNo.startsWith("23.4.o") || gsprNo === "23.2.o") {
    if (!input.isReusable) return REASON.notReusable;
  }
  if (gsprNo === "23.4.aa" && !input.isImplantable) return REASON.notImplantCard;
  if (gsprNo === "23.4.w" && !input.isForLayUser) return REASON.notLayUser;
  if (gsprNo === "23.4.ab" && !input.containsSoftware) return REASON.noSoftware;
  if (gsprNo === "23.4.r" && !input.emitsRadiation) return REASON.noRadiation;
  if (gsprNo === "23.4.d" && !input.isImplantable && input.deviceClass !== "CLASS_III") {
    return REASON.notImplantSscp;
  }
  if ((gsprNo === "23.2.e" || gsprNo === "23.2.f") && !input.containsMedicinalSubstance && !input.containsBiologicalMaterial) {
    return REASON.noMedicinal;
  }
  if (gsprNo === "23.2.r" && !input.isAbsorbable) return REASON.notAbsorbable;
  if (gsprNo === "23.2.s" && !input.isImplantable) return REASON.notImplantCard;
  if (gsprNo.startsWith("10.4.") && !input.containsCmrOrEndocrine) return REASON.noCmr;

  const parent = gsprNo.replace(/\.[a-z]{1,2}$/i, "");
  if (parent !== gsprNo) {
    const parentReason = base.gspr.find((e) => e.id === parent);
    if (parentReason) return parentReason.reason;
  }
  return undefined;
}
