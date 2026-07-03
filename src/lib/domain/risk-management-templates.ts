import { RISK_PLAN_MARKDOWN_TEMPLATE_TR } from "./risk-plan-yilmaz-template";
import {
  buildBiocompatibilityPlanDetail,
  buildEmdnPlanDetail,
  buildPackagingPlanDetail,
  type RiskPlanTfProductFields,
  type TfSectionRef,
} from "./risk-plan-tf-snippets";
import {
  buildTableE1PlanSection,
  buildTableE2PlanSection,
} from "./risk-plan-table-e-markdown";
import { buildRiskMatrixPlanSection } from "./risk-plan-risk-matrix";
import { parseTableERowsJson, type RiskPlanTableERow } from "./risk-table-e";

/** MDRpilot risk yönetim doküman kodları (teknik dosya Bölüm 8). */
export const RISK_FORM_META = {
  plan: {
    formNo: "MD-RM-01",
    rev: "01",
    titleTr: "Risk Yönetim Planı",
    titleEn: "Risk Management Plan",
  },
  annexA: {
    formNo: "MD-RM-02",
    rev: "01",
    titleTr: "ISO 14971 Ek A Soru Listesi",
    titleEn: "ISO 14971 Annex A Question List",
  },
  fmea: {
    formNo: "MD-RM-03",
    rev: "01",
    titleTr: "FMEA Tablosu",
    titleEn: "FMEA Table",
  },
  report: {
    formNo: "MD-RM-04",
    rev: "01",
    titleTr: "Risk Yönetim Raporu",
    titleEn: "Risk Management Report",
  },
  policy: {
    formNo: "MD-RM-05",
    rev: "01",
    titleTr: "Risk Yönetim Politikası",
    titleEn: "Risk Management Policy",
  },
} as const;

export function formatRiskFormRef(
  section: keyof typeof RISK_FORM_META,
  locale: "tr" | "en" = "tr",
): string {
  const m = RISK_FORM_META[section];
  const date = new Date().toLocaleDateString(locale === "tr" ? "tr-TR" : "en-GB");
  return `${m.formNo} Rev.${m.rev} · ${date}`;
}

function slugForWordFileName(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "risk-doc"
  );
}

/** Download filename for AI-generated risk Word export (matches docx API). */
export function riskWordDocFileName(
  kind: "plan" | "report" | "policy",
  locale: "tr" | "en" = "tr",
): string {
  const meta = RISK_FORM_META[kind];
  const title = locale === "en" ? meta.titleEn : meta.titleTr;
  const revPadded = meta.rev.padStart(2, "0");
  return `${meta.formNo} ${slugForWordFileName(title)} REV${revPadded}.docx`;
}

type RiskExportSection = "plan" | "report" | "policy" | "annexA" | "fmea";

const EXPORT_SECTION_META: Record<RiskExportSection, keyof typeof RISK_FORM_META> = {
  plan: "plan",
  report: "report",
  policy: "policy",
  annexA: "annexA",
  fmea: "fmea",
};

/** Expected export filename for a risk section tab (Word or Excel). */
export function riskSectionExportFileName(
  section: RiskExportSection,
  locale: "tr" | "en" = "tr",
): string {
  const meta = RISK_FORM_META[EXPORT_SECTION_META[section]];
  const title = locale === "en" ? meta.titleEn : meta.titleTr;
  const revPadded = meta.rev.padStart(2, "0");
  const ext = section === "fmea" ? "xlsx" : "docx";
  return `${meta.formNo} ${slugForWordFileName(title)} REV${revPadded}.${ext}`;
}
export interface RiskTemplateContext {
  companyName: string;
  legalName: string;
  productName: string;
  brand: string;
  model: string;
  deviceClass: string;
  intendedPurpose: string;
  indications: string;
  contraindications: string;
  materials: string;
  sterilization: string;
  isSterile: boolean;
  isInvasive: boolean;
  containsSoftware: boolean;
  udiDi: string;
  basicUdiDi: string;
  notifiedBody: string;
  manufacturingSites: string;
  address: string;
  date: string;
  riskItemCount: number;
  fmeaRef: string;
  annexARef: string;
  planRef: string;
  reportRef: string;
  policyRef: string;
  biocompatibilityDetail: string;
  packagingDetail: string;
  emdnDetail: string;
  tableE1Detail: string;
  tableE2Detail: string;
  riskMatrixDetail: string;
}

