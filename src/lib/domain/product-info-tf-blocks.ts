/**
 * Product-agnostic content blocks for the first four MDR Annex II technical-file
 * sections (device-description, general-info, previous-generations, info-supplied).
 * Filled from product + company dossier data — not product-category specific.
 */
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import { flattenDeclarationModels, brandListFromVariants } from "@/lib/exports/declaration-models";
import { sterilizationText } from "@/lib/domain/sterilization";

const L = (locale: string, en: string, tr: string) => (locale === "tr" ? tr : en);
const TBC = (locale: string) => L(locale, "[TO BE CONFIRMED]", "[TEYİT EDİLECEK]");

export interface TfBlockCompany {
  name: string;
  legalName?: string | null;
  address?: string | null;
  country?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  manufacturingSites?: string | null;
  authorizedRep?: string | null;
  srnNumber?: string | null;
  notifiedBody?: string | null;
  notifiedBodyNumber?: string | null;
}

export interface TfBlockProduct {
  name: string;
  brand?: string | null;
  model?: string | null;
  variantsJson?: unknown;
  deviceClass: string;
  basicUdiDi?: string | null;
  udiDi?: string | null;
  emdnCode?: string | null;
  eudamedDeviceId?: string | null;
  eudamedRegistrationStatus?: string | null;
  intendedPurpose?: string | null;
  userProfile?: string | null;
  patientPopulation?: string | null;
  indications?: string | null;
  contraindications?: string | null;
  bodyContactDuration?: string | null;
  materials?: string | null;
  packagingType?: string | null;
  shelfLife?: string | null;
  manufacturingProcess?: string | null;
  criticalSuppliers?: string | null;
  appliedStandards?: string | null;
  isSterile: boolean;
  sterilization?: string | null;
  isInvasive: boolean;
  containsSoftware: boolean;
  isReusable: boolean;
  containsNanomaterial: boolean;
  containsCmrOrEndocrine: boolean;
  containsMedicinalSubstance: boolean;
  containsBiologicalMaterial: boolean;
  isImplantable: boolean;
  company?: TfBlockCompany | null;
}

function cls(p: TfBlockProduct): string {
  return (DEVICE_CLASS_LABEL as Record<string, string>)[p.deviceClass] ?? p.deviceClass;
}

function fact(locale: string, labelEn: string, labelTr: string, value: string | null | undefined): string {
  const v = value?.trim();
  if (!v) return `${L(locale, labelEn, labelTr)}: ${TBC(locale)}`;
  return `${L(locale, labelEn, labelTr)}: ${v}`;
}

function modelTable(p: TfBlockProduct, locale: string): string {
  const rows = flattenDeclarationModels(p.name, p.variantsJson, p.emdnCode, p.model, p.brand);
  if (!rows.length) return `- ${TBC(locale)}`;
  return rows
    .map(
      (r) =>
        `${r.orderNo}. ${r.modelName} · UDI-DI: ${p.udiDi?.trim() || TBC(locale)} · EMDN: ${r.emdnCode} · ${L(locale, "Sterilization", "Sterilizasyon")}: ${r.sterilization}`,
    )
    .join("\n");
}

function ster(p: TfBlockProduct, locale: string): string {
  if (!p.isSterile) return L(locale, "Non-sterile", "Steril değil");
  return sterilizationText({ isSterile: p.isSterile, sterilization: p.sterilization, variantsJson: p.variantsJson }) || p.sterilization || TBC(locale);
}

