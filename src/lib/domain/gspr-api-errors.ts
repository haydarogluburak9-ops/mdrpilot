/** Map GSPR API error payloads to localized UI strings. */
export function translateGsprApiError(
  msg: string | undefined,
  t: (key: string) => string,
): string {
  if (!msg) return t("gspr.status.err.generic");
  if (msg.startsWith("gspr.")) return t(msg);

  const known: Record<string, string> = {
    "justification, evidenceDocument or status is required": "gspr.api.err.bodyRequired",
    "GSPR item not found": "gspr.api.err.itemNotFound",
    "Product not found": "gspr.api.err.productNotFound",
    "Consultant role required": "gspr.api.err.consultantRole",
  };
  if (known[msg]) return t(known[msg]);

  if (/cannot change status/i.test(msg)) return t("gspr.status.err.transition");
  if (/real evidence/i.test(msg)) return t("gspr.status.err.evidence");
  if (/justification is required/i.test(msg)) return t("gspr.status.err.justification");
  if (/quality manager/i.test(msg)) return t("gspr.status.err.approveRole");

  return t("gspr.status.err.generic");
}