export function buildRiskTemplateContext(
  product: {
    name: string;
    brand?: string | null;
    model?: string | null;
    deviceClass: string;
    intendedPurpose?: string | null;
    indications?: string | null;
    contraindications?: string | null;
    materials?: string | null;
    packagingType?: string | null;
    shelfLife?: string | null;
    manufacturingProcess?: string | null;
    criticalSuppliers?: string | null;
    emdnCode?: string | null;
    isSterile: boolean;
    isInvasive: boolean;
    containsSoftware: boolean;
    udiDi?: string | null;
    basicUdiDi?: string | null;
    sterilization: string;
    riskItems?: { length: number };
  },
  company: {
    name: string;
    legalName?: string | null;
    notifiedBody?: string | null;
    manufacturingSites?: string | null;
    address?: string | null;
  },
  sterilizationLabel: string,
  locale: "tr" | "en" = "tr",
  technicalSections: TfSectionRef[] = [],
  planTableE1Rows: RiskPlanTableERow[] = [],
  planTableE2Rows: RiskPlanTableERow[] = [],
): RiskTemplateContext {
  const date = new Date().toLocaleDateString(locale === "tr" ? "tr-TR" : "en-GB");
  const productName = product.name;
  const manufacturingSites = company.manufacturingSites ?? company.address ?? "—";
  const tfProduct: RiskPlanTfProductFields = {
    materials: product.materials,
    packagingType: product.packagingType,
    shelfLife: product.shelfLife,
    manufacturingProcess: product.manufacturingProcess,
    criticalSuppliers: product.criticalSuppliers,
    manufacturingSites,
    emdnCode: product.emdnCode,
    intendedPurpose: product.intendedPurpose,
    productName,
  };
  const biocompatibilityDetail = buildBiocompatibilityPlanDetail(tfProduct, technicalSections, locale);
  const packagingDetail = buildPackagingPlanDetail(tfProduct, technicalSections, locale);
  const emdnDetail = buildEmdnPlanDetail(tfProduct, technicalSections, locale);
  const fmeaRef = `${RISK_FORM_META.fmea.formNo} Rev.${RISK_FORM_META.fmea.rev}`;
  const annexARef = RISK_FORM_META.annexA.formNo;
  const e1Rows =
    planTableE1Rows.length > 0
      ? planTableE1Rows
      : parseTableERowsJson(null, "E1", locale);
  const e2Rows =
    planTableE2Rows.length > 0
      ? planTableE2Rows
      : parseTableERowsJson(null, "E2", locale);
  const tableE1Detail = buildTableE1PlanSection(e1Rows, locale, fmeaRef, annexARef);
  const tableE2Detail = buildTableE2PlanSection(e2Rows, locale, fmeaRef);
  const reportRef = `${RISK_FORM_META.report.formNo} Rev.${RISK_FORM_META.report.rev}`;
  const riskMatrixDetail = buildRiskMatrixPlanSection(locale, fmeaRef, reportRef);
  return {
    companyName: company.name,
    legalName: company.legalName ?? company.name,
    productName,
    brand: product.brand ?? "—",
    model: product.model ?? "—",
    deviceClass: product.deviceClass,
    intendedPurpose: product.intendedPurpose?.trim() || "—",
    indications: product.indications?.trim() || "—",
    contraindications: product.contraindications?.trim() || "—",
    materials: product.materials?.trim() || "—",
    sterilization: sterilizationLabel,
    isSterile: product.isSterile,
    isInvasive: product.isInvasive,
    containsSoftware: product.containsSoftware,
    udiDi: product.udiDi ?? "—",
    basicUdiDi: product.basicUdiDi ?? "—",
    notifiedBody: company.notifiedBody ?? "—",
    manufacturingSites,
    address: company.address ?? "—",
    date,
    riskItemCount: product.riskItems?.length ?? 0,
    planRef: `${RISK_FORM_META.plan.formNo} Rev.${RISK_FORM_META.plan.rev}`,
    annexARef: RISK_FORM_META.annexA.formNo,
    fmeaRef: `${RISK_FORM_META.fmea.formNo} Rev.${RISK_FORM_META.fmea.rev}`,
    reportRef,
    policyRef: `${RISK_FORM_META.policy.formNo} Rev.${RISK_FORM_META.policy.rev}`,
    biocompatibilityDetail,
    packagingDetail,
    emdnDetail,
    tableE1Detail,
    tableE2Detail,
    riskMatrixDetail,
  };
}

export function applyRiskTemplate(template: string, ctx: RiskTemplateContext | Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(ctx)) {
    out = out.replaceAll(`{{${key}}}`, String(value));
  }
  return out;
}

