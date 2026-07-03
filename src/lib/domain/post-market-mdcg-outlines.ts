/**
 * Post-market section outlines aligned with EU MDR 2017/745 and MDCG guidance:
 * - PMS plan: Annex III, Art. 84
 * - PMCF plan: Annex XIV Part B, MDCG 2020-7
 * - PMCF evaluation report: Annex XIV Part B, MDCG 2020-8
 * - PSUR / PMS report: Art. 85–86, MDCG 2022-21
 */
import type { OutlineHeading } from "./section-outlines";

export const POST_MARKET_SECTION_KEYS = ["pms-plan", "pmcf-plan", "pmcf-report", "psur-report"] as const;
export type PostMarketSectionKey = (typeof POST_MARKET_SECTION_KEYS)[number];

export function isPostMarketSectionKey(key: string): key is PostMarketSectionKey {
  return (POST_MARKET_SECTION_KEYS as readonly string[]).includes(key);
}

/** Regulatory citation shown under each document title. */
export const POST_MARKET_REGULATORY_REFS: Record<PostMarketSectionKey, { en: string; tr: string }> = {
  "pms-plan": {
    en: "MDR Annex III · Art. 83–84 · ISO 13485 §8.2.1",
    tr: "MDR Ek III · Md. 83–84 · ISO 13485 §8.2.1",
  },
  "pmcf-plan": {
    en: "MDR Annex XIV Part B · MDCG 2020-7 (PMCF Plan template)",
    tr: "MDR Ek XIV B Bölümü · MDCG 2020-7 (PMCF Plan şablonu)",
  },
  "pmcf-report": {
    en: "MDR Annex XIV Part B · MDCG 2020-8 (PMCF Evaluation Report template)",
    tr: "MDR Ek XIV B Bölümü · MDCG 2020-8 (PMCF Değerlendirme Raporu şablonu)",
  },
  "psur-report": {
    en: "MDR Art. 85–86 · MDCG 2022-21 (PSUR content and format)",
    tr: "MDR Md. 85–86 · MDCG 2022-21 (PSUR içerik ve format)",
  },
};

