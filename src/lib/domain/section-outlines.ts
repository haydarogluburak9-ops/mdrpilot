/**
 * Canonical, regulation-driven sub-heading outlines for each technical-file
 * section (keyed by the section key used in TECHNICAL_FILE_TEMPLATE).
 *
 * These fix the structure of every generated/draft section so it does NOT change
 * between AI runs: the model is told to use EXACTLY these "## " subheadings, in
 * this order, and only fill the content underneath. Based on MDR 2017/745
 * Annex II/III and the relevant MDCG guidance / harmonised standards.
 *
 * Each heading is bilingual; the active document language is picked at render
 * time. Sections without an entry fall back to free-form structuring.
 */
import { POST_MARKET_SECTION_OUTLINES } from "./post-market-mdcg-outlines";

export interface OutlineHeading {
  en: string;
  tr: string;
}

export const SECTION_OUTLINES: Record<string, OutlineHeading[]> = {
  "device-description": [
    { en: "Device Name and Intended Purpose", tr: "Cihaz Adı ve Kullanım Amacı" },
    { en: "Device Description and Variants", tr: "Cihaz Tanımı ve Varyantlar" },
    { en: "Product Variants and Configurations", tr: "Ürün Varyantları ve Konfigürasyonları" },
    { en: "Intended Users and Patient Population", tr: "Hedef Kullanıcılar ve Hasta Popülasyonu" },
    { en: "Patient Selection Criteria", tr: "Hasta Seçim Kriterleri" },
    { en: "Principle of Operation", tr: "Çalışma Prensibi" },
    { en: "Qualification as a Medical Device", tr: "Tıbbi Cihaz Olarak Nitelendirme" },
    { en: "Indications and Contraindications", tr: "Endikasyonlar ve Kontrendikasyonlar" },
    { en: "Warnings, Precautions and Side Effects", tr: "Uyarılar, Önlemler ve Yan Etkiler" },
    { en: "Clinical Benefit", tr: "Klinik Fayda" },
    { en: "Technical Specifications and Performance", tr: "Teknik Özellikler ve Performans" },
    { en: "Biocompatibility and Body Contact", tr: "Biyouyumluluk ve Vücut Teması" },
    { en: "Shelf Life and Storage", tr: "Raf Ömrü ve Saklama" },
    { en: "Accessories and Combination Devices", tr: "Aksesuarlar ve Birlikte Kullanılan Cihazlar" },
    { en: "Software", tr: "Yazılım" },
    { en: "EMDN and MDR Nomenclature Codes", tr: "EMDN ve MDR Nomenklatür Kodları" },
    { en: "Classification and Rationale", tr: "Sınıflandırma ve Gerekçesi" },
    { en: "Applied Standards Summary", tr: "Uygulanan Standartlar Özeti" },
  ],
  "general-info": [
    { en: "Manufacturer Identification", tr: "Üretici Kimliği" },
    { en: "Manufacturing Sites", tr: "Üretim Tesisleri" },
    { en: "SRN and EUDAMED Registration", tr: "SRN ve EUDAMED Kaydı" },
    { en: "Authorised Representative", tr: "Yetkili Temsilci" },
    { en: "Basic UDI-DI and UDI-DI", tr: "Temel UDI-DI ve UDI-DI" },
    { en: "CE Marking and Notified Body", tr: "CE İşareti ve Onaylanmış Kuruluş" },
    { en: "Conformity Assessment Route", tr: "Uygunluk Değerlendirme Yolu" },
    { en: "History of CE Certification", tr: "CE Belgelendirme Geçmişi" },
    { en: "Target Markets and EU Countries", tr: "Hedef Pazarlar ve AB Ülkeleri" },
  ],
  "previous-generations": [
    { en: "Previous Generations by the Manufacturer", tr: "Üreticinin Önceki Nesilleri" },
    { en: "Similar and Equivalent Devices", tr: "Benzer ve Eşdeğer Cihazlar" },
    { en: "Design and Material Evolution", tr: "Tasarım ve Malzeme Evrimi" },
    { en: "Lessons Learned and Field Experience", tr: "Alınan Dersler ve Saha Deneyimi" },
    { en: "Device Family and Variant Rationale", tr: "Cihaz Ailesi ve Varyant Gerekçesi" },
  ],
  "info-supplied": [
    { en: "Label", tr: "Etiket" },
    { en: "Instructions for Use (IFU)", tr: "Kullanım Talimatları (KT)" },
    { en: "Symbols Used", tr: "Kullanılan Semboller" },
    { en: "MDR Annex I Regulatory Declarations", tr: "MDR Ek I Düzenleyici Beyanları" },
    { en: "Incident Reporting and Vigilance", tr: "Olay Bildirimi ve Vigilans" },
    { en: "Disposal and Waste Separation", tr: "Bertaraf ve Atık Ayrıştırma" },
    { en: "Troubleshooting", tr: "Sorun Giderme" },
    { en: "Packaging and Marking", tr: "Ambalaj ve Markalama" },
    { en: "Languages Provided", tr: "Sağlanan Diller" },
    { en: "Technical Documentation Retention Period", tr: "Teknik Dokümantasyon Saklama Süresi" },
  ],
  "design-manufacturing": [
    { en: "Design Overview", tr: "Tasarım Genel Bakışı" },
    { en: "Manufacturing Process", tr: "Üretim Süreci" },
    { en: "Manufacturing Sites", tr: "Üretim Yerleri" },
    { en: "Process Validation", tr: "Süreç Validasyonu" },
    { en: "Design and Process Controls", tr: "Tasarım ve Süreç Kontrolleri" },
  ],
  "suppliers": [
    { en: "Critical Suppliers and Subcontractors", tr: "Kritik Tedarikçiler ve Alt Yükleniciler" },
    { en: "Outsourced Processes", tr: "Dış Kaynaklı Süreçler" },
    { en: "Supplier Controls and Agreements", tr: "Tedarikçi Kontrolleri ve Anlaşmaları" },
    { en: "Manufacturing Sites", tr: "Üretim Yerleri" },
  ],
  "standards-list": [
    { en: "Applicable Legislation", tr: "Uygulanan Mevzuat" },
    { en: "Applicable MDCG Guidance", tr: "Uygulanan MDCG Kılavuzları" },
    { en: "Harmonised Standards Applied", tr: "Uygulanan Harmonize Standartlar" },
    { en: "Common Specifications", tr: "Ortak Spesifikasyonlar" },
    { en: "Extent of Application", tr: "Uygulama Kapsamı" },
  ],
  "gspr": [
    { en: "Applicable Requirements", tr: "Geçerli Gereklilikler" },
    { en: "Non-Applicable Requirements and Justification", tr: "Geçerli Olmayan Gereklilikler ve Gerekçesi" },
    { en: "Solutions Adopted", tr: "Benimsenen Çözümler" },
    { en: "Evidence References", tr: "Kanıt Referansları" },
  ],
  "benefit-risk": [
    { en: "Benefits", tr: "Yararlar" },
    { en: "Identified Risks", tr: "Tanımlanan Riskler" },
    { en: "Benefit-Risk Determination", tr: "Yarar-Risk Değerlendirmesi" },
    { en: "Overall Conclusion", tr: "Genel Sonuç" },
  ],
  "risk-management": [
    { en: "Risk Management Plan", tr: "Risk Yönetim Planı" },
    { en: "Hazard Identification", tr: "Tehlike Tanımlama" },
    { en: "Risk Estimation and Evaluation", tr: "Risk Tahmini ve Değerlendirmesi" },
    { en: "Risk Control Measures", tr: "Risk Kontrol Önlemleri" },
    { en: "Residual Risk Evaluation", tr: "Artık Risk Değerlendirmesi" },
    { en: "Risk Management Report", tr: "Risk Yönetim Raporu" },
  ],
  "verification-validation": [
    { en: "Verification Activities", tr: "Doğrulama Faaliyetleri" },
    { en: "Validation Activities", tr: "Validasyon Faaliyetleri" },
    { en: "Test Methods and Acceptance Criteria", tr: "Test Yöntemleri ve Kabul Kriterleri" },
    { en: "Results Summary", tr: "Sonuç Özeti" },
  ],
  "biocompatibility": [
    { en: "Biological Evaluation Plan", tr: "Biyolojik Değerlendirme Planı" },
    { en: "Material Characterization", tr: "Malzeme Karakterizasyonu" },
    { en: "Endpoints Assessed", tr: "Değerlendirilen Son Noktalar" },
    { en: "Biological Evaluation Report", tr: "Biyolojik Değerlendirme Raporu" },
  ],
  "sterilization": [
    { en: "Sterilization Method", tr: "Sterilizasyon Yöntemi" },
    { en: "Validation Approach", tr: "Validasyon Yaklaşımı" },
    { en: "Sterility Assurance Level (SAL)", tr: "Sterilite Güvence Seviyesi (SAL)" },
    { en: "Residuals (if applicable)", tr: "Kalıntılar (varsa)" },
    { en: "Routine Controls", tr: "Rutin Kontroller" },
  ],
  "reprocessing": [
    { en: "Reprocessing Instructions", tr: "Yeniden İşleme Talimatları" },
    { en: "Cleaning and Disinfection Validation", tr: "Temizlik ve Dezenfeksiyon Validasyonu" },
    { en: "Re-sterilization Validation", tr: "Yeniden Sterilizasyon Validasyonu" },
    { en: "Number of Reuse Cycles", tr: "Yeniden Kullanım Döngü Sayısı" },
  ],
  "packaging": [
    { en: "Packaging System", tr: "Ambalaj Sistemi" },
    { en: "Sterile Barrier System", tr: "Steril Bariyer Sistemi" },
    { en: "Packaging Validation", tr: "Ambalaj Validasyonu" },
    { en: "Transport and Distribution Testing", tr: "Taşıma ve Dağıtım Testi" },
  ],
  "shelf-life": [
    { en: "Shelf Life Claim", tr: "Raf Ömrü Beyanı" },
    { en: "Stability Study Design", tr: "Stabilite Çalışma Tasarımı" },
    { en: "Real-Time and Accelerated Aging", tr: "Gerçek Zamanlı ve Hızlandırılmış Yaşlandırma" },
    { en: "Results and Conclusion", tr: "Sonuçlar ve Sonuç" },
  ],
  "electrical-safety": [
    { en: "Applicable Standards (IEC 60601)", tr: "Geçerli Standartlar (IEC 60601)" },
    { en: "Electrical Safety Testing", tr: "Elektriksel Güvenlik Testi" },
    { en: "EMC Testing", tr: "EMC Testi" },
    { en: "Test Results", tr: "Test Sonuçları" },
  ],
  "software-validation": [
    { en: "Software Description and Classification", tr: "Yazılım Tanımı ve Sınıflandırması" },
    { en: "Software Lifecycle (IEC 62304)", tr: "Yazılım Yaşam Döngüsü (IEC 62304)" },
    { en: "Verification and Validation", tr: "Doğrulama ve Validasyon" },
    { en: "Cybersecurity", tr: "Siber Güvenlik" },
    { en: "Anomalies and Residual Risks", tr: "Anomaliler ve Artık Riskler" },
  ],
  "usability": [
    { en: "Use Specification", tr: "Kullanım Spesifikasyonu" },
    { en: "Use-Related Risk Analysis", tr: "Kullanıma Bağlı Risk Analizi" },
    { en: "Formative Evaluation", tr: "Biçimlendirici Değerlendirme" },
    { en: "Summative Evaluation", tr: "Özetleyici Değerlendirme" },
    { en: "Usability Conclusion", tr: "Kullanılabilirlik Sonucu" },
  ],
  "sscp": [
    { en: "Device and Intended Purpose", tr: "Cihaz ve Kullanım Amacı" },
    { en: "Clinical Performance and Safety", tr: "Klinik Performans ve Güvenlik" },
    { en: "Residual Risks and Undesirable Effects", tr: "Artık Riskler ve İstenmeyen Etkiler" },
    { en: "Information for Patients", tr: "Hastalar İçin Bilgiler" },
  ],
  "implant-card": [
    { en: "Implant Card Content", tr: "İmplant Kartı İçeriği" },
    { en: "Information Supplied to the Patient", tr: "Hastaya Sağlanan Bilgiler" },
    { en: "Languages and Format", tr: "Diller ve Format" },
  ],
  ...POST_MARKET_SECTION_OUTLINES,
  "doc": [
    { en: "Manufacturer and Device Identification", tr: "Üretici ve Cihaz Kimliği" },
    { en: "Conformity Statement", tr: "Uygunluk Beyanı" },
    { en: "Applied Legislation and Standards", tr: "Uygulanan Mevzuat ve Standartlar" },
    { en: "Notified Body (if applicable)", tr: "Onaylanmış Kuruluş (varsa)" },
    { en: "Signature and Date", tr: "İmza ve Tarih" },
  ],
};

/** Localised list of fixed subheadings for a section key (empty if none defined). */
export function outlineFor(sectionKey: string, locale: string): string[] {
  const outline = SECTION_OUTLINES[sectionKey];
  if (!outline) return [];
  return outline.map((h) => (locale === "tr" ? h.tr : h.en));
}
