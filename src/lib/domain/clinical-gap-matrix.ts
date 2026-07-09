import type { LiteratureSearchData } from "@/lib/domain/clinical-literature-model";
import type { EquivalentDevicesData } from "@/lib/domain/clinical-equivalent-model";
import type { ClinicalStudyRecord } from "@/lib/domain/clinical-study-model";

export interface ClinicalGapRow {
  id: string;
  claimTr: string;
  claimEn: string;
  evidenceSource: string;
  gapTr: string;
  gapEn: string;
  pmcfActionTr: string;
  pmcfActionEn: string;
  severity: "none" | "minor" | "major";
}

export interface ClinicalGapMatrix {
  generatedAt: string;
  rows: ClinicalGapRow[];
}

export function buildClinicalGapMatrix(input: {
  locale: "tr" | "en";
  productName: string;
  deviceClass: string;
  isSterile: boolean;
  usesEquivalence: boolean;
  literatureData?: LiteratureSearchData | null;
  equivalentDevicesData?: EquivalentDevicesData | null;
  studies?: ClinicalStudyRecord[];
  hasBenefitRisk?: boolean;
  hasPmsPmcf?: boolean;
}): ClinicalGapMatrix {
  const tr = input.locale === "tr";
  const lit = input.literatureData;
  const equiv = input.equivalentDevicesData;
  const studies = input.studies ?? [];
  const rows: ClinicalGapRow[] = [];
  const now = new Date().toISOString();

  function row(
    id: string,
    claimTr: string,
    claimEn: string,
    evidence: string,
    gapTr: string,
    gapEn: string,
    pmcfTr: string,
    pmcfEn: string,
    severity: ClinicalGapRow["severity"],
  ): ClinicalGapRow {
    return {
      id,
      claimTr,
      claimEn,
      evidenceSource: evidence,
      gapTr,
      gapEn,
      pmcfActionTr: pmcfTr,
      pmcfActionEn: pmcfEn,
      severity,
    };
  }

  const includedN = lit?.prisma?.included ?? 0;
  const pdfN = lit?.acceptedArticles?.filter((a) => a.storageKey)?.length ?? 0;
  const pubmedSsOk = (lit?.evidenceScreenshots?.length ?? 0) > 0;
  const litSearchOk = Boolean(lit?.preparedByMedDoc && lit.liveLiteratureSearch && includedN > 0);
  const litPdfOk = includedN === 0 || pdfN >= includedN;
  const litOk = litSearchOk && pubmedSsOk && litPdfOk;
  const litEvidence = litSearchOk
    ? tr
      ? `PubMed canlı; ${includedN} dahil; ${pdfN} PDF; SS ${pubmedSsOk ? "var" : "yok"}`
      : `Live PubMed; ${includedN} included; ${pdfN} PDF; SS ${pubmedSsOk ? "yes" : "no"}`
    : tr
      ? "Literatür taraması eksik"
      : "Literature search missing";
  rows.push(
    row(
      "clinical-performance",
      "Klinik performans",
      "Clinical performance",
      litEvidence,
      litOk
        ? "—"
        : tr
          ? "Anahtar kelime tarama SS + dahil çalışmaların tam metin PDF'i gerekli"
          : "Keyword-search screenshot + full-text PDF for included studies required",
      litOk
        ? "—"
        : tr
          ? "Anahtar kelime tarama SS + dahil çalışmaların tam metin PDF'i gerekli"
          : "Keyword-search screenshot + full-text PDF for included studies required",
      litOk ? "—" : tr ? "PMCF: performans endpoint izleme" : "PMCF: monitor performance endpoints",
      litOk ? "—" : tr ? "PMCF: performans endpoint izleme" : "PMCF: monitor performance endpoints",
      litOk ? "none" : "major",
    ),
  );

  const registryRows = lit?.registryResults ?? [];
  const registryWithSs = registryRows.filter((r) => (r.evidenceScreenshots?.length ?? 0) > 0);
  const registryOk =
    registryRows.length > 0 &&
    registryWithSs.length === registryRows.length &&
    registryRows.some((r) => r.liveVerified || (r.evidenceUrl?.trim()?.length ?? 0) > 0);
  rows.push(
    row(
      "safety-vigilance",
      "Güvenlik / vigilans",
      "Safety / vigilance",
      registryOk
        ? tr
          ? `${registryWithSs.length}/${registryRows.length} kayıt SS + deep-link`
          : `${registryWithSs.length}/${registryRows.length} registry SS + deep-link`
        : tr
          ? "Ulusal kayıt taraması / kanıt SS eksik"
          : "National registry screening / screenshot evidence missing",
      registryOk ? "—" : tr ? "Her ulusal kayıt için deep-link + kanıt SS gerekli" : "Deep-link + screenshot evidence required per national registry",
      registryOk ? "—" : tr ? "Her ulusal kayıt için deep-link + kanıt SS gerekli" : "Deep-link + screenshot evidence required per national registry",
      registryOk ? "—" : tr ? "PMS şikâyet trendi + vigilans" : "PMS complaint trends + vigilance",
      registryOk ? "—" : tr ? "PMS şikâyet trendi + vigilans" : "PMS complaint trends + vigilance",
      registryOk ? "none" : "major",
    ),
  );

  if (input.usesEquivalence) {
    const n = equiv?.devices?.length ?? 0;
    const ssOk = equiv?.devices?.some((d) => (d.evidenceScreenshots?.length ?? 0) > 0) ?? false;
    rows.push(
      row(
        "equivalence",
        "Eşdeğerlik iddiası",
        "Equivalence claim",
        n > 0 ? (tr ? `${n} predicate cihaz` : `${n} predicate devices`) : tr ? "Eşdeğer tablo boş" : "Equivalence table empty",
        ssOk ? "—" : tr ? "510(k)/IFU kanıt SS eksik" : "510(k)/IFU evidence screenshots missing",
        ssOk ? "—" : tr ? "510(k)/IFU kanıt SS eksik" : "510(k)/IFU evidence screenshots missing",
        ssOk ? "—" : tr ? "PMCF: farkların klinik etkisi" : "PMCF: clinical impact of differences",
        ssOk ? "—" : tr ? "PMCF: farkların klinik etkisi" : "PMCF: clinical impact of differences",
        n > 0 && ssOk ? "none" : n > 0 ? "minor" : "major",
      ),
    );
  }

  const studiesOk = studies.length >= 3;
  rows.push(
    row(
      "clinical-data",
      "Klinik veri yeterliliği",
      "Clinical data sufficiency",
      studiesOk ? (tr ? `${studies.length} bulgu satırı` : `${studies.length} finding rows`) : tr ? "Yetersiz bulgu" : "Insufficient findings",
      studiesOk ? "—" : tr ? "PRISMA dahil sayısı ile bulgu satırları uyumsuz olabilir" : "Finding rows may not match PRISMA included count",
      studiesOk ? "—" : tr ? "PRISMA dahil sayısı ile bulgu satırları uyumsuz olabilir" : "Finding rows may not match PRISMA included count",
      studiesOk ? "—" : tr ? "Eksik veri için PMCF" : "PMCF for data gaps",
      studiesOk ? "—" : tr ? "Eksik veri için PMCF" : "PMCF for data gaps",
      studiesOk ? "none" : "minor",
    ),
  );

  if (input.isSterile) {
    rows.push(
      row(
        "sterility",
        "Sterilite / biyouyumluluk",
        "Sterility / biocompatibility",
        input.hasBenefitRisk
          ? tr
            ? "Risk dosyası + teknik dosya referansı"
            : "Risk file + technical file reference"
          : tr
            ? "Fayda-risk bölümü eksik"
            : "Benefit-risk section missing",
        input.hasBenefitRisk ? "—" : tr ? "Sterilizasyon validasyon raporu TF'ye bağlanmalı" : "Link sterilization validation in TF",
        input.hasBenefitRisk ? "—" : tr ? "Sterilizasyon validasyon raporu TF'ye bağlanmalı" : "Link sterilization validation in TF",
        tr ? "PMS: sterilite şikâyetleri" : "PMS: sterility complaints",
        tr ? "PMS: sterilite şikâyetleri" : "PMS: sterility complaints",
        input.hasBenefitRisk ? "none" : "minor",
      ),
    );
  }

  rows.push(
    row(
      "pmcf-link",
      "PMCF bağlantısı",
      "PMCF linkage",
      input.hasPmsPmcf
        ? tr
          ? "PMS/PMCF girdileri CER'de"
          : "PMS/PMCF inputs in CER"
        : tr
          ? "PMCF planı CER ile eşleşmemiş"
          : "PMCF plan not aligned with CER",
      input.hasPmsPmcf ? "—" : tr ? "PMCF endpoint ↔ CER belirsizlikleri tablosu" : "PMCF endpoints ↔ CER uncertainties table",
      input.hasPmsPmcf ? "—" : tr ? "PMCF endpoint ↔ CER belirsizlikleri tablosu" : "PMCF endpoints ↔ CER uncertainties table",
      input.hasPmsPmcf ? "—" : tr ? "PMCF planını güncelle" : "Update PMCF plan",
      input.hasPmsPmcf ? "—" : tr ? "PMCF planını güncelle" : "Update PMCF plan",
      input.hasPmsPmcf ? "none" : "minor",
    ),
  );

  return { generatedAt: now, rows };
}

