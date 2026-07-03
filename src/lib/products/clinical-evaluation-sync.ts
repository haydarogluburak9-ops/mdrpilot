import "server-only";
import { prisma } from "@/lib/db";
import {
  buildSearchQueryFromPico,
  parseLiteratureSearchJson,
  serializeLiteratureStrategyMarkdown,
  type LiteratureSearchData,
} from "@/lib/domain/clinical-literature-model";
import {
  parseClinicalStudiesJson,
  serializeClinicalDataSummaryMarkdown,
  type ClinicalStudyRecord,
} from "@/lib/domain/clinical-study-model";
import { CLINICAL_SECTION_KEYS } from "@/lib/domain/clinical-evaluation";
import { displayRiskNo } from "@/lib/domain/risk-category-codes";
import { riskScore } from "@/lib/domain/risk-template";

function riskTableMarkdown(
  items: Array<{
    id: string;
    riskNo?: string | null;
    tableERef?: string | null;
    riskSource?: string | null;
    hazardousSituation?: string | null;
    harm?: string | null;
    initialSeverity: number;
    initialProbability: number;
    residualSeverity?: number | null;
    residualProbability?: number | null;
  }>,
  locale: "tr" | "en",
): string {
  const tr = locale === "tr";
  const codingCtx = items.map((r) => ({
    id: r.id,
    riskNo: r.riskNo,
    tableERef: r.tableERef,
    riskSource: r.riskSource,
  }));
  const headers = tr
    ? ["Risk kodu", "Tehlikeli durum", "Zarar", "Başlangıç", "Artık"]
    : ["Risk code", "Hazardous situation", "Harm", "Initial", "Residual"];
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
  ];
  for (const r of items) {
    const no = displayRiskNo(r, codingCtx);
    const init = riskScore(r.initialSeverity, r.initialProbability);
    const res =
      r.residualSeverity != null && r.residualProbability != null
        ? riskScore(r.residualSeverity, r.residualProbability)
        : init;
    const cell = (v: string) => v.replace(/\|/g, "/").replace(/\n/g, " ").trim() || "—";
    lines.push(
      `| ${no} | ${cell(r.hazardousSituation ?? "")} | ${cell(r.harm ?? "")} | ${init} | ${res} |`,
    );
  }
  return lines.join("\n");
}

export function applyLiteratureToStrategy(
  data: LiteratureSearchData,
  locale: "tr" | "en",
): string {
  const withQuery = {
    ...data,
    searchQuery: data.searchQuery.trim() || buildSearchQueryFromPico(data),
  };
  return serializeLiteratureStrategyMarkdown(withQuery, locale);
}

export function applyStudiesToDataSummary(
  studies: ClinicalStudyRecord[],
  locale: "tr" | "en",
  riskItems: Parameters<typeof riskTableMarkdown>[0],
  literatureData?: LiteratureSearchData | null,
): string {
  const riskMd =
    riskItems.length > 0 ? riskTableMarkdown(riskItems, locale) : undefined;
  return serializeClinicalDataSummaryMarkdown(studies, locale, {
    riskTableMarkdown: riskMd,
    literatureData,
  });
}

export async function buildPmcfInputsMarkdown(
  productId: string,
  locale: "tr" | "en",
): Promise<string> {
  const tr = locale === "tr";
  const [pmcfSection, pmsSection, pmcfReportSection] = await Promise.all([
    prisma.technicalFileSection.findFirst({ where: { productId, key: "pmcf-plan" } }),
    prisma.technicalFileSection.findFirst({ where: { productId, key: "pms-plan" } }),
    prisma.technicalFileSection.findFirst({ where: { productId, key: "pmcf-report" } }),
  ]);

  const lines: string[] = [
    tr ? "## PMS ve PMCF girdileri" : "## PMS and PMCF inputs",
    "",
    tr ? "### PMS planı özeti" : "### PMS plan summary",
  ];

  if (pmsSection?.content?.trim()) {
    lines.push(pmsSection.content.trim().slice(0, 1200));
  } else {
    lines.push(tr ? "_PMS planı henüz tanımlanmadı._" : "_PMS plan not defined yet._");
  }

  lines.push("", tr ? "### PMCF planı özeti" : "### PMCF plan summary");

  if (pmcfSection?.content?.trim()) {
    lines.push(pmcfSection.content.trim().slice(0, 1200));
  } else {
    lines.push(tr ? "_PMCF planı henüz tanımlanmadı._" : "_PMCF plan not defined yet._");
  }

  lines.push("", tr ? "### PMCF değerlendirme raporu özeti" : "### PMCF evaluation report summary");
  if (pmcfReportSection?.content?.trim()) {
    lines.push(pmcfReportSection.content.trim().slice(0, 1200));
  } else {
    lines.push(tr ? "_PMCF değerlendirme raporu henüz oluşturulmadı._" : "_PMCF evaluation report not created yet._");
  }

  lines.push(
    "",
    tr
      ? "### CER güncelleme bağlantısı"
      : "### CER update linkage",
    tr
      ? "PMS/PMCF çıktıları (şikâyet trendleri, literatür sinyalleri, PMCF sonuçları) klinik değerlendirme raporunun periyodik güncellemesinde değerlendirilir."
      : "PMS/PMCF outputs (complaint trends, literature signals, PMCF results) feed periodic clinical evaluation report updates.",
  );

  return lines.join("\n");
}

export function buildCerExportMarkdown(
  sections: Partial<Record<(typeof CLINICAL_SECTION_KEYS)[number], string | null | undefined>>,
  locale: "tr" | "en",
  productName: string,
): string {
  const tr = locale === "tr";
  const order = CLINICAL_SECTION_KEYS;
  const title = tr
    ? `# Klinik Değerlendirme Raporu — ${productName}`
    : `# Clinical Evaluation Report — ${productName}`;

  const blocks = [title, ""];
  const labels: Record<string, { tr: string; en: string }> = {
    plan: { tr: "Klinik Değerlendirme Planı", en: "Clinical Evaluation Plan" },
    stateOfTheArt: { tr: "Güncel Teknoloji", en: "State of the Art" },
    equivalentDevices: { tr: "Eşdeğer Cihazlar", en: "Equivalent Devices" },
    literatureStrategy: { tr: "Literatür Stratejisi", en: "Literature Strategy" },
    clinicalDataSummary: { tr: "Klinik Veri Özeti", en: "Clinical Data Summary" },
    benefitRiskConclusion: { tr: "Fayda-Risk", en: "Benefit-Risk" },
    pmsPmcfInputs: { tr: "PMS/PMCF Girdileri", en: "PMS/PMCF Inputs" },
    report: { tr: "Rapor Özeti", en: "Report Summary" },
  };

  for (const key of order) {
    const body = sections[key]?.trim();
    if (!body) continue;
    const label = tr ? labels[key]?.tr : labels[key]?.en;
    if (label && !body.startsWith("#")) {
      blocks.push(`## ${label}`, "", body, "");
    } else {
      blocks.push(body, "");
    }
  }

  return blocks.join("\n").trim();
}

export { parseLiteratureSearchJson, parseClinicalStudiesJson };
