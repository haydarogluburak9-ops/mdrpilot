import {
  CLINICAL_DATABASE_CATALOG,
  databaseLabel,
  registryStatusExportLabel,
  registryStatusShortLabel,
  serializeLiteratureDatabaseTableMarkdown,
  serializePrismaFlowMarkdown,
  type LiteratureSearchData,
  type RegistrySearchStatus,
} from "@/lib/domain/clinical-literature-model";
import { serializePrismaFlowDiagramMarkdown } from "@/lib/domain/clinical-cer-premium";
import { buildIncludedStudyClinicalRows } from "@/lib/domain/clinical-included-studies-generator";

export type ClinicalStudyQuality = "HIGH" | "MED" | "LOW";

export type ClinicalStudyCategory = "literature" | "regulatory" | "risk" | "other";

function catalogGroup(id: string): "literature" | "regulatory" | null {
  return CLINICAL_DATABASE_CATALOG.find((d) => d.id === id)?.group ?? null;
}

export function classifyClinicalStudy(row: ClinicalStudyRecord): ClinicalStudyCategory {
  if (row.registryId === "risk-alignment") return "risk";
  if (isIncludedLiteratureStudyRow(row)) return "literature";
  if (row.registryId === "literature-bundle") return "literature";
  if (row.registryId && catalogGroup(row.registryId) === "literature") return "literature";
  if (row.registryId && catalogGroup(row.registryId) === "regulatory") return "regulatory";
  const src = row.source.toLowerCase();
  if (/maude|bfarm|mhra|eudamed|titck|recall|vigilans|vigilance|fda|health canada|tga|pmda|ansm|aemps|swissmedic/.test(src)) {
    return "regulatory";
  }
  if (/pubmed|embase|cochrane|scopus|tr dizin|literatür|literature|medline/.test(src)) {
    return "literature";
  }
  if (/risk|14971|fmea/.test(src)) return "risk";
  return "other";
}

export interface ClinicalStudyRecord {
  id: string;
  /** Set for auto-generated rows (merge/replace). */
  registryId?: string;
  source: string;
  design: string;
  n: string;
  outcomes: string;
  deviceSpecific: boolean;
  quality: ClinicalStudyQuality;
  notes: string;
  cerComment?: string;
  evidenceUrl?: string;
}

export function isIncludedLiteratureStudyRow(row: ClinicalStudyRecord): boolean {
  return Boolean(row.registryId?.startsWith("lit-included-"));
}