export function parseClinicalGapMatrix(raw: unknown): ClinicalGapMatrix | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as ClinicalGapMatrix;
  if (!Array.isArray(o.rows)) return null;
  return {
    generatedAt: typeof o.generatedAt === "string" ? o.generatedAt : new Date().toISOString(),
    rows: o.rows.filter((r) => r && typeof r.id === "string"),
  };
}

export function serializeGapMatrixMarkdown(matrix: ClinicalGapMatrix, locale: "tr" | "en"): string {
  const tr = locale === "tr";
  const lines = [
    tr ? "## Klinik iddia — kanıt — boşluk matrisi" : "## Clinical claim — evidence — gap matrix",
    "",
    tr
      ? "| İddia | Kanıt kaynağı | Boşluk | PMCF aksiyonu |"
      : "| Claim | Evidence source | Gap | PMCF action |",
    "| --- | --- | --- | --- |",
  ];
  for (const r of matrix.rows) {
    const claim = tr ? r.claimTr : r.claimEn;
    const gap = tr ? r.gapTr : r.gapEn;
    const pmcf = tr ? r.pmcfActionTr : r.pmcfActionEn;
    const cell = (v: string) => v.replace(/\|/g, "/").replace(/\n/g, " ").trim() || "—";
    lines.push(`| ${cell(claim)} | ${cell(r.evidenceSource)} | ${cell(gap)} | ${cell(pmcf)} |`);
  }
  lines.push(
    "",
    tr
      ? `_Matris ${matrix.generatedAt.slice(0, 10)} tarihinde MDRpilot tarafından üretilmiştir._`
      : `_Matrix generated by MDRpilot on ${matrix.generatedAt.slice(0, 10)}._`,
  );
  return lines.join("\n");
}
