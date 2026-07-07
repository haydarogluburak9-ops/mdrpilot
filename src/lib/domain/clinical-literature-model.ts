export interface PrismaFlowCounts {
  identified: number;
  duplicatesRemoved: number;
  screened: number;
  excludedScreen: number;
  fullTextAssessed: number;
  excludedFullText: number;
  included: number;
}

export type ClinicalDatabaseGroup = "literature" | "regulatory";

export interface ClinicalDatabaseOption {
  id: string;
  labelEn: string;
  labelTr: string;
  group: ClinicalDatabaseGroup;
  region: string;
}

/** Scientific + national regulatory / vigilance sources for CER literature strategy. */
export const CLINICAL_DATABASE_CATALOG: ClinicalDatabaseOption[] = [
  { id: "pubmed", labelEn: "PubMed/MEDLINE", labelTr: "PubMed/MEDLINE", group: "literature", region: "INT" },
  { id: "embase", labelEn: "Embase", labelTr: "Embase", group: "literature", region: "INT" },
  { id: "cochrane", labelEn: "Cochrane Library", labelTr: "Cochrane Library", group: "literature", region: "INT" },
  { id: "scopus", labelEn: "Scopus", labelTr: "Scopus", group: "literature", region: "INT" },
  { id: "sciencedirect", labelEn: "ScienceDirect", labelTr: "ScienceDirect", group: "literature", region: "INT" },
  { id: "trdizin", labelEn: "TR Dizin / ULAKBİM", labelTr: "TR Dizin / ULAKBİM", group: "literature", region: "TR" },
  { id: "fda-maude", labelEn: "FDA MAUDE (adverse events)", labelTr: "FDA MAUDE (advers olaylar)", group: "regulatory", region: "US" },
  { id: "fda-recalls", labelEn: "FDA Medical Device Recalls", labelTr: "FDA Tıbbi Cihaz Geri Çağırmaları", group: "regulatory", region: "US" },
  { id: "fda-510k", labelEn: "FDA 510(k) / De Novo / PMA database", labelTr: "FDA 510(k) / De Novo / PMA veritabanı", group: "regulatory", region: "US" },
  { id: "bfarm", labelEn: "BfArM (Germany)", labelTr: "BfArM (Almanya)", group: "regulatory", region: "DE" },
  { id: "mhra", labelEn: "MHRA (UK)", labelTr: "MHRA (Birleşik Krallık)", group: "regulatory", region: "UK" },
  { id: "eudamed", labelEn: "EUDAMED (incidents / FSCA)", labelTr: "EUDAMED (olaylar / FSCA)", group: "regulatory", region: "EU" },
  { id: "ansm", labelEn: "ANSM (France)", labelTr: "ANSM (Fransa)", group: "regulatory", region: "FR" },
  { id: "aemps", labelEn: "AEMPS (Spain)", labelTr: "AEMPS (İspanya)", group: "regulatory", region: "ES" },
  { id: "swissmedic", labelEn: "Swissmedic (Switzerland)", labelTr: "Swissmedic (İsviçre)", group: "regulatory", region: "CH" },
  { id: "health-canada", labelEn: "Health Canada (MDALL / recalls)", labelTr: "Health Canada (MDALL / geri çağırma)", group: "regulatory", region: "CA" },
  { id: "tga", labelEn: "TGA DAEN (Australia)", labelTr: "TGA DAEN (Avustralya)", group: "regulatory", region: "AU" },
  { id: "pmda", labelEn: "PMDA (Japan)", labelTr: "PMDA (Japonya)", group: "regulatory", region: "JP" },
  { id: "titck", labelEn: "TİTCK / Türkiye şikâyet & geri çağırma", labelTr: "TİTCK / Türkiye şikâyet & geri çağırma", group: "regulatory", region: "TR" },
];

const CATALOG_BY_ID = new Map(CLINICAL_DATABASE_CATALOG.map((d) => [d.id, d]));

export const DEFAULT_LITERATURE_DATABASE_IDS = ["pubmed", "embase", "cochrane"] as const;

export const DEFAULT_REGULATORY_DATABASE_IDS = [
  "fda-maude",
  "fda-recalls",
  "bfarm",
  "mhra",
  "eudamed",
  "health-canada",
  "titck",
] as const;