export function newStudyId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `study-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyClinicalStudy(): ClinicalStudyRecord {
  return {
    id: newStudyId(),
    source: "",
    design: "",
    n: "",
    outcomes: "",
    deviceSpecific: false,
    quality: "MED",
    notes: "",
  };
}

function qualityLabel(q: ClinicalStudyQuality, locale: "tr" | "en"): string {
  if (locale === "tr") {
    if (q === "HIGH") return "Yüksek";
    if (q === "LOW") return "Düşük";
    return "Orta";
  }
  if (q === "HIGH") return "High";
  if (q === "LOW") return "Low";
  return "Medium";
}

export function parseClinicalStudiesJson(raw: unknown): ClinicalStudyRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: ClinicalStudyRecord[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const q = r.quality;
    const quality: ClinicalStudyQuality =
      q === "HIGH" || q === "LOW" || q === "MED" ? q : "MED";
    out.push({
      id: typeof r.id === "string" && r.id ? r.id : newStudyId(),
      registryId: typeof r.registryId === "string" ? r.registryId : undefined,
      source: typeof r.source === "string" ? r.source : "",
      design: typeof r.design === "string" ? r.design : "",
      n: typeof r.n === "string" ? r.n : String(r.n ?? ""),
      outcomes: typeof r.outcomes === "string" ? r.outcomes : "",
      deviceSpecific: r.deviceSpecific === true,
      quality,
      notes: typeof r.notes === "string" ? r.notes : "",
      cerComment: typeof r.cerComment === "string" ? r.cerComment : undefined,
      evidenceUrl: typeof r.evidenceUrl === "string" ? r.evidenceUrl : undefined,
    });
  }
  return out;
}

function cell(v: string): string {
  return v.replace(/\|/g, "/").replace(/\n/g, " ").trim() || "—";
}

function studyTableRow(s: ClinicalStudyRecord, locale: "tr" | "en"): string {
  const tr = locale === "tr";
  return `| ${cell(s.source)} | ${cell(s.design)} | ${cell(s.n)} | ${cell(s.outcomes)} | ${s.deviceSpecific ? (tr ? "Evet" : "Yes") : tr ? "Hayır" : "No"} | ${qualityLabel(s.quality, locale)} | ${cell(s.notes)} |`;
}

function includedStudyIndex(registryId?: string): number | null {
  const m = registryId?.match(/^lit-included-(\d+)$/);
  return m ? Number(m[1]) : null;
}

function includedLiteratureTableRow(
  s: ClinicalStudyRecord,
  locale: "tr" | "en",
  literatureData?: LiteratureSearchData | null,
): string {
  const tr = locale === "tr";
  const idx = includedStudyIndex(s.registryId);
  const meta = literatureData?.includedStudies?.find((x) => x.index === idx);
  const dbLabel = meta ? databaseLabel(meta.databaseId, locale) : "—";
  const year = meta?.year?.trim() || "—";
  const evidence = s.evidenceUrl?.trim() || meta?.evidenceUrl?.trim() || "—";
  const no = idx != null ? String(idx) : "—";
  return `| ${no} | ${cell(s.source)} | ${cell(dbLabel)} | ${cell(s.design)} | ${cell(year)} | ${cell(s.outcomes)} | ${cell(s.cerComment ?? meta?.cerComment ?? "")} | ${cell(evidence)} | ${s.deviceSpecific ? (tr ? "Evet" : "Yes") : tr ? "Hayır" : "No"} | ${qualityLabel(s.quality, locale)} | ${cell(s.notes)} |`;
}

function literatureTableRow(s: ClinicalStudyRecord, locale: "tr" | "en", query: string): string {
  const tr = locale === "tr";
  const evidence = s.evidenceUrl?.trim() || "—";
  return `| ${cell(s.source)} | \`${cell(query)}\` | ${cell(s.n)} | ${cell(s.outcomes)} | ${cell(s.cerComment ?? "")} | ${cell(evidence)} | ${s.deviceSpecific ? (tr ? "Evet" : "Yes") : tr ? "Hayır" : "No"} | ${qualityLabel(s.quality, locale)} | ${cell(s.notes)} |`;
}

const STATUS_FOOTNOTE: Record<RegistrySearchStatus, string> = {
  no_signal: "¹",
  review_required: "²",
  records_found: "³",
};

function regulatoryTableRow(
  s: ClinicalStudyRecord,
  locale: "tr" | "en",
  status: RegistrySearchStatus,
): string {
  const tr = locale === "tr";
  const shortStatus = `${registryStatusShortLabel(status, locale)}${STATUS_FOOTNOTE[status]}`;
  const evidence = s.evidenceUrl?.trim() || "—";
  return `| ${cell(s.source)} | ${cell(s.design)} | ${cell(s.n)} | ${shortStatus} | ${cell(s.outcomes)} | ${cell(s.cerComment ?? "")} | ${cell(evidence)} | ${s.deviceSpecific ? (tr ? "Evet" : "Yes") : tr ? "Hayır" : "No"} | ${qualityLabel(s.quality, locale)} | ${cell(s.notes)} |`;
}

function buildRegistryStatusFootnotes(locale: "tr" | "en"): string {
  const tr = locale === "tr";
  return [
    tr ? "### Durum açıklamaları (dipnot)" : "### Status definitions (footnotes)",
    "",
    `¹ ${registryStatusExportLabel("no_signal", locale)}`,
    `² ${registryStatusExportLabel("review_required", locale)}`,
    `³ ${registryStatusExportLabel("records_found", locale)}`,
  ].join("\n");
}

