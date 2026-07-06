import type { ExportLanguage } from "@/lib/exports/i18n";
import type { ComplianceGap, ConsultantResult, RoadmapWeek, TopAction } from "./types";

const SEVERITY_LABEL: Record<string, Partial<Record<ExportLanguage, string>>> = {
  Critical: { tr: "Kritik", en: "Critical" },
  Major: { tr: "Majör", en: "Major" },
  Minor: { tr: "Minör", en: "Minor" },
  Observation: { tr: "Gözlem", en: "Observation" },
};

function severityLabel(severity: string, lang: ExportLanguage): string {
  return SEVERITY_LABEL[severity]?.[lang] ?? SEVERITY_LABEL[severity]?.en ?? severity;
}

function localizeGapTitle(title: string, lang: ExportLanguage): string {
  if (lang === "en") return title;
  const rules: [RegExp, string][] = [
    [/^Device Description Incomplete$/, "Cihaz tanımı eksik"],
    [/^Biocompatibility Evidence Missing$/, "Biyouyumluluk kanıtı eksik"],
    [/^Sterilization Validation Missing$/, "Sterilizasyon validasyonu eksik"],
    [/^GSPR Evidence Gaps \((\d+)\)$/, "GSPR kanıt eksikleri ($1)"],
    [/^Risk Management File Missing$/, "Risk yönetim dosyası eksik"],
    [/^Risk Controls Incomplete \((\d+)\)$/, "Risk kontrolleri eksik ($1)"],
    [/^PSUR \/ PMS Report Reference Missing$/, "PSUR / PMS rapor referansı eksik"],
    [/^Medical Device File Incomplete \((\d+)\)$/, "Tıbbi cihaz dosyası eksik ($1)"],
    [/^(.+) Missing$/, "$1 eksik"],
    [/^QMS Documents Not Approved \((\d+)\)$/, "Onaylanmamış KYS dokümanı ($1)"],
    [/^No Objective Evidence Uploaded$/, "Nesnel kanıt yüklenmemiş"],
    [/^Open CAPA \((\d+)\)$/, "Açık CAPA ($1)"],
    [/^Software Lifecycle Documentation Missing$/, "Yazılım yaşam döngüsü dokümantasyonu eksik"],
  ];
  for (const [re, repl] of rules) {
    if (re.test(title)) return title.replace(re, repl);
  }
  return title;
}

function localizeAction(action: string, lang: ExportLanguage): string {
  if (lang === "en") return action;
  const map: Record<string, string> = {
    "Complete and approve the full product family structure, variants and intended purpose.":
      "Ürün ailesi yapısı, varyantlar ve kullanım amacını tamamlayıp onaylayın.",
    "Perform/collect ISO 10993 biological evaluation and link the report as evidence.":
      "ISO 10993 biyolojik değerlendirmesini yapın/toplayın ve raporu kanıt olarak bağlayın.",
    "Add sterilization validation and packaging validation reports as evidence.":
      "Sterilizasyon ve ambalaj validasyon raporlarını kanıt olarak ekleyin.",
    "Link evidence documents and finalize compliance statements for the listed GSPRs.":
      "Kanıt dokümanlarını bağlayın ve listelenen GSPR maddeleri için uygunluk ifadelerini tamamlayın.",
    "Create the risk management file with hazards, risk controls and residual risk evaluation.":
      "Tehlikeler, risk kontrolleri ve artık risk değerlendirmesi ile risk yönetim dosyasını oluşturun.",
    "Define risk control measures and document verification of control for each hazard.":
      "Her tehlike için risk kontrol önlemlerini tanımlayın ve doğrulamayı belgeleyin.",
    "Complete the Risk Management tab (plan, FMEA, report).":
      "Risk Yönetimi sekmesini tamamlayın (plan, FMEA, rapor).",
    "Add PSUR/PMS report reference in TF; maintain full PMS plan in the PMS module.":
      "TF'ye PSUR/PMS rapor referansı ekleyin; tam PMS planını PMS modülünde yürütün.",
    "Establish IEC 62304 software development and verification documentation.":
      "IEC 62304 yazılım geliştirme ve doğrulama dokümantasyonunu oluşturun.",
  };
  return map[action] ?? action;
}

function localizeRoadmap(roadmap: RoadmapWeek[], lang: ExportLanguage): RoadmapWeek[] {
  if (lang === "en") return roadmap;
  const focusTr: Record<string, string> = {
    "Stop the bleeding — critical gaps & quick wins": "Kritik eksikler ve hızlı kazanımlar",
    "Close remaining critical items & evidence": "Kalan kritik maddeler ve kanıtlar",
    "Major gaps & documentation": "Majör eksikler ve dokümantasyon",
    "Minor gaps, review & verification": "Minör eksikler, gözden geçirme ve doğrulama",
  };
  return roadmap.map((w) => ({
    ...w,
    focus: focusTr[w.focus] ?? w.focus,
    items: w.items.map((it) =>
      it === "No outstanding items for this week." ? "Bu hafta için bekleyen madde yok." : localizeGapTitle(it, lang),
    ),
  }));
}

function buildSummary(consult: ConsultantResult, lang: ExportLanguage): string {
  const scope = consult.standard.replace(/_/g, " ");
  const critical = consult.gaps.filter((g) => g.severity === "Critical").length;
  if (lang === "tr") {
    return consult.productName
      ? `${consult.productName} için ${scope} hazırlık oranı %${consult.overallScore}. ${critical} kritik, toplam ${consult.gaps.length} eksik tespit edildi.`
      : `Şirket geneli ${scope} hazırlığı %${consult.overallScore}. Toplam ${consult.gaps.length} eksik tespit edildi.`;
  }
  return consult.summary;
}

export function localizeConsultantForExport(
  consult: ConsultantResult,
  lang: ExportLanguage,
): ConsultantResult {
  if (lang === "en") return consult;

  const gaps: ComplianceGap[] = consult.gaps.map((g) => ({
    ...g,
    title: localizeGapTitle(g.title, lang),
    recommendedAction: localizeAction(g.recommendedAction, lang),
    severity: g.severity,
  }));

  const topActions: TopAction[] = consult.topActions.map((a) => ({
    ...a,
    title: localizeGapTitle(a.title, lang),
    priority: a.priority,
  }));

  return {
    ...consult,
    summary: buildSummary(consult, lang),
    gaps,
    topActions,
    roadmap: localizeRoadmap(consult.roadmap, lang),
  };
}

export function formatGapSeverityForPdf(severity: string, lang: ExportLanguage): string {
  return severityLabel(severity, lang);
}