export const POST_MARKET_SECTION_OUTLINES: Record<PostMarketSectionKey, OutlineHeading[]> = {
  "pms-plan": [
    { en: "Device and Manufacturer Identification", tr: "Cihaz ve Üretici Kimliği" },
    { en: "PMS System Overview and Responsibilities", tr: "PMS Sistemi Genel Bakışı ve Sorumluluklar" },
    { en: "Data to Be Collected", tr: "Toplanacak Veriler" },
    { en: "Data Collection Methods and Sources", tr: "Veri Toplama Yöntemleri ve Kaynakları" },
    { en: "Data Analysis and Evaluation Methods", tr: "Veri Analizi ve Değerlendirme Yöntemleri" },
    { en: "Indicators, Thresholds and Action Criteria", tr: "Göstergeler, Eşikler ve Aksiyon Kriterleri" },
    { en: "Interface with Risk Management and CAPA", tr: "Risk Yönetimi ve CAPA ile Arayüz" },
    { en: "Interface with Clinical Evaluation and PMCF", tr: "Klinik Değerlendirme ve PMCF ile Arayüz" },
    { en: "PMS Report / PSUR Frequency and Distribution", tr: "PMS Raporu / PSUR Sıklığı ve Dağıtımı" },
    { en: "Reference to QMS Procedures", tr: "KY Sistemi Prosedürlerine Referans" },
    { en: "Plan Review and Update Triggers", tr: "Plan Gözden Geçirme ve Güncelleme Tetikleyicileri" },
  ],
  "pmcf-plan": [
    { en: "Device Identification", tr: "Cihaz Kimliği" },
    { en: "Reference to Clinical Evaluation and CER Uncertainties", tr: "Klinik Değerlendirme ve CER Belirsizliklerine Referans" },
    { en: "PMCF Objectives", tr: "PMCF Amaçları" },
    { en: "General PMCF Methods", tr: "Genel PMCF Yöntemleri" },
    { en: "Specific PMCF Methods — Clinical Investigation", tr: "Özel PMCF Yöntemleri — Klinik Araştırma" },
    { en: "Specific PMCF Methods — Questionnaire / Survey", tr: "Özel PMCF Yöntemleri — Anket / Soru Formu" },
    { en: "Specific PMCF Methods — Retrospective Clinical Data Review", tr: "Özel PMCF Yöntemleri — Geriye Dönük Klinik Veri İncelemesi" },
    { en: "Specific PMCF Methods — Systematic Literature Review", tr: "Özel PMCF Yöntemleri — Sistematik Literatür Taraması" },
    { en: "Specific PMCF Methods — Other", tr: "Özel PMCF Yöntemleri — Diğer" },
    { en: "Justification of PMCF Methods", tr: "PMCF Yöntemlerinin Gerekçesi" },
    { en: "Statistical Considerations and Sample Size", tr: "İstatistiksel Hususlar ve Örneklem Büyüklüğü" },
    { en: "Milestones, Timeline and Responsibilities", tr: "Kilometre Taşları, Zaman Çizelgesi ve Sorumluluklar" },
    { en: "Reference to Technical Documentation and PMCF Evaluation Report", tr: "Teknik Dokümantasyon ve PMCF Değerlendirme Raporuna Referans" },
  ],
  "pmcf-report": [
    { en: "Device and Manufacturer Identification", tr: "Cihaz ve Üretici Kimliği" },
    { en: "Reference to PMCF Plan", tr: "PMCF Planına Referans" },
    { en: "Reporting Period and Summary of PMCF Activities", tr: "Raporlama Dönemi ve PMCF Faaliyetleri Özeti" },
    { en: "Results — Clinical Investigation", tr: "Sonuçlar — Klinik Araştırma" },
    { en: "Results — Questionnaire / Survey", tr: "Sonuçlar — Anket / Soru Formu" },
    { en: "Results — Retrospective Clinical Data Review", tr: "Sonuçlar — Geriye Dönük Klinik Veri İncelemesi" },
    { en: "Results — Systematic Literature Review", tr: "Sonuçlar — Sistematik Literatür Taraması" },
    { en: "Results — Other PMCF Methods", tr: "Sonuçlar — Diğer PMCF Yöntemleri" },
    { en: "Evaluation and Analysis of PMCF Data", tr: "PMCF Verilerinin Değerlendirilmesi ve Analizi" },
    { en: "Conclusions on Safety and Clinical Performance", tr: "Güvenlik ve Klinik Performans Sonuçları" },
    { en: "Impact on Benefit-Risk Determination and CER", tr: "Yarar-Risk Belirlemesi ve CER Üzerindeki Etkisi" },
    { en: "Actions Taken and Recommendations", tr: "Alınan Aksiyonlar ve Öneriler" },
    { en: "Need for PMCF Plan Update", tr: "PMCF Planı Güncelleme İhtiyacı" },
  ],
  "psur-report": [
    { en: "Administrative Information", tr: "İdari Bilgiler" },
    { en: "Executive Summary", tr: "Yönetici Özeti" },
    { en: "Volume of Sales and Population Exposure", tr: "Satış Hacmi ve Popülasyon Maruziyeti" },
    { en: "Serious Incidents and Field Safety Corrective Actions (FSCA)", tr: "Ciddi Olaylar ve Saha Güvenliği Düzeltici Faaliyetleri (FSCA)" },
    { en: "Customer Feedback and Complaints Summary", tr: "Müşteri Geri Bildirimi ve Şikâyet Özeti" },
    { en: "Trend Reporting", tr: "Trend Raporlaması" },
    { en: "Findings from Literature Search", tr: "Literatür Taraması Bulguları" },
    { en: "PMCF Activities and Findings", tr: "PMCF Faaliyetleri ve Bulguları" },
    { en: "Findings from PMS Data Analysis", tr: "PMS Veri Analizi Bulguları" },
    { en: "Benefit-Risk Determination Update", tr: "Yarar-Risk Belirlemesi Güncellemesi" },
    { en: "Actions Taken (CAPA, IFU, Design Changes)", tr: "Alınan Aksiyonlar (CAPA, KT, Tasarım Değişiklikleri)" },
    { en: "Conclusions and Need for CER Update", tr: "Sonuçlar ve CER Güncelleme İhtiyacı" },
  ],
};

export function postMarketOutlineFor(key: PostMarketSectionKey, locale: string): string[] {
  return POST_MARKET_SECTION_OUTLINES[key].map((h) => (locale === "tr" ? h.tr : h.en));
}
