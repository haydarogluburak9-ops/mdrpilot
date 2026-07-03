/** Client-safe helpers for opening generated KYS forms after creation. */

import type { OperationalLinkModule } from "@/lib/operational/modules";

export interface GeneratedDocRef {
  code: string;
  documentId: string;
}

/** Prefer explicit codes, then FORM-* docs, then any generated doc. */
export function prioritizeFormsToOpen(
  generated: GeneratedDocRef[],
  preferredCodes?: string[],
): string[] {
  if (generated.length === 0) return [];

  const byCode = new Map(generated.map((g) => [g.code.trim().toUpperCase(), g.code]));

  if (preferredCodes?.length) {
    const preferred = preferredCodes
      .map((c) => byCode.get(c.trim().toUpperCase()))
      .filter((c): c is string => Boolean(c));
    if (preferred.length > 0) return preferred;
  }

  const forms = generated
    .filter((g) => g.code.trim().toUpperCase().startsWith("FORM-"))
    .map((g) => g.code)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  if (forms.length > 0) return forms;

  return generated.map((g) => g.code);
}

export function buildProcedureFormUrl(
  procedureCode: string,
  openSequence: string[],
  hint?: string,
  recordLink?: { module: OperationalLinkModule; id: string },
): string {
  const proc = procedureCode.trim().toUpperCase();
  const base = `/qms/procedures/${encodeURIComponent(proc)}`;
  if (openSequence.length === 0) return base;

  const [first, ...rest] = openSequence;
  const params = new URLSearchParams();
  params.set("doc", first);
  if (rest.length > 0) params.set("queue", rest.join(","));
  if (hint?.trim()) params.set("hint", hint.trim().slice(0, 500));
  if (recordLink?.id?.trim()) {
    params.set("record", `${recordLink.module}:${recordLink.id.trim()}`);
  }
  return `${base}?${params.toString()}`;
}