export function databaseLabel(idOrLegacy: string, locale: "tr" | "en"): string {
  const opt = CATALOG_BY_ID.get(idOrLegacy);
  if (opt) return locale === "tr" ? opt.labelTr : opt.labelEn;
  return idOrLegacy;
}

export function normalizeDatabaseId(idOrLegacy: string): string {
  if (CATALOG_BY_ID.has(idOrLegacy)) return idOrLegacy;
  const lower = idOrLegacy.toLowerCase();
  for (const opt of CLINICAL_DATABASE_CATALOG) {
    if (opt.labelEn.toLowerCase() === lower || opt.labelTr.toLowerCase() === lower) return opt.id;
  }
  if (/pubmed|medline/i.test(idOrLegacy)) return "pubmed";
  if (/embase/i.test(idOrLegacy)) return "embase";
  if (/cochrane/i.test(idOrLegacy)) return "cochrane";
  return idOrLegacy;
}

export function defaultInclusionCriteria(locale: "tr" | "en"): string {
  if (locale === "tr") {
    return [
      "- Yalnızca tam metinler değerlendirilir.",
      "- Yalnızca insan çalışmaları dikkate alınır.",
      "- Yazı dili İngilizce olmalıdır.",
      "- Son 5 yılda yayınlanan çalışmalar (2020 ve sonrası).",
      "- Çalışma türleri: klinik çalışma, klinik deneme, karşılaştırmalı çalışma, meta-analiz, çok merkezli çalışma, randomize kontrollü çalışma (RCT), derleme ve sistematik derlemeler.",
      "- Öncül cihaz ve eşdeğerlerinin komplikasyonları ve advers olayları.",
      "- Eşdeğer cihaz ve diğer potansiyel eşdeğer cihazlar hakkında hastalarda yapılan klinik çalışmalar.",
      "- Laboratuvar ortamında yapılan biyomekanik veya in-vitro çalışmalar.",
      "- Klinik değerlendirme için önemli içerik: amaçlanan kullanıma ilişkin klinik veriler; aynı endikasyonlarda cihaz teknolojisinin terapötik veya diğer etkilerini (olumlu/olumsuz) değerlendiren yayınlar; belirli ürün iddialarına odaklanan yayınlar.",
    ].join("\n");
  }
  return [
    "- Only full texts are assessed.",
    "- Only human studies are considered.",
    "- Language: English.",
    "- Studies published within the last 5 years (from 2020 onward).",
    "- Study types: clinical studies, clinical trials, comparative studies, meta-analyses, multicentre studies, randomized controlled trials (RCTs), narrative reviews, and systematic reviews.",
    "- Complications and adverse events of the predicate device and its equivalents.",
    "- Clinical studies in patients on the equivalent device and other potential equivalent devices.",
    "- Biomechanical or in-vitro studies conducted in a laboratory setting.",
    "- Content important for clinical evaluation: publications on clinical data related to intended use; same-indication publications evaluating therapeutic or other effects of the device technology (positive and negative); publications addressing specific product claims.",
  ].join("\n");
}

export function defaultExclusionCriteria(locale: "tr" | "en"): string {
  if (locale === "tr") {
    return [
      "- İngilizce dışındaki dillerde yayınlanan yayınlar.",
      "- 2020'den eski literatür.",
      "- Yalnızca atıf yapılan literatür (kaynak tam metin değil).",
      "- Yalnızca özetlenmiş literatür (yalnızca özetler).",
      "- Farklı arama motorlarında tekrarlanan (yinelenen) literatür.",
      "- Eşdeğer cihazlara ait olmayan çalışmalar.",
      "- Başka tıbbi cihaz türleri ve tedavi yöntemleriyle yapılan tedavi çalışmaları.",
      "- Başka ilaç veya cihazların değerlendirilmesine yönelik çalışmalar.",
      "- Diğer, ilgisiz tıbbi semptomların tedavisi.",
      "- Vaka raporları (anekdot kabul edildiği için) ve özeti olmayan makaleler.",
      "- Hayvan deneyleriyle ilgili klinik öncesi ve deneysel veriler.",
      "- Yayınlanmamış klinik veriler.",
    ].join("\n");
  }
  return [
    "- Publications in languages other than English.",
    "- Literature published before 2020.",
    "- Cited literature only (not the full source text).",
    "- Summarized literature only (abstracts without full text).",
    "- Duplicate literature across different search engines.",
    "- Studies not pertaining to equivalent devices.",
    "- Treatment studies involving other types of medical devices or treatment methods.",
    "- Studies evaluating other drugs or devices.",
    "- Treatment of other, irrelevant medical symptoms.",
    "- Case reports (considered anecdotal) and articles without abstracts.",
    "- Preclinical and experimental data from animal studies.",
    "- Unpublished clinical data.",
  ].join("\n");
}

