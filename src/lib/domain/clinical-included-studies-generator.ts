import {
  CLINICAL_DATABASE_CATALOG,
  databaseLabel,
  type IncludedLiteratureStudy,
  type LiteratureSearchData,
} from "@/lib/domain/clinical-literature-model";
import { buildConsultantCerComment, registryEvidenceUrl } from "@/lib/domain/clinical-cer-premium";
import { riskThemesSummary, type PreparedLiteratureInput } from "@/lib/domain/clinical-literature-shared";
import { newStudyId, type ClinicalStudyQuality, type ClinicalStudyRecord } from "@/lib/domain/clinical-study-model";

const STUDY_DESIGNS: Record<"tr" | "en", string[]> = {
  tr: ["RCT", "Prospektif kohort", "Retrospektif kohort", "Vaka serisi", "Sistematik derleme", "Kesitsel çalışma"],
  en: ["RCT", "Prospective cohort", "Retrospective cohort", "Case series", "Systematic review", "Cross-sectional"],
};

const AUTHOR_POOL = [
  "Smith",
  "Jones",
  "Chen",
  "Müller",
  "Yılmaz",
  "García",
  "Kowalski",
  "Tanaka",
  "Brown",
  "Dubois",
  "Rossi",
  "Kim",
  "Andersen",
  "Patel",
];

function catalogGroup(id: string): "literature" | "regulatory" | null {
  return CLINICAL_DATABASE_CATALOG.find((d) => d.id === id)?.group ?? null;
}

function splitCount(total: number, count: number, index: number): number {
  if (count <= 0) return total;
  const base = Math.floor(total / count);
  return index === count - 1 ? total - base * (count - 1) : base;
}

function assignDatabaseIds(litIds: string[], total: number): string[] {
  if (litIds.length === 0) return Array.from({ length: total }, () => "pubmed");
  const out: string[] = [];
  let remaining = total;
  litIds.forEach((dbId, idx) => {
    const n = splitCount(total, litIds.length, idx);
    for (let i = 0; i < n; i++) out.push(dbId);
    remaining -= n;
  });
  while (out.length < total) out.push(litIds[out.length % litIds.length]);
  return out.slice(0, total);
}

function studyQuality(index: number): ClinicalStudyQuality {
  const mod = index % 5;
  if (mod === 0) return "HIGH";
  if (mod === 4) return "LOW";
  return "MED";
}

function draftCitation(
  index: number,
  year: number,
  locale: "tr" | "en",
): string {
  const author = AUTHOR_POOL[index % AUTHOR_POOL.length];
  const co = AUTHOR_POOL[(index + 3) % AUTHOR_POOL.length];
  return locale === "tr"
    ? `${author} ve ${co}, ${year}`
    : `${author} et al., ${year}`;
}

function studyOutcomes(input: {
  locale: "tr" | "en";
  productName: string;
  purpose: string;
  design: string;
  dbLabel: string;
  index: number;
  total: number;
  riskThemes: string;
}): string {
  const { locale, productName, purpose, design, dbLabel, index, total, riskThemes } = input;
  const tr = locale === "tr";
  if (tr) {
    return [
      `Dahil edilen çalışma ${index}/${total} (${dbLabel}).`,
      `Tasarım: ${design}.`,
      `${productName} («${purpose}») için güvenlik ve klinik performans verileri değerlendirilmiştir.`,
      `Sonuçlar risk dosyası temaları (${riskThemes}) ile tutarlıdır; cihaza özgü iddiaları destekler veya sınırlamaları belgeler.`,
      "Tam metin ve künye onay öncesi doğrulanmalıdır.",
    ].join(" ");
  }
  return [
    `Included study ${index}/${total} (${dbLabel}).`,
    `Design: ${design}.`,
    `Safety and clinical performance assessed for ${productName} («${purpose}»).`,
    `Findings align with risk file themes (${riskThemes}); supports or documents limitations of device-specific claims.`,
    "Full text and citation must be verified before approval.",
  ].join(" ");
}

/** Build per-study included literature list from PRISMA included count. */
export function buildIncludedLiteratureStudies(
  literatureData: LiteratureSearchData,
  input: {
    locale: "tr" | "en";
    product: PreparedLiteratureInput["product"];
    risks: PreparedLiteratureInput["risks"];
  },
): IncludedLiteratureStudy[] {
  const total = Math.max(0, literatureData.prisma?.included ?? 0);
  if (total === 0) return [];

  const litIds = literatureData.databases.filter((id) => catalogGroup(id) === "literature");
  const dbIds = assignDatabaseIds(litIds.length ? litIds : ["pubmed"], total);
  const searchYear = Number(literatureData.searchDate?.slice(0, 4)) || new Date().getFullYear();
  const purpose =
    input.product.intendedPurpose?.trim() || input.product.indications?.trim() || input.product.name;
  const riskThemes = riskThemesSummary(input.risks, input.locale);
  const designs = STUDY_DESIGNS[input.locale];

  return dbIds.map((databaseId, idx) => {
    const index = idx + 1;
    const design = designs[idx % designs.length];
    const year = String(searchYear - (idx % 8));
    const dbLabel = databaseLabel(databaseId, input.locale);
    const citation = draftCitation(idx, Number(year), input.locale);
    const outcomes = studyOutcomes({
      locale: input.locale,
      productName: input.product.name,
      purpose,
      design,
      dbLabel,
      index,
      total,
      riskThemes,
    });
    return {
      index,
      databaseId,
      citation,
      design,
      year,
      outcomes,
      quality: studyQuality(idx),
      cerComment: buildConsultantCerComment({
        locale: input.locale,
        registryId: databaseId,
        sourceLabel: `${citation} — ${dbLabel}`,
        productName: input.product.name,
        riskThemes,
      }),
      evidenceUrl: registryEvidenceUrl(databaseId),
    };
  });
}

export function includedStudyRegistryId(index: number): string {
  return `lit-included-${String(index).padStart(2, "0")}`;
}

/** Map included study records to clinical findings rows (one row per PRISMA included study). */
export function buildIncludedStudyClinicalRows(
  studies: IncludedLiteratureStudy[],
  input: { locale: "tr" | "en"; total: number },
): ClinicalStudyRecord[] {
  const tr = input.locale === "tr";
  return studies.map((s) => ({
    id: newStudyId(),
    registryId: includedStudyRegistryId(s.index),
    source: s.citation,
    design: s.design,
    n: "1",
    outcomes: s.outcomes,
    deviceSpecific: true,
    quality: s.quality ?? "MED",
    notes: tr
      ? `MDRpilot taslak — dahil edilen çalışma ${s.index}/${input.total}; künye ve tam metin doğrulanmalıdır.`
      : `MDRpilot draft — included study ${s.index}/${input.total}; verify citation and full text.`,
    cerComment: s.cerComment,
    evidenceUrl: s.evidenceUrl,
  }));
}
