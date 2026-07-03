import {
  CLINICAL_SECTION_KEYS,
  type ClinicalEvaluationData,
  type ClinicalSectionKey,
} from "@/lib/domain/clinical-evaluation";

export type ClinicalReadinessTab = "sections" | "literature" | "studies" | "equivalents" | "pms" | "cep";

export interface ClinicalReadinessItem {
  id: string;
  labelTr: string;
  labelEn: string;
  done: boolean;
  tab: ClinicalReadinessTab;
  sectionKey?: ClinicalSectionKey;
}

function sectionFilled(evaluation: ClinicalEvaluationData | null, key: ClinicalSectionKey): boolean {
  const text = evaluation?.[key];
  return Boolean(text && text.trim().length >= 40);
}

export function computeClinicalReadiness(
  evaluation: ClinicalEvaluationData | null,
): { score: number; total: number; percent: number; items: ClinicalReadinessItem[] } {
  const lit = evaluation?.literatureData;
  const studies = evaluation?.clinicalStudies ?? [];

  const items: ClinicalReadinessItem[] = [
    {
      id: "literature-search",
      labelTr: "MDRpilot literatür taraması",
      labelEn: "MDRpilot literature search",
      done: Boolean(lit?.preparedByMedDoc && lit.searchQuery?.trim()),
      tab: "literature",
    },
    {
      id: "registry-results",
      labelTr: "Ulusal kayıt sonuçları",
      labelEn: "National registry results",
      done: (lit?.registryResults?.length ?? 0) > 0,
      tab: "literature",
    },
    {
      id: "equivalent-devices",
      labelTr: "Eşdeğer ürünler tablosu",
      labelEn: "Equivalent products table",
      done: (evaluation?.equivalentDevicesData?.devices?.length ?? 0) > 0,
      tab: "equivalents",
    },
    {
      id: "clinical-studies",
      labelTr: "Klinik veri / bulgular",
      labelEn: "Clinical data / findings",
      done: studies.length >= 3,
      tab: "studies",
    },
    ...CLINICAL_SECTION_KEYS.map((key) => ({
      id: `section-${key}`,
      labelTr: sectionLabelTr(key),
      labelEn: sectionLabelEn(key),
      done: sectionFilled(evaluation, key),
      tab: (key === "plan"
        ? "cep"
        : key === "literatureStrategy" || key === "clinicalDataSummary"
          ? "studies"
          : key === "equivalentDevices"
            ? "equivalents"
            : key === "pmsPmcfInputs"
              ? "pms"
              : "sections") as ClinicalReadinessTab,
      sectionKey: key,
    })),
  ];

  const total = items.length;
  const score = items.filter((i) => i.done).length;
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;

  return { score, total, percent, items };
}

function sectionLabelTr(key: ClinicalSectionKey): string {
  const m: Record<ClinicalSectionKey, string> = {
    plan: "CEP bölümü",
    stateOfTheArt: "SOTA",
    equivalentDevices: "Eşdeğer cihazlar",
    literatureStrategy: "Literatür stratejisi (CER)",
    clinicalDataSummary: "Klinik veri özeti",
    benefitRiskConclusion: "Fayda-risk",
    pmsPmcfInputs: "PMS/PMCF girdileri",
    report: "CER rapor özeti",
  };
  return m[key];
}

function sectionLabelEn(key: ClinicalSectionKey): string {
  const m: Record<ClinicalSectionKey, string> = {
    plan: "CEP section",
    stateOfTheArt: "SOTA",
    equivalentDevices: "Equivalent devices",
    literatureStrategy: "Literature strategy (CER)",
    clinicalDataSummary: "Clinical data summary",
    benefitRiskConclusion: "Benefit-risk",
    pmsPmcfInputs: "PMS/PMCF inputs",
    report: "CER report summary",
  };
  return m[key];
}
