import "server-only";
import type { DesignControlPhase } from "@prisma/client";

export type DesignTraceLink = {
  phase: DesignControlPhase;
  title: string;
  reference: string | null;
  status: string;
  linkedRisk?: string | null;
  linkedClinical?: string | null;
};

const PHASE_ORDER: DesignControlPhase[] = [
  "DESIGN_INPUT",
  "DESIGN_OUTPUT",
  "DESIGN_REVIEW",
  "DESIGN_VERIFICATION",
  "DESIGN_VALIDATION",
  "DESIGN_TRANSFER",
];

/** Build ISO 13485 7.3 traceability matrix from design control records. */
export function buildDesignTraceabilityMatrix(
  records: {
    phase: DesignControlPhase;
    title: string;
    reference: string | null;
    status: string;
    description: string | null;
  }[],
  locale: "tr" | "en",
): DesignTraceLink[] {
  const tr = locale === "tr";
  const byPhase = new Map(records.map((r) => [r.phase, r]));

  return PHASE_ORDER.map((phase) => {
    const rec = byPhase.get(phase);
    const desc = rec?.description ?? "";
    return {
      phase,
      title: rec?.title ?? (tr ? "—" : "—"),
      reference: rec?.reference ?? null,
      status: rec?.status ?? "MISSING",
      linkedRisk: /risk|14971|risk/i.test(desc) ? (tr ? "Risk dosyası" : "Risk file") : null,
      linkedClinical: /clinical|klinik|cer/i.test(desc) ? "CER" : null,
    };
  });
}

export function traceabilityMatrixMarkdown(links: DesignTraceLink[], locale: "tr" | "en"): string {
  const tr = locale === "tr";
  const header = tr
    ? "| Aşama | Kayıt | Referans | Durum | Risk bağlantısı | Klinik bağlantısı |"
    : "| Phase | Record | Reference | Status | Risk link | Clinical link |";
  const sep = "|-------|--------|-----------|--------|-------------|-----------------|";
  const rows = links.map((l) =>
    `| ${l.phase} | ${l.title} | ${l.reference ?? "—"} | ${l.status} | ${l.linkedRisk ?? "—"} | ${l.linkedClinical ?? "—"} |`,
  );
  return [tr ? "## Tasarım izlenebilirlik matrisi (7.3)" : "## Design traceability matrix (7.3)", "", header, sep, ...rows].join(
    "\n",
  );
}
