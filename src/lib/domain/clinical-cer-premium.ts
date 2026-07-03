import type { ClinicalSectionKey } from "@/lib/domain/clinical-evaluation";
import type { CerRevisionEntry } from "@/lib/domain/clinical-evaluation";
import type { PrismaFlowCounts } from "@/lib/domain/clinical-literature-model";

export const CER_SECTION_REG_REFS: Record<ClinicalSectionKey, { tr: string; en: string }> = {
  plan: {
    tr: "MDR Annex XIV Part A · MDCG 2020-1 — CEP",
    en: "MDR Annex XIV Part A · MDCG 2020-1 — CEP",
  },
  stateOfTheArt: {
    tr: "MDR Annex XIV · MDCG 2020-6 (SOTA)",
    en: "MDR Annex XIV · MDCG 2020-6 (SOTA)",
  },
  equivalentDevices: {
    tr: "MDR Annex XIV · MEDDEV 2.7/1 — eşdeğer cihaz",
    en: "MDR Annex XIV · MEDDEV 2.7/1 — equivalent device",
  },
  literatureStrategy: {
    tr: "MDR Annex XIV Part A · MEDDEV 2.7/1 — literatür stratejisi",
    en: "MDR Annex XIV Part A · MEDDEV 2.7/1 — literature strategy",
  },
  clinicalDataSummary: {
    tr: "MDR Annex XIV Part A · ISO 14971 klinik veri özeti",
    en: "MDR Annex XIV Part A · ISO 14971 clinical data summary",
  },
  benefitRiskConclusion: {
    tr: "MDR Annex I GSPR · ISO 14971 fayda-risk",
    en: "MDR Annex I GSPR · ISO 14971 benefit-risk",
  },
  pmsPmcfInputs: {
    tr: "MDR Art. 83–86 · MDCG 2020-7 PMCF",
    en: "MDR Art. 83–86 · MDCG 2020-7 PMCF",
  },
  report: {
    tr: "MDR Annex XIV Part A — CER özeti",
    en: "MDR Annex XIV Part A — CER summary",
  },
};

const SECTION_LABELS: Record<ClinicalSectionKey, { tr: string; en: string }> = {
  plan: { tr: "Klinik Değerlendirme Planı", en: "Clinical Evaluation Plan" },
  stateOfTheArt: { tr: "Güncel Teknoloji", en: "State of the Art" },
  equivalentDevices: { tr: "Eşdeğer Cihazlar", en: "Equivalent Devices" },
  literatureStrategy: { tr: "Literatür Stratejisi", en: "Literature Strategy" },
  clinicalDataSummary: { tr: "Klinik Veri Özeti", en: "Clinical Data Summary" },
  benefitRiskConclusion: { tr: "Fayda-Risk", en: "Benefit-Risk" },
  pmsPmcfInputs: { tr: "PMS/PMCF Girdileri", en: "PMS/PMCF Inputs" },
  report: { tr: "Rapor Özeti", en: "Report Summary" },
};

/** Public registry search entry points for evidence traceability. */
export const REGISTRY_EVIDENCE_URLS: Record<string, string> = {
  "fda-maude": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfMAUDE/search.CFM",
  "fda-recalls": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfRES/res.cfm",
  "fda-510k": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfPMN/pmn.cfm",
  bfarm: "https://www.bfarm.de/DE/Medizinprodukte/Antraege-und-Meldungen/_node.html",
  mhra: "https://www.gov.uk/drug-device-alerts",
  eudamed: "https://ec.europa.eu/tools/eudamed/",
  ansm: "https://ansm.sante.fr/",
  aemps: "https://www.aemps.gob.es/",
  swissmedic: "https://www.swissmedic.ch/",
  "health-canada": "https://recalls-rappels.canada.ca/en",
  tga: "https://www.tga.gov.au/",
  pmda: "https://www.pmda.go.jp/english/",
  titck: "https://www.titck.gov.tr/",
  pubmed: "https://pubmed.ncbi.nlm.nih.gov/",
  embase: "https://www.embase.com/",
  cochrane: "https://www.cochranelibrary.com/",
};

export function registryEvidenceUrl(registryId: string): string {
  return REGISTRY_EVIDENCE_URLS[registryId] ?? "";
}

