/** ISO 14971 risk yönetim dokümanları — sabit bölüm başlıkları (TF / MD-RM şablon yapısı). */
import type { OutlineHeading } from "./section-outlines";
import { RISK_PLAN_HEADINGS_EN, RISK_PLAN_HEADINGS_TR } from "./risk-plan-yilmaz-template";

export type RiskDocKind = "plan" | "policy" | "report";

export const RISK_DOC_OUTLINES: Record<RiskDocKind, OutlineHeading[]> = {
  policy: [
    { en: "Purpose", tr: "Amaç" },
    { en: "Scope", tr: "Kapsam" },
    { en: "Policy", tr: "Politika" },
    { en: "Responsibilities", tr: "Sorumluluklar" },
    { en: "Risk Acceptability Criteria", tr: "Risk Kabul Edilebilirlik Kriterleri" },
    { en: "Risk Management File Components", tr: "Risk Yönetim Dosyası Bileşenleri" },
    { en: "Review", tr: "Gözden Geçirme" },
    { en: "Approval", tr: "Onay" },
  ],
  plan: RISK_PLAN_HEADINGS_TR.map((tr, i) => ({
    tr,
    en: RISK_PLAN_HEADINGS_EN[i] ?? tr,
  })),
  report: [
    { en: "Purpose", tr: "Amaç" },
    { en: "Product Summary", tr: "Ürün Özeti" },
    { en: "Activities Performed", tr: "Yapılan Faaliyetler" },
    { en: "Hazard and Control Summary", tr: "Tehlike ve Kontrol Özeti" },
    { en: "Residual Risk Assessment", tr: "Artık Risk Değerlendirmesi" },
    { en: "Benefit-Risk Analysis", tr: "Fayda-Risk Analizi" },
    { en: "Pre- and Post-Production Information", tr: "Üretim Öncesi / Sonrası Bilgiler" },
    { en: "Conclusion", tr: "Sonuç" },
    { en: "Approval", tr: "Onay" },
  ],
};

export function riskOutlineFor(kind: RiskDocKind, locale: "tr" | "en"): string[] {
  const outlines = RISK_DOC_OUTLINES[kind];
  return outlines.map((h) => (locale === "tr" ? h.tr : h.en));
}