function header(formNo: string, rev: string) {
  return `FORM NO: ${formNo}          REV: ${rev}
ÜRÜN / PRODUCT: {{productName}}
ÜRETİCİ / MANUFACTURER: {{legalName}}
TARİH / DATE: {{date}}
────────────────────────────────────────────────────────`;
}

export const RISK_POLICY_TEMPLATE_TR = `${header(RISK_FORM_META.policy.formNo, RISK_FORM_META.policy.rev)}

{{policyRef}} — RİSK YÖNETİM POLİTİKASI

1. AMAÇ
Bu politika, {{legalName}} bünyesinde tıbbi cihazlar için ISO 14971:2019 ve MDR 2017/745 gerekliliklerine uygun risk yönetiminin uygulanmasını tanımlar.

2. KAPSAM
Kapsam: {{productName}} ({{brand}} / {{model}}) ve aynı risk yönetim dosyası kapsamındaki varyantlar. Sınıf: {{deviceClass}}.

3. POLİTİKA
{{legalName}}, hasta, kullanıcı ve üçüncü kişilerin güvenliğini sağlamak amacıyla:
• Riskleri sistematik olarak tanımlamak, tahmin etmek, değerlendirmek ve kontrol etmek,
• Kalan riskleri kabul edilebilirlik kriterlerine göre değerlendirmek,
• Üretim öncesi ve sonrası bilgileri risk dosyasını güncellemek için kullanmak,
• Risk yönetimini ISO 13485 kalite yönetim sistemi ile entegre etmek.

4. SORUMLULUKLAR
• Genel Müdür / Kalite Müdürü: Risk yönetim sürecinin kaynak tahsisi ve onayı
• Risk Yönetim Ekibi: Tehlike tanımlama, FMEA ({{fmeaRef}}), kontrol önlemleri ve doğrulama
• Tasarım & Geliştirme: Tasarım kontrolleri ve risk azaltma (tasarım aşaması)
• Üretim: Proses kontrolleri ve üretim kayıtları
• Satış Sonrası: PMS/şikâyet verilerinin risk dosyasına geri beslemesi

5. RİSK KABUL EDİLEBİLİRLİK KRİTERLERİ
5×5 risk matrisi (Şiddet × Olasılık). Risk skoru ≥ 15: kabul edilemez — kontrol zorunlu. Skor 9–14: azaltma gerekli. Skor ≤ 8: kabul edilebilir veya fayda-risk analizi ile gerekçelendirilir.

6. RİSK YÖNETİM DOSYASI BİLEŞENLERİ
• {{planRef}} Risk Yönetim Planı
• {{annexARef}} Ek-A Soru Listesi
• {{fmeaRef}} Hata Modu ve Etkileri Analizi (FMEA) Tablosu
• {{reportRef}} Risk Yönetim Raporu
• Bu politika ({{policyRef}})

7. GÖZDEN GEÇİRME
Risk dosyası, tasarım değişikliği, üretim değişikliği, PMS bulgusu veya en az yılda bir gözden geçirilir.

ONAY: Kalite Müdürü — Tarih: {{date}}`;

/** MD-RM-01 tam başlık yapısı (markdown). */
export function buildRiskPlanMarkdown(ctx: RiskTemplateContext): string {
  return applyRiskTemplate(RISK_PLAN_MARKDOWN_TEMPLATE_TR.trim(), ctx).trim();
}

export const RISK_REPORT_TEMPLATE_TR = `${header(RISK_FORM_META.report.formNo, RISK_FORM_META.report.rev)}

{{reportRef}} — RİSK YÖNETİM RAPORU

1. AMAÇ
{{productName}} için gerçekleştirilen risk yönetim faaliyetlerinin özeti ve genel sonuç.

2. ÜRÜN ÖZETİ
{{productName}} ({{brand}}/{{model}}), Sınıf {{deviceClass}}. Amaç: {{intendedPurpose}}.
Sterilizasyon: {{sterilization}}. Materyal: {{materials}}.

3. YAPILAN FAALİYETLER
• Risk yönetim planı ({{planRef}}) uygulandı.
• Ek-A soru listesi ({{annexARef}}) ile güvenlikle ilgili özellikler değerlendirildi.
• FMEA tablosu ({{fmeaRef}}) güncellendi — kayıtlı risk satırı: {{riskItemCount}}.
• Kontrol önlemleri tasarım, üretim ve satış sonrası kategorilerinde dokümante edildi.

4. TEHLİKE VE KONTROL ÖZETİ
Tanımlanan tehlikeler ve kontrol önlemleri {{fmeaRef}} tablosunda listelenmiştir. Başlangıç riskleri kontrol sonrası artık risk seviyelerine indirilmiştir.

5. ARTıK RİSK DEĞERLENDİRMESİ
Uygulanan kontroller sonrası kalan riskler değerlendirilmiştir. Kabul edilemez seviyede artık risk bırakılmamıştır.

6. FAYDA-RİSK ANALİZİ
{{productName}}'in klinik faydası, kalan risklerle karşılaştırıldığında olumludur. Kullanım amacı doğrultusunda fayda-risk dengesi kabul edilebilir bulunmuştur.

7. ÜRETİM ÖNCESİ / SONRASI BİLGİLER
PMS, şikâyet ve vigilans verileri risk dosyasının periyodik gözden geçirmesinde değerlendirilecektir.

8. SONUÇ
Risk yönetim süreci ISO 14971:2019 ile uyumludur. Risk dosyası teknik dosya Bölüm 8'de sunulmuştur.

ONAY: Kalite Müdürü | Tarih: {{date}} | Bildirilen Kuruluş: {{notifiedBody}}`;