function registryStatusForStudy(
  study: ClinicalStudyRecord,
  literatureData?: LiteratureSearchData | null,
): RegistrySearchStatus {
  if (study.registryId) {
    const row = literatureData?.registryResults?.find((r) => r.registryId === study.registryId);
    if (row) return row.status;
  }
  return "no_signal";
}

function emptyTableRow(locale: "tr" | "en", colCount = 7): string {
  const label = locale === "tr" ? "_Henüz kayıt yok_" : "_No records yet_";
  return `| ${label} | ${Array.from({ length: colCount - 1 }, () => "").join(" | ")} |`;
}

export function buildClinicalDataScopeMarkdown(
  literatureData: LiteratureSearchData | null | undefined,
  locale: "tr" | "en",
): string {
  const tr = locale === "tr";
  if (!literatureData) {
    return tr
      ? "_Literatür taraması henüz yapılmadı. MDRpilot ile Literatür sekmesinden tarama çalıştırın._"
      : "_Literature search not run yet. Run MDRpilot search from the Literature tab._";
  }

  const lines = [
    tr ? "### Amaç ve değerlendirme kapsamı" : "### Purpose and scope of evaluation",
    "",
    tr
      ? "Aşağıdaki tablolar, cihazın güvenlik ve klinik performans iddialarını desteklemek için yapılan sistematik literatür taraması ile ulusal vigilans kayıt taramalarının özetidir. Veriler fayda-risk değerlendirmesi ve CER güncellemesi için kullanılır."
      : "The tables below summarise the systematic literature search and national vigilance registry screening supporting device safety and clinical performance claims. Data feed benefit-risk assessment and CER updates.",
    "",
    tr ? "**PICO**" : "**PICO**",
    tr
      ? `- **Popülasyon:** ${literatureData.population.trim() || "—"}`
      : `- **Population:** ${literatureData.population.trim() || "—"}`,
    tr
      ? `- **Müdahale / cihaz:** ${literatureData.intervention.trim() || "—"}`
      : `- **Intervention / device:** ${literatureData.intervention.trim() || "—"}`,
    tr
      ? `- **Karşılaştırma:** ${literatureData.comparator.trim() || "—"}`
      : `- **Comparator:** ${literatureData.comparator.trim() || "—"}`,
    tr
      ? `- **Sonuçlar:** ${literatureData.outcomes.trim() || "—"}`
      : `- **Outcomes:** ${literatureData.outcomes.trim() || "—"}`,
    "",
    tr
      ? `- **Tarama tarihi:** ${literatureData.searchDate || "—"}`
      : `- **Search date:** ${literatureData.searchDate || "—"}`,
    tr
      ? `- **Arama sorgusu:** \`${literatureData.searchQuery.trim() || "—"}\``
      : `- **Search query:** \`${literatureData.searchQuery.trim() || "—"}\``,
    "",
    tr ? "### Dahil etme kriterleri" : "### Inclusion criteria",
    literatureData.inclusionCriteria.trim() || (tr ? "_Tanımlanacak_" : "_To be defined_"),
    "",
    tr ? "### Hariç tutma kriterleri" : "### Exclusion criteria",
    literatureData.exclusionCriteria.trim() || (tr ? "_Tanımlanacak_" : "_To be defined_"),
    "",
    serializePrismaFlowMarkdown(literatureData.prisma, locale),
    "",
    serializePrismaFlowDiagramMarkdown(literatureData.prisma, locale),
    "",
    tr
      ? "_Tablolarda **n**: bilimsel literatürde her satır = PRISMA'ya göre dahil edilen tek çalışma (n=1); ulusal kayıtlarda taranan kayıt sayısı; risk dosyasında risk satırı sayısı._"
      : "_In tables, **n**: each scientific literature row = one PRISMA-included study (n=1); national registries = records screened; risk file = risk row count._",
    "",
    tr
      ? "_Ulusal kayıt **durum** sütunu: kısa özet + dipnot numarası; tam açıklama tablo altındaki dipnotta. Yeşil = sinyal yok; sarı = inceleme; kırmızı = kayıt bulundu._"
      : "_National registry **status** column: short label + footnote; full text below the table. Green = no signal; yellow = review; red = record found._",
  ];

  return lines.join("\n");
}