export function serializePrismaFlowDiagramMarkdown(
  prisma: PrismaFlowCounts,
  locale: "tr" | "en",
): string {
  const tr = locale === "tr";
  const p = prisma;
  return [
    tr ? "### PRISMA akış diyagramı" : "### PRISMA flow diagram",
    "",
    "```",
    tr
      ? [
          `  [Tanımlanan: ${p.identified}]`,
          "        │",
          `  [Yinelenen çıkarıldı: ${p.duplicatesRemoved}]`,
          "        ▼",
          `  [Başlık/özet tarandı: ${p.screened}]`,
          "        │",
          `  [Elendi (tarama): ${p.excludedScreen}]`,
          "        ▼",
          `  [Tam metin: ${p.fullTextAssessed}]`,
          "        │",
          `  [Elendi (tam metin): ${p.excludedFullText}]`,
          "        ▼",
          `  [Dahil edilen: ${p.included}]`,
        ].join("\n")
      : [
          `  [Identified: ${p.identified}]`,
          "        │",
          `  [Duplicates removed: ${p.duplicatesRemoved}]`,
          "        ▼",
          `  [Title/abstract screened: ${p.screened}]`,
          "        │",
          `  [Excluded at screening: ${p.excludedScreen}]`,
          "        ▼",
          `  [Full-text assessed: ${p.fullTextAssessed}]`,
          "        │",
          `  [Excluded at full-text: ${p.excludedFullText}]`,
          "        ▼",
          `  [Included: ${p.included}]`,
        ].join("\n"),
    "```",
  ].join("\n");
}

export function buildCerDraftBannerMarkdown(
  locale: "tr" | "en",
  productName: string,
  preparedAt?: string,
): string {
  const tr = locale === "tr";
  const date = preparedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  return tr
    ? `> **TASLAK — MDRpilot** · ${productName} · ${date} · Canlı veri tabanı sorguları ve yetkili kişi onayı gereklidir. Bu belge tek başına regülatif onay yerine geçmez.`
    : `> **DRAFT — MDRpilot** · ${productName} · ${date} · Live database queries and qualified person approval required. This document alone is not regulatory approval.`;
}

export function buildCerApprovalBlockMarkdown(
  locale: "tr" | "en",
  approval?: {
    status?: string;
    submittedBy?: string | null;
    approvedBy?: string | null;
    approvedAt?: string | null;
    revisionNo?: number;
    revisionHistory?: CerRevisionEntry[];
  },
): string {
  const tr = locale === "tr";
  const preparedBy = approval?.submittedBy?.trim() || "";
  const approvedBy = approval?.approvedBy?.trim() || "";
  const approvedDate = approval?.approvedAt?.slice(0, 10) || "";
  const isApproved = approval?.status === "APPROVED";

  const lines = [
    tr ? "## Doküman onayı" : "## Document approval",
    "",
    isApproved
      ? tr
        ? "_CER onay süreci tamamlanmıştır._"
        : "_CER approval workflow completed._"
      : tr
        ? "_Aşağıdaki tablo CER onay sürecinde doldurulur._"
        : "_Complete the table below during CER approval._",
    "",
    tr
      ? "| Rol | Ad Soyad | Tarih | İmza |"
      : "| Role | Name | Date | Signature |",
    "| --- | --- | --- | --- |",
    tr
      ? `| Hazırlayan | ${preparedBy || ""} | | |`
      : `| Prepared by | ${preparedBy || ""} | | |`,
    tr
      ? `| İnceleyen (RA/QA) | | | |`
      : `| Reviewed by (RA/QA) | | | |`,
    tr
      ? `| Onaylayan | ${approvedBy || ""} | ${approvedDate || ""} | |`
      : `| Approved by | ${approvedBy || ""} | ${approvedDate || ""} | |`,
    "",
    tr ? "### Revizyon geçmişi" : "### Revision history",
    "",
    tr
      ? "| Rev | Tarih | Değişiklik | Hazırlayan |"
      : "| Rev | Date | Change | Author |",
    "| --- | --- | --- | --- |",
  ];

  const history = approval?.revisionHistory?.length
    ? approval.revisionHistory
    : [{ rev: approval?.revisionNo || 1, date: "", by: "", note: tr ? "İlk MDRpilot CER taslağı" : "Initial MDRpilot CER draft" }];

  for (const entry of history) {
    const rev = String(entry.rev).padStart(2, "0");
    lines.push(`| ${rev} | ${entry.date || ""} | ${entry.note || ""} | ${entry.by || ""} |`);
  }

  return lines.join("\n");
}

