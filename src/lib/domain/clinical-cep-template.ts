/** Turkish consultant-style CEP headings (Tekno Bio / ARMA template). */

export interface CepSectionTitles {
  intro: string;
  stage0: string;
  s11: string;
  s111: string;
  s112: string;
  s113: string;
  s114: string;
  s115: string;
  s12: string;
  s13: string;
  s131: string;
  s132: string;
  s14: string;
  s15: string;
  stage1: string;
  s21: string;
  s22: string;
  s23: string;
  s24: string;
  s25: string;
  s26: string;
  s27: string;
  stage2: string;
  s31: string;
  s32: string;
  stage3: string;
  s41: string;
  benefitRisk: string;
  pmcf: string;
  team: string;
  schedule: string;
  riskFile: string;
}

export function cepSectionTitles(locale: "tr" | "en"): CepSectionTitles {
  if (locale === "tr") {
    return {
      intro: "Giriş",
      stage0: "1. Klinik Değerlendirme Özeti (Aşama 0)",
      s11: "1.1 Genel Bilgi",
      s111: "1.1.1 Firma Bilgileri",
      s112: "1.1.2 Ürün Listesi",
      s113: "1.1.3 GMDN / EMDN Kodları",
      s114: "1.1.4 Sınıflandırma",
      s115: "1.1.5 Ürün Pazar Durumu",
      s12: "1.2 Ürün Tanımı ve Kullanım Alanları",
      s13: "1.3 Terapötik Kullanım Endikasyonları",
      s131: "1.3.1 Endikasyonlar",
      s132: "1.3.2 Kontrendikasyonlar",
      s14: "1.4 Eşdeğerlik Stratejisi",
      s15: "1.5 Ürün Tarihçesi / Varyantlar",
      stage1: "2. Literatür Tarama Protokolü (Aşama 1)",
      s21: "2.1 Genel Bilgi",
      s22: "2.2 Literatür Taramanın Kapsamı",
      s23: "2.3 Metot",
      s24: "2.4 Arama Parametreleri",
      s25: "2.5 Hariç Bırakma Kriteri",
      s26: "2.6 Dahil Etme Kriteri",
      s27: "2.7 Klinik Değerlendirme İçin Önemli İçerik",
      stage2: "3. Klinik Verinin Değerlendirilmesi (Aşama 2)",
      s31: "3.1 Uygunluk Kriteri",
      s32: "3.2 Veri Katkı Kriteri",
      stage3: "4. Klinik Veri Analizi Planı (Aşama 3)",
      s41: "4.1 Genel Bilgi",
      benefitRisk: "5. Fayda-Risk Değerlendirmesi",
      pmcf: "6. PMCF Planı",
      team: "7. Klinik Değerlendirme Ekibi",
      schedule: "8. Takvim ve Kilometre Taşları",
      riskFile: "9. Risk Yönetimi Dosyası Entegrasyonu",
    };
  }
  return {
    intro: "Introduction",
    stage0: "1. Clinical Evaluation Summary (Stage 0)",
    s11: "1.1 General information",
    s111: "1.1.1 Company details",
    s112: "1.1.2 Product list",
    s113: "1.1.3 GMDN / EMDN codes",
    s114: "1.1.4 Classification",
    s115: "1.1.5 Market status",
    s12: "1.2 Device description and intended use areas",
    s13: "1.3 Therapeutic indications",
    s131: "1.3.1 Indications",
    s132: "1.3.2 Contraindications",
    s14: "1.4 Equivalence strategy",
    s15: "1.5 Product history / variants",
    stage1: "2. Literature search protocol (Stage 1)",
    s21: "2.1 General information",
    s22: "2.2 Scope of literature search",
    s23: "2.3 Method",
    s24: "2.4 Search parameters",
    s25: "2.5 Exclusion criteria",
    s26: "2.6 Inclusion criteria",
    s27: "2.7 Content important for clinical evaluation",
    stage2: "3. Appraisal of clinical data (Stage 2)",
    s31: "3.1 Suitability criteria",
    s32: "3.2 Data contribution criteria",
    stage3: "4. Clinical data analysis plan (Stage 3)",
    s41: "4.1 General information",
    benefitRisk: "5. Benefit-risk assessment",
    pmcf: "6. PMCF plan",
    team: "7. Clinical evaluation team",
    schedule: "8. Schedule and milestones",
    riskFile: "9. Risk management file integration",
  };
}

export const CEP_IMPORTANT_CONTENT_TR = [
  "Amaçlanan kullanıma ilişkin klinik verilere odaklanan yayınlar.",
  "Aynı endikasyonlarda cihaz teknolojisinin terapötik veya diğer etkilerini (olumlu/olumsuz) değerlendiren yayınlar.",
  "Belirli ürün iddialarına odaklanan yayınlar.",
];

export const CEP_IMPORTANT_CONTENT_EN = [
  "Publications focusing on clinical data related to intended use.",
  "Publications on same indications evaluating therapeutic or other effects of the device technology (positive and negative).",
  "Publications addressing specific product claims.",
];