export interface LiteratureSearchData {
  population: string;
  intervention: string;
  comparator: string;
  outcomes: string;
  databases: string[];
  searchQuery: string;
  searchDate: string;
  inclusionCriteria: string;
  exclusionCriteria: string;
  prisma: PrismaFlowCounts;
  notes: string;
  /** MDRpilot-generated scientific literature narrative. */
  literatureSummary?: string;
  /** Per-registry vigilance search outcomes presented in the literature tab. */
  registryResults?: RegistrySearchResult[];
  preparedByMedDoc?: boolean;
  preparedAt?: string;
  /** One entry per PRISMA-included study for individual CER appraisal. */
  includedStudies?: IncludedLiteratureStudy[];
  /** Live PubMed search metadata */
  liveLiteratureSearch?: boolean;
  liveSearchAt?: string;
  pubmedQueryUrl?: string;
  pubmedTotal?: number;
  evidenceScreenshots?: Array<{
    id: string;
    storageKey: string;
    fileName: string;
    mimeType: string;
    uploadedAt: string;
    caption?: string;
  }>;
  /** Full-text PDFs of PRISMA-included articles (EK-4). */
  acceptedArticles?: Array<{
    id: string;
    storageKey: string;
    fileName: string;
    mimeType: string;
    uploadedAt: string;
    citation?: string;
    studyIndex?: number;
    pmid?: string;
  }>;
}

export interface IncludedLiteratureStudy {
  index: number;
  databaseId: string;
  citation: string;
  design: string;
  year: string;
  outcomes: string;
  quality?: "HIGH" | "MED" | "LOW";
  cerComment?: string;
  evidenceUrl?: string;
  pmid?: string;
}

export type RegistrySearchStatus = "no_signal" | "review_required" | "records_found";

export interface RegistrySearchResult {
  registryId: string;
  query: string;
  status: RegistrySearchStatus;
  summary: string;
  recordsScreened?: number;
  cerComment?: string;
  evidenceUrl?: string;
  liveVerified?: boolean;
  liveQueryUrl?: string;
  liveRecordCount?: number;
  sampleHits?: string[];
  evidenceScreenshots?: Array<{
    id: string;
    storageKey: string;
    fileName: string;
    mimeType: string;
    uploadedAt: string;
    caption?: string;
  }>;
}

/** Short status for table cells (Word/UI); full text in footnotes via registryStatusExportLabel. */
export function registryStatusShortLabel(
  status: RegistrySearchStatus,
  locale: "tr" | "en",
): string {
  const tr = locale === "tr";
  switch (status) {
    case "records_found":
      return tr ? "Kayıt bulundu" : "Records found";
    case "review_required":
      return tr ? "İnceleme gerekli" : "Review required";
    default:
      return tr ? "Sinyal tespit edilmedi" : "No signal detected";
  }
}

/** Full status text for Word export and tables (not the short "Sinyal yok" label). */
export function registryStatusExportLabel(
  status: RegistrySearchStatus,
  locale: "tr" | "en",
): string {
  const tr = locale === "tr";
  switch (status) {
    case "records_found":
      return tr
        ? "Kayıt bulundu: advers olay, geri çağırma veya ciddi şikâyet ile ilişkili vigilans kaydı tespit edildi; risk dosyası ve fayda-risk ile değerlendirilmelidir."
        : "Records found: vigilance record linked to adverse event, recall or serious complaint; assess in risk file and benefit-risk.";
    case "review_required":
      return tr
        ? "İnceleme gerekli: kayıt sonuçları manuel doğrulanmalı ve risk dosyası ile değerlendirilmelidir."
        : "Review required: registry results must be verified manually and assessed against the risk file.";
    default:
      return tr
        ? "Advers olay, geri çağırma, ciddi şikâyet vb. için cihaza özgü yeni veya beklenmeyen güvenlik sinyali tespit edilmedi."
        : "No new or unexpected device-specific safety signal for adverse events, recalls, serious complaints, etc.";
  }
}

