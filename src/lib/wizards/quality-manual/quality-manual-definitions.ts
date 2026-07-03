import type { QmManualSection } from "./quality-manual-types";
import { bi, sectionHeading } from "./quality-manual-bilingual";

interface TermDef {
  no: string;
  tr: string;
  en: string;
  defTr: string;
  defEn: string;
}

const TERMS: TermDef[] = [
  { no: "3.1", tr: "Tavsiye Niteliğinde Uyarı", en: "Advisory Warning", defTr: "Etiket veya IFU'da kullanıcıya yönelik güvenlik/uygulama uyarısı.", defEn: "Safety or application warning for the user on the label or IFU." },
  { no: "3.2", tr: "Yetkili Temsilci", en: "Authorized Representative", defTr: "AB pazarı için MDR kapsamında üretici adına hareket eden kuruluş.", defEn: "Entity acting on behalf of the manufacturer for the EU market under MDR." },
  { no: "3.3", tr: "Klinik Değerlendirme", en: "Clinical Evaluation", defTr: "Klinik verilerin analizi ile güvenlik ve performansın değerlendirilmesi.", defEn: "Assessment of safety and performance through analysis of clinical data." },
  { no: "3.4", tr: "Şikâyet", en: "Complaint", defTr: "Ürün kimliği iletilerek yapılan, ürünün tanımlanan özelliklerini karşılamadığına dair yazılı, sözlü veya elektronik iletişim.", defEn: "Written, oral or electronic communication alleging deficiency against identified product characteristics." },
  { no: "3.5", tr: "Dağıtıcı", en: "Distributor", defTr: "Tıbbi cihazı tedarik zincirinde yer alarak piyasada bulunduran taraflardan biri.", defEn: "Party in the supply chain that makes a medical device available on the market." },
  { no: "3.6", tr: "Vücuda Yerleştirilebilir Tıbbi Cihaz", en: "Implantable Medical Device", defTr: "Cerrahi müdahale ile tamamen veya kısmen vücuda yerleştirilen cihaz.", defEn: "Device wholly or partly introduced into the body through surgical intervention." },
  { no: "3.7", tr: "İthalatçı", en: "Importer", defTr: "AB'ye piyasaya arz edilmek üzere ürünü ithal eden taraflardan biri.", defEn: "Party placing a product from a third country on the Union market." },
  { no: "3.8", tr: "Etiketleme", en: "Labeling", defTr: "Ürün, ambalaj veya eşlik eden bilgilerde yer alan yazılı, basılı veya grafik bilgiler.", defEn: "Written, printed or graphic information on the product, packaging or accompanying information." },
  { no: "3.9", tr: "Yaşam Döngüsü", en: "Lifecycle", defTr: "Tıbbi cihazın konsept aşamasından imha/son kullanıma kadar tüm aşamalar.", defEn: "All stages from concept through disposal/end of use of a medical device." },
  { no: "3.10", tr: "İmalatçı", en: "Manufacturer", defTr: "Tıbbi cihazı tasarlayan, üreten, sterilize eden, etiketleyen veya kendi adına piyasaya arz eden gerçek veya tüzel kişi.", defEn: "Natural or legal person who designs, manufactures, sterilizes, labels or places a device on the market under their name." },
  { no: "3.11", tr: "Tıbbi Cihaz", en: "Medical Device", defTr: "İnsan için tanı, önleme, izleme, tedavi veya rahatlama amacıyla kullanılan alet, cihaz, yazılım veya malzeme.", defEn: "Instrument, apparatus, software or material intended for diagnosis, prevention, monitoring, treatment or alleviation in humans." },
  { no: "3.12", tr: "Tıbbi Cihaz Grubu", en: "Medical Device Group", defTr: "Aynı üretici tarafından aynı genel amaç için sunulan cihaz ailesi.", defEn: "Family of devices from the same manufacturer for the same general purpose." },
  { no: "3.13", tr: "Performans Değerlendirmesi", en: "Performance Evaluation", defTr: "Klinik ve teknik verilerin analizi ile cihaz performansının değerlendirilmesi.", defEn: "Assessment of device performance through analysis of clinical and technical data." },
  { no: "3.14", tr: "Pazarlama Sonrası Gözetim", en: "Post-Market Surveillance", defTr: "Piyasaya arz sonrası deneyimlerin sistematik toplanması ve analizi.", defEn: "Systematic collection and analysis of experience after placing on the market." },
  { no: "3.15", tr: "Ürün", en: "Product", defTr: "Üretim, satış veya dağıtım için hazırlanan tıbbi cihaz veya aksesuar.", defEn: "Medical device or accessory prepared for manufacture, sale or distribution." },
  { no: "3.16", tr: "Satın Alınan Ürün", en: "Purchased Product", defTr: "Dış tedarikçiden alınan malzeme, yarı mamul veya hizmet çıktısı.", defEn: "Material, semi-finished product or service output obtained from an external supplier." },
  { no: "3.17", tr: "Risk", en: "Risk", defTr: "Zarar olasılığı ile zarar şiddetinin kombinasyonu.", defEn: "Combination of the probability of harm and the severity of that harm." },
  { no: "3.18", tr: "Risk Yönetimi", en: "Risk Management", defTr: "Risklerin tanımlanması, değerlendirilmesi, kontrol edilmesi ve izlenmesi için sistematik uygulama.", defEn: "Systematic application for identifying, evaluating, controlling and monitoring risks." },
  { no: "3.19", tr: "Steril Bariyer Sistemi", en: "Sterile Barrier System", defTr: "Steriliteyi korumak için tasarlanmış ambalaj sistemi (ISO 11607).", defEn: "Packaging system designed to maintain sterility (ISO 11607)." },
  { no: "3.20", tr: "Steril Tıbbi Cihaz", en: "Sterile Medical Device", defTr: "Üretim sonrası sterilizasyon uygulanmış veya steril koşullarda üretilmiş cihaz.", defEn: "Device sterilized after manufacture or produced under sterile conditions." },
];

export function buildDefinitionsSection(bilingual: boolean): QmManualSection {
  const blocks = TERMS.map((t) => {
    const title = `${t.no} ${t.tr} / ${t.en}`;
    const content = bilingual ? bi(t.defTr, t.defEn) : t.defTr;
    return { title, content };
  });

  const introTr = "Bu bölümde el kitabında kullanılan temel terimler tanımlanmıştır.";
  const introEn = "This section defines key terms used in this manual.";

  return {
    heading: sectionHeading("3.", "TANIMLAR", "DEFINITIONS"),
    content: [
      bilingual ? bi(introTr, introEn) : introTr,
      ...blocks.map((b) => `### ${b.title}\n\n${b.content}`),
    ].join("\n\n"),
  };
}
