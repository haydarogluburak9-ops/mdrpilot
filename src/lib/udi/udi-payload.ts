import "server-only";

/** Build GS1 UDI payload for Data Matrix (simplified MDR UDI-DI + optional production identifiers). */
export function buildUdiPayload(input: {
  udiDi: string;
  lot?: string;
  serial?: string;
  expiry?: string;
  manufacturingDate?: string;
}): string {
  const di = input.udiDi.trim();
  if (!di) return "";

  const parts: string[] = [`(01)${di.replace(/\s/g, "")}`];
  if (input.lot?.trim()) parts.push(`(10)${input.lot.trim()}`);
  if (input.serial?.trim()) parts.push(`(21)${input.serial.trim()}`);
  if (input.expiry?.trim()) {
    const exp = input.expiry.replace(/-/g, "").slice(0, 8);
    if (exp.length === 8) parts.push(`(17)${exp}`);
  }
  if (input.manufacturingDate?.trim()) {
    const mfg = input.manufacturingDate.replace(/-/g, "").slice(0, 8);
    if (mfg.length === 8) parts.push(`(11)${mfg}`);
  }
  return parts.join("");
}

export type EudamedFields = {
  eudamedDeviceId: string | null;
  eudamedRegistrationStatus: string | null;
  basicUdiDi: string | null;
  udiDi: string | null;
  emdnCode: string | null;
  srnNumber: string | null;
};

export function eudamedReadiness(fields: EudamedFields): {
  score: number;
  missing: string[];
} {
  const checks: [string, boolean][] = [
    ["basicUdiDi", Boolean(fields.basicUdiDi?.trim())],
    ["udiDi", Boolean(fields.udiDi?.trim())],
    ["emdnCode", Boolean(fields.emdnCode?.trim())],
    ["srnNumber", Boolean(fields.srnNumber?.trim())],
    ["eudamedRegistrationStatus", fields.eudamedRegistrationStatus === "REGISTERED"],
  ];
  const missing = checks.filter(([, ok]) => !ok).map(([k]) => k);
  const score = Math.round(((checks.length - missing.length) / checks.length) * 100);
  return { score, missing };
}