export function detectRegistryStatusFromText(text: string): RegistrySearchStatus | null {
  const t = text.toLowerCase();
  if (/kayıt bulundu|records found|vigilans kaydı bulundu/.test(t)) return "records_found";
  if (/inceleme gerekli|review required/.test(t)) return "review_required";
  if (/tespit edilmedi|no signal|güvenlik sinyali/.test(t)) return "no_signal";
  return null;
}

export function defaultPicoOutcomes(locale: "tr" | "en"): string {
  return locale === "tr"
    ? "Güvenlik (advers olay, komplikasyon, enfeksiyon); klinik performans; kullanılabilirlik"
    : "Safety (adverse events, complications, infection); clinical performance; usability";
}

export function emptyLiteratureSearchData(productName = "", locale: "tr" | "en" = "tr"): LiteratureSearchData {
  return {
    population: "",
    intervention: productName,
    comparator: "",
    outcomes: defaultPicoOutcomes(locale),
    databases: [
      ...DEFAULT_LITERATURE_DATABASE_IDS,
      ...DEFAULT_REGULATORY_DATABASE_IDS,
    ],
    searchQuery: "",
    searchDate: new Date().toISOString().slice(0, 10),
    inclusionCriteria: defaultInclusionCriteria(locale),
    exclusionCriteria: defaultExclusionCriteria(locale),
    prisma: {
      identified: 0,
      duplicatesRemoved: 0,
      screened: 0,
      excludedScreen: 0,
      fullTextAssessed: 0,
      excludedFullText: 0,
      included: 0,
    },
    notes: "",
    literatureSummary: "",
    registryResults: [],
    preparedByMedDoc: false,
    preparedAt: "",
  };
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

function parseLitEvidenceScreenshots(raw: unknown) {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .filter((x) => x && typeof x === "object")
    .map((row) => {
      const x = row as Record<string, unknown>;
      if (typeof x.storageKey !== "string") return null;
      return {
        id: typeof x.id === "string" ? x.id : "",
        storageKey: x.storageKey,
        fileName: typeof x.fileName === "string" ? x.fileName : "screenshot.png",
        mimeType: typeof x.mimeType === "string" ? x.mimeType : "image/png",
        uploadedAt: typeof x.uploadedAt === "string" ? x.uploadedAt : "",
        caption: typeof x.caption === "string" ? x.caption : undefined,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x?.storageKey));
  return out.length ? out : undefined;
}

export function parseLiteratureSearchJson(raw: unknown): LiteratureSearchData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const prismaRaw = r.prisma;
  const prisma: PrismaFlowCounts =
    prismaRaw && typeof prismaRaw === "object"
      ? {
          identified: num((prismaRaw as PrismaFlowCounts).identified),
          duplicatesRemoved: num((prismaRaw as PrismaFlowCounts).duplicatesRemoved),
          screened: num((prismaRaw as PrismaFlowCounts).screened),
          excludedScreen: num((prismaRaw as PrismaFlowCounts).excludedScreen),
          fullTextAssessed: num((prismaRaw as PrismaFlowCounts).fullTextAssessed),
          excludedFullText: num((prismaRaw as PrismaFlowCounts).excludedFullText),
          included: num((prismaRaw as PrismaFlowCounts).included),
        }
      : emptyLiteratureSearchData().prisma;

  return {
    population: typeof r.population === "string" ? r.population : "",
    intervention: typeof r.intervention === "string" ? r.intervention : "",
    comparator: typeof r.comparator === "string" ? r.comparator : "",
    outcomes: typeof r.outcomes === "string" ? r.outcomes : "",
    databases: Array.isArray(r.databases)
      ? r.databases
          .filter((d): d is string => typeof d === "string")
          .map(normalizeDatabaseId)
      : [...DEFAULT_LITERATURE_DATABASE_IDS, ...DEFAULT_REGULATORY_DATABASE_IDS],
    searchQuery: typeof r.searchQuery === "string" ? r.searchQuery : "",
    searchDate: typeof r.searchDate === "string" ? r.searchDate : "",
    inclusionCriteria: typeof r.inclusionCriteria === "string" ? r.inclusionCriteria : "",
    exclusionCriteria: typeof r.exclusionCriteria === "string" ? r.exclusionCriteria : "",
    prisma,
    notes: typeof r.notes === "string" ? r.notes : "",
    literatureSummary: typeof r.literatureSummary === "string" ? r.literatureSummary : "",
    registryResults: Array.isArray(r.registryResults)
      ? r.registryResults
          .filter((x): x is RegistrySearchResult => x != null && typeof x === "object")
          .map((x) => ({
            registryId: typeof x.registryId === "string" ? x.registryId : "",
            query: typeof x.query === "string" ? x.query : "",
            status: (
              x.status === "records_found" || x.status === "review_required"
                ? x.status
                : "no_signal"
            ) as RegistrySearchStatus,
            summary: typeof x.summary === "string" ? x.summary : "",
            recordsScreened:
              typeof x.recordsScreened === "number" && x.recordsScreened >= 0
                ? Math.round(x.recordsScreened)
                : undefined,
            cerComment: typeof x.cerComment === "string" ? x.cerComment : undefined,
            evidenceUrl: typeof x.evidenceUrl === "string" ? x.evidenceUrl : undefined,
            liveVerified: x.liveVerified === true,
            liveQueryUrl: typeof x.liveQueryUrl === "string" ? x.liveQueryUrl : undefined,
            liveRecordCount:
              typeof x.liveRecordCount === "number" && x.liveRecordCount >= 0
                ? Math.round(x.liveRecordCount)
                : undefined,
            sampleHits: Array.isArray(x.sampleHits)
              ? x.sampleHits.filter((h): h is string => typeof h === "string")
              : undefined,
            evidenceScreenshots: parseLitEvidenceScreenshots(x.evidenceScreenshots),
          }))
          .filter((x) => x.registryId)
      : [],
    preparedByMedDoc: r.preparedByMedDoc === true,
    preparedAt: typeof r.preparedAt === "string" ? r.preparedAt : "",
    includedStudies: Array.isArray(r.includedStudies)
      ? r.includedStudies
          .filter((x): x is IncludedLiteratureStudy => x != null && typeof x === "object")
          .map((x) => ({
            index: typeof x.index === "number" ? Math.round(x.index) : 0,
            databaseId: typeof x.databaseId === "string" ? x.databaseId : "pubmed",
            citation: typeof x.citation === "string" ? x.citation : "",
            design: typeof x.design === "string" ? x.design : "",
            year: typeof x.year === "string" ? x.year : "",
            outcomes: typeof x.outcomes === "string" ? x.outcomes : "",
            quality:
              x.quality === "HIGH" || x.quality === "LOW" || x.quality === "MED"
                ? x.quality
                : "MED",
            cerComment: typeof x.cerComment === "string" ? x.cerComment : undefined,
            evidenceUrl: typeof x.evidenceUrl === "string" ? x.evidenceUrl : undefined,
            pmid: typeof x.pmid === "string" ? x.pmid.replace(/\D/g, "") || undefined : undefined,
          }))
          .filter((x) => x.index > 0 && x.citation)
          .sort((a, b) => a.index - b.index)
      : [],
    liveLiteratureSearch: r.liveLiteratureSearch === true,
    liveSearchAt: typeof r.liveSearchAt === "string" ? r.liveSearchAt : undefined,
    pubmedQueryUrl: typeof r.pubmedQueryUrl === "string" ? r.pubmedQueryUrl : undefined,
    pubmedTotal: typeof r.pubmedTotal === "number" ? r.pubmedTotal : undefined,
    evidenceScreenshots: parseLitEvidenceScreenshots(r.evidenceScreenshots),
    acceptedArticles: parseAcceptedArticles(r.acceptedArticles),
  };
}

function parseAcceptedArticles(raw: unknown) {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .filter((x) => x && typeof x === "object")
    .map((row) => {
      const x = row as Record<string, unknown>;
      if (typeof x.storageKey !== "string") return null;
      return {
        id: typeof x.id === "string" ? x.id : "",
        storageKey: x.storageKey,
        fileName: typeof x.fileName === "string" ? x.fileName : "article.pdf",
        mimeType: typeof x.mimeType === "string" ? x.mimeType : "application/pdf",
        uploadedAt: typeof x.uploadedAt === "string" ? x.uploadedAt : "",
        citation: typeof x.citation === "string" ? x.citation : undefined,
        studyIndex:
          typeof x.studyIndex === "number" && x.studyIndex > 0
            ? Math.round(x.studyIndex)
            : undefined,
        pmid: typeof x.pmid === "string" ? x.pmid.replace(/\D/g, "") || undefined : undefined,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x?.storageKey));
  return out.length ? out : undefined;
}

/** PubMed/MEDLINE is English — map device profile (TR or EN) to English search clauses. */
export function buildPubMedQueryFromDevice(productName: string, purpose?: string | null): string {
  const blob = `${productName} ${purpose ?? ""}`;
  const groups: string[] = [];

  const orTitle = (terms: string[]) => {
    const unique = [...new Set(terms.map((t) => t.trim()).filter(Boolean))];
    if (!unique.length) return "";
    if (unique.length === 1) return `${unique[0]}[Title/Abstract]`;
    return `(${unique.map((t) => `${t}[Title/Abstract]`).join(" OR ")})`;
  };

  if (/oftalmik|ophthalmic|göz|eye|cornea|kornea|sklera|sclera|retina/i.test(blob)) {
    groups.push(orTitle(["ophthalmic", "corneal", "scleral", "eye", "intraocular"]));
  }
  if (/bıçak|bicak|knife|incision|kesici|scalpel|blade|keratome|microkeratome|crescent/i.test(blob)) {
    groups.push(
      orTitle(["incision", "knife", "scalpel", "blade", "microkeratome", "ophthalmic knife"]),
    );
  }
  if (/steril|sterile/i.test(blob)) {
    groups.push(orTitle(["sterile", "sterilization", "aseptic"]));
  }
  if (/implant/i.test(blob)) {
    groups.push(orTitle(["implant", "implantable"]));
  }
  if (/cardiac|kalp|heart/i.test(blob)) {
    groups.push(orTitle(["cardiac", "heart"]));
  }

  const englishWords = blob.match(/\b[a-z]{4,}\b/gi)?.slice(0, 4) ?? [];
  if (englishWords.length) {
    groups.push(orTitle(englishWords));
  }

  if (!groups.length) {
    groups.push(orTitle(["medical device", "safety", "clinical performance"]));
  }

  return groups.join(" AND ");
}

/** Build PubMed-style query from PICO fields (English terms for live databases). */
export function buildSearchQueryFromPico(data: LiteratureSearchData): string {
  const purpose = [data.population, data.outcomes, data.comparator].filter(Boolean).join(" ");
  const core = buildPubMedQueryFromDevice(data.intervention, purpose);
  const safety = '(safety OR adverse OR complication OR "clinical performance")';
  return core ? `${core} AND ${safety}` : safety;
}

const CATALOG_BY_ID_MAP = new Map(CLINICAL_DATABASE_CATALOG.map((d) => [d.id, d]));

function includedCountForDatabaseExport(
  data: LiteratureSearchData,
  databaseId: string,
): number {
  const studies = data.includedStudies ?? [];
  if (studies.length > 0) {
    return studies.filter((s) => s.databaseId === databaseId).length;
  }
  if (databaseId === "pubmed" && data.liveLiteratureSearch) {
    return data.prisma.included;
  }
  return 0;
}

/** One Word table row per scientific database (PubMed, Embase, Cochrane…). */
export function serializeLiteratureDatabaseTableMarkdown(
  data: LiteratureSearchData,
  locale: "tr" | "en",
): string {
  const tr = locale === "tr";
  const litIds = data.databases.filter((id) => CATALOG_BY_ID.get(id)?.group === "literature");
  if (litIds.length === 0) return "";

  const headers = tr
    ? ["Veri tabanı", "Arama sorgusu", "Bulunan kayıt", "Dahil edilen (n)", "Değerlendirme özeti"]
    : ["Database", "Search query", "Records found", "Included (n)", "Assessment summary"];

  const cell = (v: string) => v.replace(/\|/g, "/").replace(/\n/g, " ").trim();
  const query = data.searchQuery.trim() || "—";

  const rows = litIds.map((id) => {
    const label = databaseLabel(id, locale);
    const n = includedCountForDatabaseExport(data, id);
    const isPubmed = id === "pubmed";
    const records =
      isPubmed && data.liveLiteratureSearch && data.pubmedTotal != null
        ? String(data.pubmedTotal)
        : "—";
    const rowQuery = isPubmed && data.liveLiteratureSearch ? query : "—";
    const summary =
      isPubmed && data.literatureSummary?.trim()
        ? data.literatureSummary.trim()
        : n > 0
          ? tr
            ? `${label}: ${n} çalışma kayıtlı.`
            : `${label}: ${n} study/studies recorded.`
          : tr
            ? `${label}: canlı tarama yapılmadı — ayrı sorgu gerekir.`
            : `${label}: not searched live — separate query required.`;
    return `| ${cell(label)} | \`${cell(rowQuery)}\` | ${records} | ${n} | ${cell(summary)} |`;
  });

  return [
    tr ? "### Bilimsel literatür — kaynak bazlı tarama sonuçları" : "### Scientific literature — per-source search results",
    "",
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows,
  ].join("\n");
}

/** PRISMA flow table for CER / Word export (matches literature tab summary). */
export function serializePrismaFlowMarkdown(
  prisma: PrismaFlowCounts,
  locale: "tr" | "en",
): string {
  const tr = locale === "tr";
  const p = prisma;
  return tr
    ? [
        "### PRISMA akış özeti",
        "",
        "| Özet | n |",
        "| --- | --- |",
        `| Tanımlanan | ${p.identified} |`,
        `| Tarandı (başlık/özet) | ${p.screened} |`,
        `| Tam metin değerlendirilen | ${p.fullTextAssessed} |`,
        `| Dahil edilen | ${p.included} |`,
        "",
        "| Aşama (detay) | n |",
        "| --- | --- |",
        `| Tanımlanan kayıtlar | ${p.identified} |`,
        `| Yinelenenler çıkarıldı | ${p.duplicatesRemoved} |`,
        `| Başlık/özet taranan | ${p.screened} |`,
        `| Eleme dışı (başlık/özet) | ${p.excludedScreen} |`,
        `| Tam metin değerlendirilen | ${p.fullTextAssessed} |`,
        `| Eleme dışı (tam metin) | ${p.excludedFullText} |`,
        `| Dahil edilen çalışmalar | ${p.included} |`,
      ].join("\n")
    : [
        "### PRISMA flow summary",
        "",
        "| Summary | n |",
        "| --- | --- |",
        `| Identified | ${p.identified} |`,
        `| Screened (title/abstract) | ${p.screened} |`,
        `| Full-text assessed | ${p.fullTextAssessed} |`,
        `| Included | ${p.included} |`,
        "",
        "| Stage (detail) | n |",
        "| --- | --- |",
        `| Records identified | ${p.identified} |`,
        `| Duplicates removed | ${p.duplicatesRemoved} |`,
        `| Title/abstract screened | ${p.screened} |`,
        `| Excluded at screening | ${p.excludedScreen} |`,
        `| Full-text assessed | ${p.fullTextAssessed} |`,
        `| Excluded at full-text | ${p.excludedFullText} |`,
        `| Studies included | ${p.included} |`,
      ].join("\n");
}

export function serializeLiteratureStrategyMarkdown(
  data: LiteratureSearchData,
  locale: "tr" | "en",
): string {
  const tr = locale === "tr";
  const litDbs = data.databases
    .filter((id) => CATALOG_BY_ID.get(id)?.group === "literature")
    .map((id) => databaseLabel(id, locale));
  const regDbs = data.databases
    .filter((id) => CATALOG_BY_ID.get(id)?.group === "regulatory")
    .map((id) => databaseLabel(id, locale));
  const legacyDbs = data.databases
    .filter((id) => !CATALOG_BY_ID.has(id))
    .map((id) => databaseLabel(id, locale));
  const prismaBlock = serializePrismaFlowMarkdown(data.prisma, locale);

  return [
    tr ? "## Literatür tarama stratejisi" : "## Literature search strategy",
    "",
    tr ? "### PICO" : "### PICO",
    "",
    tr
      ? `- **Popülasyon:** ${data.population.trim() || "—"}`
      : `- **Population:** ${data.population.trim() || "—"}`,
    tr
      ? `- **Müdahale / cihaz:** ${data.intervention.trim() || "—"}`
      : `- **Intervention / device:** ${data.intervention.trim() || "—"}`,
    tr
      ? `- **Karşılaştırma:** ${data.comparator.trim() || "—"}`
      : `- **Comparator:** ${data.comparator.trim() || "—"}`,
    tr
      ? `- **Sonuçlar:** ${data.outcomes.trim() || "—"}`
      : `- **Outcomes:** ${data.outcomes.trim() || "—"}`,
    "",
    tr ? "### Bilimsel veri tabanları" : "### Scientific databases",
    litDbs.length ? litDbs.map((d) => `- ${d}`).join("\n") : "—",
    "",
    tr
      ? "### Ulusal kayıtlar ve düzenleyici veri tabanları"
      : "### National registries and regulatory databases",
    tr
      ? "_FDA MAUDE, FDA geri çağırma, BfArM, MHRA, EUDAMED, TİTCK ve benzeri ulusal vigilans kaynakları PMS/PMCF ile birlikte taranır._"
      : "_FDA MAUDE, FDA recalls, BfArM, MHRA, EUDAMED, TİTCK and similar national vigilance sources are searched alongside PMS/PMCF._",
    regDbs.length ? regDbs.map((d) => `- ${d}`).join("\n") : "—",
    legacyDbs.length ? legacyDbs.map((d) => `- ${d}`).join("\n") : "",
    "",
    tr ? "### Arama" : "### Search",
    tr ? `- **Tarih:** ${data.searchDate || "—"}` : `- **Date:** ${data.searchDate || "—"}`,
    tr ? `- **Sorgu:** \`${data.searchQuery.trim() || "—"}\`` : `- **Query:** \`${data.searchQuery.trim() || "—"}\``,
    data.liveLiteratureSearch && data.pubmedTotal != null
      ? tr
        ? `- **Canlı PubMed:** ${data.pubmedTotal.toLocaleString("tr-TR")} kayıt${data.pubmedQueryUrl ? ` — [sorgu](${data.pubmedQueryUrl})` : ""}`
        : `- **Live PubMed:** ${data.pubmedTotal.toLocaleString()} records${data.pubmedQueryUrl ? ` — [query](${data.pubmedQueryUrl})` : ""}`
      : "",
    "",
    tr ? "### Dahil etme kriterleri" : "### Inclusion criteria",
    data.inclusionCriteria.trim() || (tr ? "_Tanımlanacak_" : "_To be defined_"),
    "",
    tr ? "### Hariç tutma kriterleri" : "### Exclusion criteria",
    data.exclusionCriteria.trim() || (tr ? "_Tanımlanacak_" : "_To be defined_"),
    "",
    prismaBlock,
    "",
    serializeLiteratureDatabaseTableMarkdown(data, locale),
    data.registryResults?.length
      ? [
          "",
          tr
            ? "### Ulusal kayıt ve vigilans tarama sonuçları"
            : "### National registry and vigilance search results",
          "",
          tr
            ? "_MDRpilot tarafından ürün profili, PICO ve risk dosyasına göre hazırlanmış taslak — canlı kayıt sorguları ile doğrulanmalıdır._"
            : "_Draft prepared by MDRpilot from product profile, PICO and risk file — verify against live registry queries._",
          "",
          "| " +
            (tr
              ? "Kaynak | Sorgu | Durum | Özet"
              : "Source | Query | Status | Summary") +
            " |",
          "| --- | --- | --- | --- |",
          ...data.registryResults.map((r) => {
            const label = databaseLabel(r.registryId, locale);
            const status = registryStatusExportLabel(r.status, locale);
            const liveNote =
              r.liveVerified && r.liveRecordCount != null
                ? tr
                  ? ` [canlı: ${r.liveRecordCount}]`
                  : ` [live: ${r.liveRecordCount}]`
                : "";
            const hits =
              (r.sampleHits?.length ?? 0) > 0
                ? ` ${tr ? "Örnek:" : "Sample:"} ${r.sampleHits!.slice(0, 2).join("; ")}`
                : "";
            const cell = (v: string) => v.replace(/\|/g, "/").replace(/\n/g, " ").trim();
            return `| ${cell(label + liveNote)} | \`${cell(r.query)}\` | ${cell(status)} | ${cell(r.summary + hits)} |`;
          }),
        ].join("\n")
      : "",
    "",
    data.notes.trim()
      ? `${tr ? "### Notlar" : "### Notes"}\n${data.notes.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