function ensureIncludedLiteratureStudies(
  studies: ClinicalStudyRecord[],
  literatureData: LiteratureSearchData | null | undefined,
  locale: "tr" | "en",
): ClinicalStudyRecord[] {
  const meta = literatureData?.includedStudies?.filter((s) => s.index > 0) ?? [];
  if (meta.length === 0 || studies.some(isIncludedLiteratureStudyRow)) return studies;

  const synthetic = buildIncludedStudyClinicalRows(meta, {
    locale,
    total: literatureData?.prisma?.included ?? meta.length,
  });

  const withoutLegacyLiterature = studies.filter((s) => {
    if (isIncludedLiteratureStudyRow(s)) return false;
    if (s.registryId === "literature-bundle") return false;
    if (s.registryId && catalogGroup(s.registryId) === "literature") return false;
    return true;
  });

  return [...synthetic, ...withoutLegacyLiterature];
}

export function serializeClinicalDataSummaryMarkdown(
  studies: ClinicalStudyRecord[],
  locale: "tr" | "en",
  options: {
    riskTableMarkdown?: string;
    literatureData?: LiteratureSearchData | null;
  } = {},
): string {
  const tr = locale === "tr";
  const { riskTableMarkdown, literatureData } = options;

  const resolvedStudies = ensureIncludedLiteratureStudies(studies, literatureData, locale);

  const literature = resolvedStudies.filter((s) => classifyClinicalStudy(s) === "literature");
  const includedLiterature = literature.filter((s) => isIncludedLiteratureStudyRow(s));
  const legacyLiterature = literature.filter((s) => !isIncludedLiteratureStudyRow(s));
  const regulatory = resolvedStudies.filter((s) => classifyClinicalStudy(s) === "regulatory");
  const riskStudies = resolvedStudies.filter((s) => classifyClinicalStudy(s) === "risk");
  const other = resolvedStudies.filter((s) => classifyClinicalStudy(s) === "other");

  const regulatoryForExport =
    regulatory.length > 0
      ? regulatory
      : (literatureData?.registryResults ?? []).map((r) => ({
          id: r.registryId,
          registryId: r.registryId,
          source: databaseLabel(r.registryId, locale),
          design: tr ? "Ulusal kayıt / vigilans taraması" : "National registry / vigilance search",
          n: r.recordsScreened != null ? String(r.recordsScreened) : "—",
          outcomes: r.summary,
          deviceSpecific: true,
          quality: "MED" as const,
          notes: "",
          cerComment: r.cerComment,
          evidenceUrl: r.evidenceUrl,
        }));

  const perDbLiterature =
    includedLiterature.length === 0 &&
    (legacyLiterature.length > 1 ||
      legacyLiterature.some((s) => s.registryId && s.registryId !== "literature-bundle"));
  const literatureTableMarkdown =
    literatureData && !perDbLiterature && includedLiterature.length === 0
      ? serializeLiteratureDatabaseTableMarkdown(literatureData, locale)
      : "";

  const includedLitHeaders = tr
    ? ["#", "Künye", "Veri tabanı", "Tasarım", "Yıl", "Güvenlik/performans değerlendirmesi", "CER yorumu", "Kanıt (URL)", "Cihaza özgü", "Kalite", "Not"]
    : ["#", "Citation", "Database", "Design", "Year", "Safety/performance appraisal", "CER comment", "Evidence (URL)", "Device-specific", "Quality", "Notes"];

  const litHeaders = tr
    ? ["Veri tabanı", "Arama sorgusu", "Dahil edilen (n)", "Sonuçlar", "CER yorumu", "Kanıt (URL)", "Cihaza özgü", "Kalite", "Not"]
    : ["Database", "Search query", "Included (n)", "Outcomes", "CER comment", "Evidence (URL)", "Device-specific", "Quality", "Notes"];

  const regHeaders = tr
    ? ["Ulusal kayıt", "Tasarım", "Taranan kayıt (n)", "Durum", "Sonuçlar", "CER yorumu", "Kanıt (URL)", "Cihaza özgü", "Kalite", "Not"]
    : ["National registry", "Design", "Records screened (n)", "Status", "Outcomes", "CER comment", "Evidence (URL)", "Device-specific", "Quality", "Notes"];

  const otherHeaders = tr
    ? ["Kaynak", "Tasarım", "n", "Sonuçlar", "Cihaza özgü", "Kalite", "Not"]
    : ["Source", "Design", "n", "Outcomes", "Device-specific", "Quality", "Notes"];

  const lines = [
    tr ? "## Klinik veri özeti" : "## Clinical data summary",
    "",
    buildClinicalDataScopeMarkdown(literatureData, locale),
    "",
    literatureTableMarkdown
      ? literatureTableMarkdown
      : includedLiterature.length > 0
        ? [
            tr
              ? `### Dahil edilen çalışmalar — tek tek değerlendirme (n=${includedLiterature.length})`
              : `### Included studies — individual appraisal (n=${includedLiterature.length})`,
            "",
            tr
              ? "_PRISMA'ya göre dahil edilen her çalışma ayrı satırda değerlendirilir; künye ve tam metin onay öncesi doğrulanmalıdır._"
              : "_Each PRISMA-included study is appraised in a separate row; verify citation and full text before approval._",
            "",
            `| ${includedLitHeaders.join(" | ")} |`,
            `| ${includedLitHeaders.map(() => "---").join(" | ")} |`,
            includedLiterature
              .sort((a, b) => (includedStudyIndex(a.registryId) ?? 0) - (includedStudyIndex(b.registryId) ?? 0))
              .map((s) => includedLiteratureTableRow(s, locale, literatureData))
              .join("\n"),
          ].join("\n")
        : [
            tr ? "### Bilimsel literatür taraması" : "### Scientific literature search",
            "",
            `| ${litHeaders.join(" | ")} |`,
            `| ${litHeaders.map(() => "---").join(" | ")} |`,
            legacyLiterature.length === 0
              ? emptyTableRow(locale, 9)
              : (() => {
                  const litQuery = literatureData?.searchQuery?.trim() || "—";
                  return legacyLiterature.map((s) => literatureTableRow(s, locale, litQuery)).join("\n");
                })(),
          ].join("\n"),
  ];

  lines.push(
    "",
    tr ? "### Ulusal kayıtlar ve vigilans" : "### National registries and vigilance",
    "",
    `| ${regHeaders.join(" | ")} |`,
    `| ${regHeaders.map(() => "---").join(" | ")} |`,
  );

  if (regulatoryForExport.length === 0) {
    lines.push(emptyTableRow(locale, 10));
  } else {
    for (const s of regulatoryForExport) {
      lines.push(regulatoryTableRow(s, locale, registryStatusForStudy(s, literatureData)));
    }
    lines.push("", buildRegistryStatusFootnotes(locale));
  }

  if (other.length > 0) {
    lines.push(
      "",
      tr ? "### Diğer klinik veriler" : "### Other clinical data",
      "",
      `| ${otherHeaders.join(" | ")} |`,
      `| ${otherHeaders.map(() => "---").join(" | ")} |`,
    );
    for (const s of other) lines.push(studyTableRow(s, locale));
  }

  if (riskStudies.length > 0) {
    lines.push("", tr ? "### Risk dosyası — klinik değerlendirme bağlantısı" : "### Risk file — clinical evaluation linkage", "");
    for (const s of riskStudies) {
      lines.push(
        tr
          ? `- **${cell(s.source)}** (${cell(s.n)} risk satırı): ${cell(s.outcomes)}`
          : `- **${cell(s.source)}** (${cell(s.n)} risk rows): ${cell(s.outcomes)}`,
      );
    }
  }

  if (riskTableMarkdown?.trim()) {
    lines.push("", tr ? "### Risk dosyası özeti (FMEA)" : "### Risk file summary (FMEA)", "", riskTableMarkdown.trim());
  }

  return lines.join("\n");
}