export function buildLiveVerificationNoteMarkdown(
  locale: "tr" | "en",
  searchDate?: string,
): string {
  const tr = locale === "tr";
  const d = searchDate || new Date().toISOString().slice(0, 10);
  return tr
    ? `> **Canlı doğrulama:** MDRpilot ${d} tarihli taslak sayıları üretmiştir. Onay öncesi PubMed, FDA MAUDE, BfArM vb. canlı sorguları ile karşılaştırın; ekran görüntüsü veya sorgu çıktısını kanıt dosyasına ekleyin.`
    : `> **Live verification:** MDRpilot generated draft counts as of ${d}. Before approval, compare against live PubMed, FDA MAUDE, BfArM etc.; attach screenshots or query outputs to the evidence file.`;
}

export function buildConsultantCerComment(input: {
  locale: "tr" | "en";
  registryId?: string;
  sourceLabel: string;
  productName: string;
  riskThemes?: string;
  status?: "no_signal" | "review_required" | "records_found";
}): string {
  const { locale, registryId, sourceLabel, productName, riskThemes, status } = input;
  const tr = locale === "tr";
  const risks = riskThemes?.trim() || (tr ? "risk dosyası temaları" : "risk file themes");

  if (registryId && /^(pubmed|embase|cochrane|scopus|trdizin)/.test(registryId)) {
    return tr
      ? `${sourceLabel} taraması ${productName} güvenlik/performans iddialarını destekler; ${risks} ile tutarlıdır.`
      : `${sourceLabel} search supports ${productName} safety/performance claims; consistent with ${risks}.`;
  }

  if (status === "records_found") {
    return tr
      ? `${sourceLabel}: vigilans kaydı fayda-risk ve CAPA değerlendirmesine alınmalıdır.`
      : `${sourceLabel}: vigilance record must feed benefit-risk and CAPA assessment.`;
  }
  if (status === "review_required") {
    return tr
      ? `${sourceLabel}: manuel kayıt incelemesi ve risk dosyası güncellemesi önerilir.`
      : `${sourceLabel}: manual registry review and risk file update recommended.`;
  }

  return tr
    ? `${sourceLabel}: ${productName} için yeni güvenlik sinyali yok; ${risks} ile uyumlu.`
    : `${sourceLabel}: no new safety signal for ${productName}; aligned with ${risks}.`;
}

export function enrichCerExportMarkdown(
  sections: Partial<Record<ClinicalSectionKey, string | null | undefined>>,
  locale: "tr" | "en",
  productName: string,
  options: {
    preparedAt?: string;
    searchDate?: string;
    approval?: {
      status?: string;
      submittedBy?: string | null;
      approvedBy?: string | null;
      approvedAt?: string | null;
      revisionNo?: number;
      revisionHistory?: CerRevisionEntry[];
    };
  } = {},
): string {
  const tr = locale === "tr";
  const blocks: string[] = [
    tr
      ? `# Klinik Değerlendirme Raporu — ${productName}`
      : `# Clinical Evaluation Report — ${productName}`,
    "",
    buildCerDraftBannerMarkdown(locale, productName, options.preparedAt),
    "",
    buildLiveVerificationNoteMarkdown(locale, options.searchDate),
    "",
    buildCerApprovalBlockMarkdown(locale, options.approval),
    "",
  ];

  for (const key of Object.keys(SECTION_LABELS) as ClinicalSectionKey[]) {
    const body = sections[key]?.trim();
    if (!body) continue;
    const label = tr ? SECTION_LABELS[key].tr : SECTION_LABELS[key].en;
    const ref = tr ? CER_SECTION_REG_REFS[key].tr : CER_SECTION_REG_REFS[key].en;
    blocks.push(`## ${label}`, "", `_${ref}_`, "");
    if (body.startsWith("#")) {
      blocks.push(body, "");
    } else {
      blocks.push(body, "");
    }
  }

  return blocks.join("\n").trim();
}
