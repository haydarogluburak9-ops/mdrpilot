export interface ClinicalQpDocuments {
  evaluatorName?: string;
  qualifications?: string;
  cvSummary?: string;
  cvFileKey?: string;
  cvFileName?: string;
  coiDeclared?: boolean;
  coiStatement?: string;
  coiFileKey?: string;
  coiFileName?: string;
  updatedAt?: string;
}

export function parseClinicalQpDocuments(raw: unknown): ClinicalQpDocuments | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as ClinicalQpDocuments;
  return {
    evaluatorName: o.evaluatorName?.trim() || undefined,
    qualifications: o.qualifications?.trim() || undefined,
    cvSummary: o.cvSummary?.trim() || undefined,
    cvFileKey: o.cvFileKey?.trim() || undefined,
    cvFileName: o.cvFileName?.trim() || undefined,
    coiDeclared: o.coiDeclared === true,
    coiStatement: o.coiStatement?.trim() || undefined,
    coiFileKey: o.coiFileKey?.trim() || undefined,
    coiFileName: o.coiFileName?.trim() || undefined,
    updatedAt: o.updatedAt,
  };
}

export function serializeQpDocumentsMarkdown(qp: ClinicalQpDocuments, locale: "tr" | "en"): string {
  const tr = locale === "tr";
  const lines = [
    tr ? "## Klinik değerlendirme sorumlusu (QP)" : "## Clinical evaluator (QP)",
    "",
    tr ? "| Alan | Değer |" : "| Field | Value |",
    "| --- | --- |",
    tr
      ? `| Değerlendiren | ${qp.evaluatorName ?? "—"} |`
      : `| Evaluator | ${qp.evaluatorName ?? "—"} |`,
    tr
      ? `| Yetkinlik / unvan | ${qp.qualifications ?? "—"} |`
      : `| Qualifications | ${qp.qualifications ?? "—"} |`,
    tr
      ? `| Çıkar çatışması beyanı | ${qp.coiDeclared ? "Beyan edildi" : "—"} |`
      : `| Conflict of interest | ${qp.coiDeclared ? "Declared" : "—"} |`,
  ];
  if (qp.coiStatement) {
    lines.push("", tr ? "**Çıkar çatışması notu:**" : "**COI statement:**", qp.coiStatement);
  }
  if (qp.cvSummary) {
    lines.push("", tr ? "**CV özeti:**" : "**CV summary:**", qp.cvSummary);
  }
  if (qp.cvFileName) {
    lines.push("", tr ? `**CV dosyası:** ${qp.cvFileName}` : `**CV file:** ${qp.cvFileName}`);
  }
  if (qp.coiFileName) {
    lines.push("", tr ? `**COI dosyası:** ${qp.coiFileName}` : `**COI file:** ${qp.coiFileName}`);
  }
  return lines.join("\n");
}

export function qpDocumentsComplete(qp: ClinicalQpDocuments | null | undefined): boolean {
  if (!qp) return false;
  return Boolean(
    qp.evaluatorName?.trim() &&
      qp.qualifications?.trim() &&
      qp.coiDeclared &&
      (qp.cvSummary?.trim() || qp.cvFileKey),
  );
}