function blockDeviceDescription(heading: string, p: TfBlockProduct, locale: string): string | null {
  const h = heading.toLowerCase();

  if (/device name|kullanım amacı|cihaz adı/i.test(h)) {
    return [
      fact(locale, "Product / device name", "Ürün / cihaz adı", p.name),
      fact(locale, "Trade name(s)", "Ticari isim(ler)", brandListFromVariants(p.variantsJson, p.brand) || p.brand),
      fact(locale, "Intended purpose", "Kullanım amacı", p.intendedPurpose),
    ].join("\n");
  }
  if (/description.*variant|tanımı.*varyant|ölçü|dimension/i.test(h)) {
    return [
      fact(locale, "General description", "Genel tanım", p.intendedPurpose || p.materials),
      fact(locale, "Materials / composition", "Malzeme / bileşim", p.materials),
      fact(locale, "Packaging / dimensions", "Ambalaj / boyutlar", p.packagingType),
      L(
        locale,
        "Detailed model list and packaging variants are documented under Product variants.",
        "Ayrıntılı model listesi ve ambalaj varyantları «Ürün varyantları» altında belgelenir.",
      ),
    ].join("\n");
  }
  if (/variant|konfigürasyon|configuration/i.test(h)) {
    return [
      L(locale, "Product variants / configurations:", "Ürün varyantları / konfigürasyonları:"),
      modelTable(p, locale),
      L(
        locale,
        "Variant differences shall not adversely affect safety or performance when sharing the same intended purpose and risk profile.",
        "Varyant farklılıkları aynı kullanım amacı ve risk profilini paylaştığında güvenlik veya performansı olumsuz etkilememelidir.",
      ),
    ].join("\n");
  }
  if (/intended user|hedef kullanıcı|patient population|hasta popülasyonu/i.test(h)) {
    return [
      fact(locale, "Intended users", "Hedef kullanıcılar", p.userProfile),
      fact(locale, "Patient population", "Hasta popülasyonu", p.patientPopulation),
    ].join("\n");
  }
  if (/patient selection|hasta seçim/i.test(h)) {
    return [
      p.patientPopulation?.trim() || TBC(locale),
      p.contraindications?.trim()
        ? L(locale, "See contraindications for exclusion criteria.", "Hariç tutma için kontrendikasyonlara bakınız.")
        : L(locale, "Selection criteria to be confirmed by clinical evaluation.", "Seçim kriterleri klinik değerlendirme ile teyit edilecektir."),
    ].join("\n");
  }
  if (/principle|prensip|mechanism|mekanizma/i.test(h)) {
    return [
      fact(locale, "Principle of operation", "Çalışma prensibi", p.manufacturingProcess || p.intendedPurpose),
      L(
        locale,
        "Mechanism of action shall be described in relation to the intended therapeutic or technical effect. Confirm with design input / IFU.",
        "Etki mekanizması, amaçlanan terapötik veya teknik etki ile ilişkilendirilerek tanımlanmalıdır. Tasarım girdisi / KT ile teyit edin.",
      ),
    ].join("\n");
  }
  if (/qualification|nitelendirme|medical device as/i.test(h)) {
    return L(
      locale,
      `Per MDR Article 2(1), ${p.name} is placed on the market as a medical device because it serves a medical purpose related to: ${p.intendedPurpose?.trim() || TBC(locale)}. Final legal qualification is confirmed by the PRRC.`,
      `MDR Madde 2(1) uyarınca ${p.name}, şu tıbbi amaca hizmet ettiği için tıbbi cihaz olarak piyasaya sunulur: ${p.intendedPurpose?.trim() || TBC(locale)}. Nihai hukuki nitelendirme PRRC tarafından onaylanır.`,
    );
  }
  if (/indication|kontrendikasyon|contraindication/i.test(h)) {
    return [
      fact(locale, "Indications", "Endikasyonlar", p.indications),
      fact(locale, "Contraindications", "Kontrendikasyonlar", p.contraindications),
    ].join("\n");
  }
  if (/warning|uyarı|precaution|önlem|side effect|yan etki/i.test(h)) {
    return [
      L(locale, "Warnings and precautions are aligned with the risk management file and IFU (Annex II section 2).", "Uyarılar ve önlemler risk yönetimi dosyası ve KT (Ek II bölüm 2) ile uyumludur."),
      p.contraindications?.trim()
        ? `${L(locale, "Key contraindications", "Temel kontrendikasyonlar")}: ${p.contraindications.trim()}`
        : "",
      L(locale, "Undesirable effects / side effects: document from clinical evaluation and PMS.", "İstenmeyen etkiler / yan etkiler: klinik değerlendirme ve PMS'ten belgelenir."),
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (/clinical benefit|klinik fayda/i.test(h)) {
    return L(
      locale,
      `Expected clinical benefit supports the stated intended purpose: ${p.intendedPurpose?.trim() || TBC(locale)}. Detailed benefit-risk is in the clinical evaluation report.`,
      `Beklenen klinik fayda, tanımlanan kullanım amacını destekler: ${p.intendedPurpose?.trim() || TBC(locale)}. Ayrıntılı fayda-risk Klinik Değerlendirme Raporu'ndadır.`,
    );
  }
  if (/technical spec|teknik özellik|performance|performans/i.test(h)) {
    return [
      fact(locale, "Applied standards (summary)", "Uygulanan standartlar (özet)", p.appliedStandards),
      fact(locale, "Materials", "Malzemeler", p.materials),
      L(
        locale,
        "Quantitative performance parameters and test results: see Verification & Validation section and linked test reports.",
        "Nicel performans parametreleri ve test sonuçları: Doğrulama & Validasyon bölümü ve bağlı test raporlarına bakınız.",
      ),
    ].join("\n");
  }
  if (/biocompat|biyouyumluluk|body contact|vücut teması/i.test(h)) {
    return [
      fact(locale, "Body contact type / duration", "Vücut teması türü / süresi", p.bodyContactDuration),
      fact(locale, "Patient-contacting materials", "Hasta ile temas eden malzemeler", p.materials),
      L(
        locale,
        "Biological evaluation per ISO 10993 series; full report in Biocompatibility section.",
        "ISO 10993 serisine göre biyolojik değerlendirme; tam rapor Biyouyumluluk bölümündedir.",
      ),
    ].join("\n");
  }
  if (/shelf|raf ömrü|storage|saklama/i.test(h)) {
    return [
      fact(locale, "Shelf life", "Raf ömrü", p.shelfLife),
      L(
        locale,
        "Storage conditions: store per label and IFU; protect sterile barrier until use.",
        "Saklama koşulları: etiket ve KT'ye uygun saklayın; kullanıma kadar steril bariyeri koruyun.",
      ),
    ].join("\n");
  }
  if (/accessor|aksesuar|combination|birlikte kullan/i.test(h)) {
    return L(
      locale,
      "Accessories and devices intended for use in combination: document in design input or state «none» with justification.",
      "Birlikte kullanılması amaçlanan aksesuarlar ve cihazlar: tasarım girdisinde belgelenir veya gerekçeli «yok» denir.",
    );
  }
  if (/software|yazılım/i.test(h)) {
    return p.containsSoftware
      ? L(locale, "Device contains software — see Software Validation section (IEC 62304).", "Cihaz yazılım içerir — Yazılım Validasyonu bölümüne bakınız (IEC 62304).")
      : L(locale, "No software as a medical device function in this product.", "Bu üründe tıbbi cihaz yazılımı işlevi yoktur.");
  }
  if (/emdn|mdr code|mdn|mdt/i.test(h)) {
    return [
      fact(locale, "EMDN code", "EMDN kodu", p.emdnCode),
      L(locale, "Additional MDR nomenclature codes (MDN/MDT/MDS): confirm in EUDAMED registration.", "Ek MDR nomenklatür kodları (MDN/MDT/MDS): EUDAMED kaydında teyit edin."),
    ].join("\n");
  }
  if (/classification|sınıflandırma/i.test(h)) {
    const flags: string[] = [];
    if (p.isInvasive) flags.push(L(locale, "invasive", "invaziv"));
    if (p.isImplantable) flags.push(L(locale, "implantable", "implante edilebilir"));
    if (p.containsNanomaterial) flags.push(L(locale, "nanomaterial", "nanomateryal"));
    if (p.isSterile) flags.push(L(locale, "sterile", "steril"));
    return [
      fact(locale, "MDR class", "MDR sınıfı", cls(p)),
      fact(locale, "Sterilization", "Sterilizasyon", ster(p, locale)),
      flags.length ? `${L(locale, "Classification drivers", "Sınıflandırma girdileri")}: ${flags.join(", ")}` : "",
      L(
        locale,
        "Classification rule and rationale per MDR Annex VIII shall be documented with PRRC approval.",
        "MDR Ek VIII sınıflandırma kuralı ve gerekçesi PRRC onayı ile belgelenmelidir.",
      ),
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (/standard|standart/i.test(h) && !/harmon/i.test(h)) {
    return [
      fact(locale, "Applied standards (product level)", "Uygulanan standartlar (ürün düzeyi)", p.appliedStandards),
      L(locale, "Full standards list: see «Standards List» technical-file section.", "Tam standart listesi: «Standartlar Listesi» teknik dosya bölümüne bakınız."),
    ].join("\n");
  }
  return null;
}

function blockGeneralInfo(heading: string, p: TfBlockProduct, locale: string): string | null {
  const c = p.company;
  const h = heading.toLowerCase();

  if (/manufacturer|üretici kimliği|üretici kimlik/i.test(h)) {
    if (!c) return TBC(locale);
    return [
      fact(locale, "Legal manufacturer", "Yasal üretici", c.legalName || c.name),
      fact(locale, "Trade name", "Ticari unvan", c.name),
      fact(locale, "Address", "Adres", c.address),
      fact(locale, "Country", "Ülke", c.country),
      fact(locale, "Phone", "Telefon", c.contactPhone),
      fact(locale, "E-mail", "E-posta", c.contactEmail),
    ].join("\n");
  }
  if (/manufacturing site|üretim sahası|üretim tesisi/i.test(h)) {
    return [
      fact(locale, "Manufacturing site(s)", "Üretim tesisi/tesisleri", c?.manufacturingSites || c?.address),
      fact(locale, "Manufacturing process (summary)", "Üretim süreci (özet)", p.manufacturingProcess),
      fact(locale, "Critical suppliers", "Kritik tedarikçiler", p.criticalSuppliers),
    ].join("\n");
  }
  if (/srn|eudamed/i.test(h)) {
    return [
      fact(locale, "Manufacturer SRN (EUDAMED actor ID)", "Üretici SRN (EUDAMED aktör ID)", c?.srnNumber),
      fact(locale, "EUDAMED device registration status", "EUDAMED cihaz kayıt durumu", p.eudamedRegistrationStatus),
      fact(locale, "EUDAMED device ID", "EUDAMED cihaz ID", p.eudamedDeviceId),
    ].join("\n");
  }
  if (/authorised|authorized|yetkili temsilci/i.test(h)) {
    return c?.authorizedRep?.trim()
      ? fact(locale, "EU Authorised Representative", "AB Yetkili Temsilcisi", c.authorizedRep)
      : L(locale, "Not applicable — manufacturer established in the EU/EEA.", "Uygulanamaz — üretici AB/AEA'da tesis edilmiştir.");
  }
  if (/udi|basic udi/i.test(h)) {
    return [
      fact(locale, "Basic UDI-DI (device family)", "Temel UDI-DI (cihaz ailesi)", p.basicUdiDi),
      fact(locale, "UDI-DI (unit of use)", "UDI-DI (kullanım birimi)", p.udiDi),
      L(locale, "Per-model UDI allocation:", "Model bazlı UDI tahsisi:"),
      modelTable(p, locale),
    ].join("\n");
  }
  if (/ce marking|ce işareti|notified body|onaylanmış kuruluş/i.test(h)) {
    const nb = [c?.notifiedBodyNumber, c?.notifiedBody].filter(Boolean).join(" — ");
    const needsNb = p.deviceClass !== "CLASS_I";
    return [
      L(locale, "CE marking per MDR Annex V.", "CE işareti MDR Ek V uyarınca."),
      needsNb
        ? fact(locale, "Notified Body", "Onaylanmış Kuruluş", nb || TBC(locale))
        : L(locale, "Class I self-certification — NB number not required on label.", "Sınıf I öz beyan — etikette NB numarası gerekmez."),
      fact(locale, "MDR class", "MDR sınıfı", cls(p)),
    ].join("\n");
  }
  if (/conformity assessment|uygunluk değerlendirme/i.test(h)) {
    const route =
      p.deviceClass === "CLASS_I"
        ? L(locale, "Annex IV — Declaration of Conformity (self-certification).", "Ek IV — Uygunluk Beyanı (öz beyan).")
        : L(locale, "Annex IX / XI (or applicable Annex) — NB involvement per device class.", "Ek IX / XI (veya geçerli Ek) — sınıfa göre OK süreci.");
    return route;
  }
  if (/ce certif|belgelendirme geçmişi|history of ce/i.test(h)) {
    return L(
      locale,
      "CE certification history: document initial MDR certification date, NB certificate number and major revisions in the quality system.",
      "CE belgelendirme geçmişi: ilk MDR belgelendirme tarihi, OK sertifika numarası ve önemli revizyonları kalite sisteminde belgelenir.",
    );
  }
  if (/market|piyasaya|countries|ülkeler|bölgeler/i.test(h)) {
    return L(
      locale,
      "Intended markets / EU member states: define in commercial and regulatory strategy; align IFU languages with target countries.",
      "Hedef pazarlar / AB üye devletleri: ticari ve regülatif stratejide tanımlanır; KT dilleri hedef ülkelerle uyumlu olmalıdır.",
    );
  }
  return null;
}

function blockPreviousGenerations(
  heading: string,
  p: TfBlockProduct,
  locale: string,
  equivalentCount: number,
): string | null {
  const h = heading.toLowerCase();

  if (/previous generation|önceki nesil/i.test(h)) {
    return L(
      locale,
      "Document predecessor devices or design generations by the same manufacturer, or state that this is the first generation.",
      "Aynı üreticinin önceki nesil cihazlarını veya tasarım jenerasyonlarını belgeleyin; ilk nesil ise belirtin.",
    );
  }
  if (/similar|equivalent|eşdeğer|benzer/i.test(h)) {
    return equivalentCount > 0
      ? L(
          locale,
          `${equivalentCount} equivalent/similar device(s) defined in Clinical Evaluation — see equivalent devices section and MDCG 2020-5 analysis.`,
          `${equivalentCount} eşdeğer/benzer cihaz Klinik Değerlendirme'de tanımlı — eşdeğer cihazlar bölümü ve MDCG 2020-5 analizine bakınız.`,
        )
      : L(
          locale,
          "No equivalence claim at this stage, or to be defined in clinical evaluation.",
          "Bu aşamada eşdeğerlik iddiası yok veya klinik değerlendirmede tanımlanacak.",
        );
  }
  if (/evolution|evrim|design and material/i.test(h)) {
    return L(
      locale,
      "Summarise design and material changes versus previous generations; link to change control records.",
      "Önceki nesillere göre tasarım ve malzeme değişikliklerini özetleyin; değişiklik kontrol kayıtlarına bağlayın.",
    );
  }
  if (/lesson|saha|field experience|dersler/i.test(h)) {
    return L(
      locale,
      "Lessons learned from previous generations and field experience feed risk management and PMS.",
      "Önceki nesillerden ve saha deneyiminden alınan dersler risk yönetimi ve PMS'e girdi oluşturur.",
    );
  }
  if (/family|aile|variant rationale|varyant gerekçe/i.test(h)) {
    const brands = brandListFromVariants(p.variantsJson, p.brand);
    return [
      brands ? fact(locale, "Device family / brands", "Cihaz ailesi / markalar", brands) : "",
      L(
        locale,
        "Variants sharing intended purpose, risk profile and core design may be covered under one technical file with documented rationale.",
        "Aynı kullanım amacı, risk profili ve temel tasarımı paylaşan varyantlar, belgelenmiş gerekçe ile tek teknik dosyada kapsanabilir.",
      ),
    ]
      .filter(Boolean)
      .join("\n");
  }
  return null;
}

function blockInfoSupplied(
  heading: string,
  p: TfBlockProduct,
  locale: string,
  symbolLines: string[],
): string | null {
  const h = heading.toLowerCase();

  if (/^label$|etiket/i.test(h) && !/marking/i.test(h)) {
    return L(
      locale,
      "Label content per MDR Annex I Ch. III and ISO 15223-1. Generate label PDF from MDRpilot Label export.",
      "Etiket içeriği MDR Ek I Bölüm III ve ISO 15223-1 uyarınca. Etiket PDF'i MDRpilot Etiket dışa aktarımından üretilir.",
    );
  }
  if (/instructions for use|kullanım talimat|ifu|kt\b/i.test(h)) {
    return L(
      locale,
      "IFU per MDR Annex I 23.4. Generate IFU DOCX from MDRpilot (product tab → IFU). Sections include warnings, biocompatibility, disposal, incident reporting and troubleshooting.",
      "KT MDR Ek I 23.4 uyarınca. MDRpilot'tan KT DOCX üretin (ürün sekmesi → KT). Uyarılar, biyouyumluluk, bertaraf, olay bildirimi ve sorun giderme bölümlerini içerir.",
    );
  }
  if (/symbol|sembol/i.test(h)) {
    return symbolLines.length ? symbolLines.map((l) => `- ${l}`).join("\n") : `- ${TBC(locale)}`;
  }
  if (/mdr annex|ek i|regulatory decl|düzenleyici beyan/i.test(h)) {
    const lines = [
      L(locale, "Per MDR Annex I GSPR:", "MDR Ek I GSPR kapsamında:"),
      L(locale, "• Does not incorporate medicinal substance, blood or human tissue.", "• İlaç, kan veya insan dokusu içermez."),
      p.containsMedicinalSubstance
        ? L(locale, "• Contains medicinal substance — document per GSPR 12.1.", "• Tıbbi madde içerir — GSPR 12.1 uyarınca belgelenir.")
        : "",
      p.containsBiologicalMaterial
        ? L(locale, "• Contains biological material — document per GSPR 13.1.", "• Biyolojik materyal içerir — GSPR 13.1 uyarınca belgelenir.")
        : "",
      p.containsCmrOrEndocrine
        ? L(locale, "• CMR/endocrine-disrupting substances — risk assessment required.", "• CMR/endokrin bozucu maddeler — risk değerlendirmesi gerekir.")
        : L(locale, "• Declared free of phthalates and CMR substances [confirm from technical file].", "• Ftalat ve CMR maddeler içermediği beyan edilir [teknik dosyadan teyit]."),
    ];
    return lines.filter(Boolean).join("\n");
  }
  if (/incident|olay bildirim|vigilans/i.test(h)) {
    const mfr = p.company?.legalName || p.company?.name || TBC(locale);
    const email = p.company?.contactEmail?.trim();
    return L(
      locale,
      `Serious incidents per MDR Article 87: report to ${mfr}${email ? ` (${email})` : ""} and the competent authority of the member state.`,
      `MDR Madde 87 kapsamında ciddi olaylar: ${mfr}${email ? ` (${email})` : ""} ve üye devlet yetkili otoritesine bildirilir.`,
    );
  }
  if (/disposal|bertaraf|waste|atık/i.test(h)) {
    return [
      p.isInvasive
        ? L(locale, "Dispose as medical/sharps waste per local regulations.", "Yerel mevzuata göre tıbbi/kesici atık olarak bertaraf edin.")
        : L(locale, "Dispose per local medical waste and environmental regulations.", "Yerel tıbbi atık ve çevre mevzuatına göre bertaraf edin."),
      L(locale, "Separate contaminated product waste from recyclable packaging where applicable.", "Uygun olduğunda kontamine ürün atığını geri dönüştürülebilir ambalajdan ayırın."),
    ].join("\n");
  }
  if (/troubleshoot|sorun giderme/i.test(h)) {
    return L(
      locale,
      "Troubleshooting: see IFU section 14. Common checks: packaging integrity, expiry date, device damage, unexpected clinical outcome → stop use and report.",
      "Sorun giderme: KT bölüm 14'e bakınız. Yaygın kontroller: ambalaj bütünlüğü, SKT, cihaz hasarı, beklenmeyen klinik sonuç → kullanımı durdurun ve bildirin.",
    );
  }
  if (/packaging|ambalaj|marking|markalama/i.test(h)) {
    return [
      fact(locale, "Packaging type", "Ambalaj tipi", p.packagingType),
      fact(locale, "Sterility", "Sterilite", ster(p, locale)),
      L(locale, "Product marking via label on primary packaging.", "Birincil ambalaj etiketi ile ürün markalaması."),
    ].join("\n");
  }
  if (/language|dil/i.test(h)) {
    return L(
      locale,
      "IFU and label languages shall match intended market countries. MDRpilot supports export in multiple languages (one language per file).",
      "KT ve etiket dilleri hedef pazar ülkeleriyle uyumlu olmalıdır. MDRpilot çoklu dilde dışa aktarım destekler (dosya başına bir dil).",
    );
  }
  if (/retention|saklama süresi|technical doc/i.test(h)) {
    return L(
      locale,
      "Technical documentation retention: minimum 10 years after last device placed on market (15 years for implantable devices) per MDR Article 10(8).",
      "Teknik dokümantasyon saklama: MDR Madde 10(8) uyarınca son cihaz piyasaya arzından sonra en az 10 yıl (implante edilebilir için 15 yıl).",
    );
  }
  return null;
}

/** Resolve auto-filled markdown body for a TF subsection heading (no ## prefix). */
export function resolveTfSectionBlock(
  sectionKey: string,
  heading: string,
  product: TfBlockProduct,
  locale: string,
  options: { symbolLines?: string[]; equivalentDeviceCount?: number } = {},
): string | null {
  const symbolLines = options.symbolLines ?? [];
  const equivalentCount = options.equivalentDeviceCount ?? 0;

  switch (sectionKey) {
    case "device-description":
      return blockDeviceDescription(heading, product, locale);
    case "general-info":
      return blockGeneralInfo(heading, product, locale);
    case "previous-generations":
      return blockPreviousGenerations(heading, product, locale, equivalentCount);
    case "info-supplied":
      return blockInfoSupplied(heading, product, locale, symbolLines);
    default:
      return null;
  }
}