export const RISK_ANNEX_A_TABLE_TEMPLATE_TR = `${header(RISK_FORM_META.annexA.formNo, RISK_FORM_META.annexA.rev)}

{{annexARef}} — EK-A SORU LİSTESİ (ISO 14971:2019)

Ürün: {{productName}} | Amaç: {{intendedPurpose}}

Aşağıdaki tabloda güvenlikle ilgili özellikler ve ISO 14971 Ek A soruları için cihaza özel bilgiler doldurulur.

| No | Güvenlikle ilgili özellik / Soru | Cihaza ilişkin bilgi / Değerlendirme |
|----|-----------------------------------|--------------------------------------|
| A.2.1 | Kullanım amacı ve makul öngörülebilir yanlış kullanım | {{intendedPurpose}}. Yanlış kullanım: amaca uygun olmayan anatomik bölge, steril olmayan ortamda açılmış ürünün kullanımı vb. IFU ile kontrol. |
| A.2.2 | Kullanıcı eğitimi ve nitelikleri | Hekim / eğitimli sağlık personeli. Eğitim IFU ve ürün tanıtımı ile. |
| A.2.3 | Kullanım ortamı | Ameliyathane / steril cerrahi ortam. |
| A.2.4 | Bakım ve kalibrasyon | Tek kullanımlık — bakım/kalibrasyon uygulanmaz. |
| A.2.5 | Cihaz ömrü | Tek kullanım; raf ömrü ambalaj ve sterilizasyon validasyonuna göre. |
| A.2.6 | Taşıma ve depolama | IFU ve etiket depolama koşulları; nem/ısı kontrolü. |
| A.2.7 | Enerji kaynağı | Aktif cihaz değil; enerji kaynağı yok. |
| A.2.8 | Biyouyumluluk | Materyal: {{materials}}. ISO 10993 değerlendirmesi. |
| A.2.9 | Sterilite / mikrobiyal kontaminasyon | {{sterilization}}. Steril bariyer ISO 11607. |
| A.2.10 | Temizlik / yeniden işleme | Tek kullanımlık; yeniden işleme yok. |
| A.2.11 | Değişiklik / yazılım güncellemesi | {{containsSoftwareNote}} |
| A.2.12 | Radyasyon | Radyasyon emisyonu yok. |
| A.2.13 | Elektriksel / mekanik / termal tehlikeler | Kesici uç — mekanik yaralanma riski; kontrol tasarım ve IFU ile. |
| A.2.14 | Aksesuarlar ve diğer cihazlarla etkileşim | Uygun cerrahi prosedür ve ekipman ile kullanım. |
| A.2.15 | Kullanıcı arayüzü / kullanılabilirlik | IFU, etiketleme; IEC 62366 (uygulanabilir olduğunda). |
| A.2.16 | Klinik veri ve artık risk kabulü | Klinik fayda-risk {{reportRef}} ile desteklenir. |

Değerlendirme sonucu: Tanımlanan tehlikeler {{fmeaRef}} tablosuna aktarılmıştır.

Hazırlayan: Risk Yönetim Ekibi | Tarih: {{date}}`;

export function buildRuleBasedRiskDocuments(ctx: RiskTemplateContext & { containsSoftwareNote: string }) {
  return {
    managementPolicy: applyRiskTemplate(RISK_POLICY_TEMPLATE_TR, ctx),
    plan: buildRiskPlanMarkdown(ctx),
    report: applyRiskTemplate(RISK_REPORT_TEMPLATE_TR, ctx),
    annexAQuestions: applyRiskTemplate(RISK_ANNEX_A_TABLE_TEMPLATE_TR, ctx),
  };
}
