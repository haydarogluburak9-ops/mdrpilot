import "server-only";
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import { describeSymbols } from "@/lib/domain/iso15223-symbols";
import { flattenDeclarationModels } from "./declaration-models";
import type { ExportContext } from "./types";

export interface IfuContentOverride {
  productDescription?: string;
  technicalSpecifications?: string;
  intendedPurpose?: string;
  intendedUsers?: string;
  patientPopulation?: string;
  clinicalBenefits?: string;
  indications?: string;
  contraindications?: string;
  warnings?: string[];
  precautions?: string[];
  instructions?: string;
  biocompatibility?: string;
  storage?: string;
  shelfLifeDetail?: string;
  sterilityInfo?: string;
  disposal?: string;
  wasteSeparation?: string;
  mdrAnnexIDeclaration?: string;
  incidentReporting?: string;
  troubleshooting?: string[];
  symbolsGlossary?: string[];
  regulatoryInfo?: string;
  revisionHistory?: string;
}

export interface IfuContentBlock {
  productDescription: string;
  technicalSpecifications: string;
  intendedPurpose: string;
  intendedUsers: string;
  patientPopulation: string;
  clinicalBenefits: string;
  indications: string;
  contraindications: string;
  warnings: string[];
  precautions: string[];
  instructions: string;
  biocompatibility: string;
  storage: string;
  shelfLifeDetail: string;
  sterilityInfo: string;
  disposal: string;
  wasteSeparation: string;
  mdrAnnexIDeclaration: string;
  incidentReporting: string;
  troubleshooting: string[];
  symbolsGlossary: string[];
  regulatoryInfo: string;
  revisionHistory: string;
  deviceDescription: string;
  modelList: string;
}

const STER_TR: Record<string, string> = {
  EO: "Etilen oksit (EO)",
  GAMMA: "Gama radyasyonu",
  STEAM: "Buhar",
  OTHER: "Diğer",
  NON_STERILE: "Steril değil",
};

function classTr(code: string): string {
  return (DEVICE_CLASS_LABEL as Record<string, string>)[code] ?? code;
}

function riskWarnings(ctx: ExportContext): string[] {
  const p = ctx.product;
  if (!p) return [];
  return p.riskItems
    .filter((r) => r.initialRiskLevel === "HIGH" || r.initialRiskLevel === "CRITICAL")
    .map((r) => {
      const harm = r.harm?.trim() || r.hazard;
      const control = r.riskControlMeasure?.trim();
      return control ? `${harm} — ${control}` : harm;
    });
}

function defaultWarnings(ctx: ExportContext, tr: boolean): string[] {
  const p = ctx.product!;
  const fromRisk = riskWarnings(ctx);
  const items = new Set<string>(fromRisk);

  items.add(tr ? "Kullanmadan önce bu kullanma kılavuzunu tamamen okuyunuz." : "Read this IFU in full before use.");
  if (p.isSterile) {
    items.add(tr ? "Ambalaj hasarlı veya açılmışsa kullanmayın." : "Do not use if packaging is damaged or open.");
  }
  if (!p.isReusable) {
    items.add(tr ? "Tek kullanımlıktır; yeniden kullanmayın veya yeniden sterilize etmeyin." : "Single use — do not reuse or re-sterilize.");
  }
  if (p.isInvasive) {
    items.add(tr ? "Yalnızca eğitimli sağlık personeli tarafından kullanılmalıdır." : "For use by trained healthcare professionals only.");
  }
  if (p.containsSoftware) {
    items.add(tr ? "Yazılım güncellemeleri klinik güvenliği etkileyebilir; yalnızca üretici onaylı sürümleri kullanın." : "Software updates may affect clinical safety; use only manufacturer-approved versions.");
  }
  if (p.hasMeasuringFn) {
    items.add(tr ? "Ölçüm fonksiyonu kalibrasyon dışı kullanımda hatalı sonuç verebilir." : "Measuring function may give incorrect results if used outside calibration.");
  }
  if (/reçine|resin|akril|methacryl|monomer/i.test(p.materials ?? "")) {
    items.add(
      tr
        ? "Kürlenmemiş reçine cilt ve göz tahrişine yol açabilir; doğrudan temastan kaçının."
        : "Uncured resin may cause skin and eye irritation; avoid direct contact.",
    );
  }
  if (p.contraindications?.trim()) {
    items.add(
      tr
        ? `Kontrendikasyonlar bölümünde listelenen durumlarda kullanmayınız.`
        : `Do not use in situations listed under contraindications.`,
    );
  }
  return [...items];
}

function defaultPrecautions(ctx: ExportContext, tr: boolean): string[] {
  const p = ctx.product!;
  const items: string[] = [
    tr ? "Kullanmadan önce ambalaj bütünlüğünü ve son kullanma tarihini kontrol edin." : "Check package integrity and expiry before use.",
    tr ? "Kişisel koruyucu ekipman (eldiven, gözlük, önlük) kullanın." : "Use personal protective equipment (gloves, goggles, apron).",
    tr ? "Yalnızca tanımlanan kullanıcı profiline uygun şekilde kullanın." : "Use only in line with the defined user profile.",
  ];
  if (p.isSterile) {
    items.push(tr ? "Steril bariyer hasarlıysa kullanmayın." : "Do not use if the sterile barrier is compromised.");
  }
  if (p.hasMeasuringFn) {
    items.push(tr ? "Ölçüm fonksiyonunu kullanmadan önce kalibrasyon durumunu doğrulayın." : "Verify calibration before using the measuring function.");
  }
  if (p.containsSoftware) {
    items.push(tr ? "Yazılım güncellemelerini üretici talimatlarına uygun uygulayın." : "Apply software updates per manufacturer instructions.");
  }
  if (/reçine|resin|akril|methacryl/i.test(p.materials ?? "")) {
    items.push(
      tr
        ? "İyi havalandırılmış ortamda çalışın; gün ışığından ve UV kaynaklarından koruyun."
        : "Work in a well-ventilated area; protect from daylight and UV sources.",
    );
  }
  if (p.userProfile?.trim()) {
    items.push(tr ? `Hedef kullanıcı: ${p.userProfile.trim()}` : `Intended user: ${p.userProfile.trim()}`);
  }
  return items;
}

function defaultInstructions(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  const parts: string[] = [];
  if (tr) {
    parts.push(`${p.name} yalnızca tanımlanan kullanım amacı ve endikasyonlar için kullanılmalıdır.`);
    if (p.isSterile) parts.push("Aseptik tekniğe uygun olarak açın ve uygulayın.");
    if (p.materials?.trim()) parts.push(`Malzeme/bileşen: ${p.materials.trim()}.`);
    parts.push("Uygulama öncesi cihazı/malzemeyi görsel olarak kontrol edin.");
    parts.push("Uygulama sonrası atıkları bertaraf bölümüne uygun şekilde imha edin.");
    parts.push("Sorun giderme bölümüne bakınız.");
  } else {
    parts.push(`Use ${p.name} only for the stated intended purpose and indications.`);
    if (p.isSterile) parts.push("Open and apply using aseptic technique.");
    if (p.materials?.trim()) parts.push(`Material/composition: ${p.materials.trim()}.`);
    parts.push("Inspect the device/material visually before application.");
    parts.push("Dispose of waste per the disposal section after use.");
    parts.push("Refer to the troubleshooting section if problems occur.");
  }
  return parts.join(" ");
}

function defaultStorage(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  const parts: string[] = [];
  if (tr) {
    parts.push("Orijinal ambalajında, kuru ve temiz ortamda saklayın.");
    if (/reçine|resin|akril/i.test(p.materials ?? "")) {
      parts.push("Doğrudan gün ışığından ve UV ışınlarından uzak tutun.");
      parts.push("Çalışma sıcaklığı: üretici spesifikasyonuna uygun (tipik 5–28 °C).");
    } else {
      parts.push("Sıcaklık: 15–25 °C (ürün spesifikasyonuna göre).");
    }
    parts.push("Nem ve tozdan koruyun.");
  } else {
    parts.push("Store in original packaging in a dry, clean place.");
    if (/reçine|resin|akril/i.test(p.materials ?? "")) {
      parts.push("Keep away from direct daylight and UV radiation.");
      parts.push("Working temperature: per manufacturer specification (typically 5–28 °C).");
    } else {
      parts.push("Temperature: 15–25 °C (per product specification).");
    }
    parts.push("Protect from moisture and dust.");
  }
  return parts.join(" ");
}

function defaultShelfLifeDetail(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  const shelf = p.shelfLife?.trim();
  if (shelf) {
    return tr
      ? `Raf ömrü / son kullanma: ${shelf}. Ambalaj üzerindeki LOT ve son kullanma tarihini kontrol edin.`
      : `Shelf life / expiry: ${shelf}. Check LOT and expiry on the packaging.`;
  }
  return tr
    ? "Raf ömrü ürün etiketinde belirtilir. Son kullanma tarihi geçmiş ürünü kullanmayınız."
    : "Shelf life is stated on the product label. Do not use after the expiry date.";
}

function defaultSterility(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  if (!p.isSterile) {
    return tr
      ? "Ürün steril değildir. Steril uygulama gerekiyorsa uygun sterilizasyon protokolü uygulanmalıdır (teknik dosyaya bakınız)."
      : "Product is non-sterile. If sterile application is required, apply an appropriate sterilization protocol (see technical file).";
  }
  const method = STER_TR[p.sterilization] ?? p.sterilization;
  if (tr) {
    return `Ürün ${method} ile sterilize edilmiştir. Steril bariyer açılana kadar sterilite korunur. Tek kullanımlıktır.`;
  }
  return `Product is sterilized by ${p.sterilization}. Sterility is maintained until the sterile barrier is opened. Single use.`;
}

function defaultDisposal(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  if (tr) {
    if (p.isInvasive) {
      return "Kullanılmış cihazı kesici/delici atık ve tıbbi atık mevzuatına uygun şekilde bertaraf edin.";
    }
    return "Kullanılmış ürünü yerel tıbbi atık ve çevre mevzuatına uygun olarak bertaraf edin.";
  }
  return p.isInvasive
    ? "Dispose as sharps/medical waste per local regulations."
    : "Dispose according to local medical waste and environmental regulations.";
}

function defaultWasteSeparation(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  if (/reçine|resin|akril|methacryl|monomer/i.test(p.materials ?? "")) {
    return tr
      ? "Tam polimerize (kürlenmiş) reçine atığı genel atık olarak bertaraf edilebilir. Sıvı/kürlenmemiş reçine kimyasal atık olarak toplanmalıdır; yerel düzenlemelere uygun imha edin. MSDS'e bakınız."
      : "Fully polymerized (cured) resin waste may be disposed as general waste. Liquid/uncured resin must be collected as chemical waste and disposed per local regulations. See SDS.";
  }
  if (tr) {
    return "Ambalaj atığı geri dönüşüm kurallarına göre ayrı toplanır. Kontamine tıbbi atık yerel mevzuata göre imha edilir.";
  }
  return "Packaging waste is separated per recycling rules. Contaminated medical waste is disposed per local regulations.";
}

function defaultProductDescription(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  const cls = classTr(p.deviceClass);
  const parts = [
    tr ? `Ticari ad: ${p.name}` : `Trade name: ${p.name}`,
    p.brand?.trim() ? (tr ? `Marka: ${p.brand}` : `Brand: ${p.brand}`) : "",
    p.model?.trim() ? (tr ? `Model: ${p.model}` : `Model: ${p.model}`) : "",
    tr ? `MDR sınıfı: ${cls}` : `MDR class: ${cls}`,
    p.materials?.trim() ? (tr ? `Bileşim / malzeme: ${p.materials}` : `Composition / materials: ${p.materials}`) : "",
    p.packagingType?.trim() ? (tr ? `Ambalaj: ${p.packagingType}` : `Packaging: ${p.packagingType}`) : "",
    p.intendedPurpose?.trim() ? (tr ? `Özet: ${p.intendedPurpose}` : `Summary: ${p.intendedPurpose}`) : "",
  ].filter(Boolean);
  return parts.join("\n");
}

function defaultTechnicalSpecs(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  const lines: string[] = [];
  if (p.materials?.trim()) {
    lines.push(tr ? `Malzeme: ${p.materials}` : `Material: ${p.materials}`);
  }
  if (p.bodyContactDuration) {
    lines.push(tr ? `Vücut teması süresi: ${p.bodyContactDuration}` : `Body contact duration: ${p.bodyContactDuration}`);
  }
  if (p.appliedStandards?.trim()) {
    lines.push(tr ? `Uygulanan standartlar: ${p.appliedStandards}` : `Applied standards: ${p.appliedStandards}`);
  } else {
    lines.push(
      tr
        ? "Performans özellikleri teknik dosya ve ilgili test raporlarında belgelenmiştir [TEYİT EDİLECEK]."
        : "Performance characteristics are documented in the technical file and relevant test reports [TO BE CONFIRMED].",
    );
  }
  if (p.basicUdiDi) lines.push(`UDI-DI (basic): ${p.basicUdiDi}`);
  if (p.udiDi) lines.push(`UDI-DI: ${p.udiDi}`);
  return lines.join("\n");
}

function defaultIntendedUsers(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  if (p.userProfile?.trim()) return p.userProfile.trim();
  return p.isInvasive
    ? tr
      ? "Eğitimli sağlık profesyonelleri (hekim, hemşire, teknisyen)."
      : "Trained healthcare professionals (physician, nurse, technician)."
    : tr
      ? "Yetkili sağlık profesyonelleri veya üretici talimatında belirtilen kullanıcılar."
      : "Authorised healthcare professionals or users specified in manufacturer instructions.";
}

function defaultPatientPopulation(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  if (p.patientPopulation?.trim()) return p.patientPopulation.trim();
  return tr
    ? "Amaçlanan kullanıma uygun hasta popülasyonu; pediatrik, gebelik ve emzirme durumları kontrendikasyonlara bakınız."
    : "Patient population per intended use; see contraindications for paediatric, pregnancy and breastfeeding.";
}

function defaultClinicalBenefits(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  if (p.intendedPurpose?.trim()) {
    return tr
      ? `Beklenen klinik fayda: ${p.intendedPurpose.trim()} ile uyumlu güvenlik ve performans.`
      : `Expected clinical benefit: safety and performance aligned with ${p.intendedPurpose.trim()}.`;
  }
  return tr
    ? "Ürün; amaçlanan kullanımda hasta güvenliği ve klinik performans sağlamayı hedefler."
    : "The product aims to provide patient safety and clinical performance for the intended use.";
}

function defaultBiocompatibility(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  const contact = p.bodyContactDuration?.trim();
  const mats = p.materials?.trim();
  if (tr) {
    return [
      "Biyouyumluluk değerlendirmesi ISO 10993 serisi ve amaçlanan vücut temasına göre yapılmıştır.",
      contact ? `Temas türü/süresi: ${contact}.` : "",
      mats ? `Malzeme: ${mats}.` : "",
      "Biyouyumluluk test raporları teknik dosyada (EK-5) yer alır.",
      p.isInvasive ? "Invaziv kullanımda ilgili temas süresi ve sterilite gereklilikleri geçerlidir." : "",
    ]
      .filter(Boolean)
      .join(" ");
  }
  return [
    "Biocompatibility is assessed per ISO 10993 series and intended body contact.",
    contact ? `Contact type/duration: ${contact}.` : "",
    mats ? `Material: ${mats}.` : "",
    "Biocompatibility test reports are in the technical file (Annex 5).",
    p.isInvasive ? "For invasive use, relevant contact duration and sterility requirements apply." : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function defaultMdrAnnexI(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  if (tr) {
    return [
      "MDR 2017/745 Ek I (GSPR) kapsamında:",
      "• Ürün ilaç, kan veya insan dokusu içermez.",
      "• Ftalat veya CMR (kanserojen, mutajen, üreme toksik) madde içermediği beyan edilir [teknik dosyadan teyit].",
      p.isSterile ? "• Sterilite gereklilikleri sterilizasyon validasyonu ile desteklenir." : "• Ürün steril değildir.",
      p.containsSoftware ? "• Yazılım IEC 62304 yaşam döngüsü gerekliliklerine tabidir." : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    "Per MDR 2017/745 Annex I (GSPRs):",
    "• Product does not incorporate medicinal substance, blood or human tissue.",
    "• Declared free of phthalates and CMR substances [confirm from technical file].",
    p.isSterile ? "• Sterility requirements supported by sterilization validation." : "• Product is non-sterile.",
    p.containsSoftware ? "• Software subject to IEC 62304 lifecycle requirements." : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function defaultIncidentReporting(ctx: ExportContext, tr: boolean): string {
  const c = ctx.company;
  const mfr = c.legalName?.trim() || c.name;
  if (tr) {
    return [
      "Ciddi olaylar MDR Madde 87 ve ilgili ulusal mevzuata göre bildirilmelidir.",
      `Üretici: ${mfr}${c.contactEmail ? ` (${c.contactEmail})` : ""}.`,
      "Ayrıca üye devletin yetkili otoritesine bildirim yapılmalıdır.",
      "Şikayet ve olay kayıtları PMS sistemi üzerinden izlenir.",
    ].join(" ");
  }
  return [
    "Serious incidents must be reported per MDR Article 87 and applicable national law.",
    `Manufacturer: ${mfr}${c.contactEmail ? ` (${c.contactEmail})` : ""}.`,
    "Also report to the competent authority of the member state.",
    "Complaints and incidents are tracked via the PMS system.",
  ].join(" ");
}

function defaultTroubleshooting(ctx: ExportContext, tr: boolean): string[] {
  const p = ctx.product!;
  const items = [
    tr ? "Ambalaj hasarlıysa ürünü kullanmayın; üretici ile iletişime geçin." : "Do not use if packaging is damaged; contact the manufacturer.",
    tr ? "Son kullanma tarihi geçmişse kullanmayın." : "Do not use after expiry date.",
    tr ? "Beklenmeyen klinik sonuç veya advers olayda kullanımı durdurun ve olay bildirimi yapın." : "Stop use and report incidents if unexpected clinical outcomes or adverse events occur.",
  ];
  if (p.containsSoftware) {
    items.push(tr ? "Yazılım hatası şüphesinde güncel sürümü doğrulayın." : "If software error is suspected, verify the current approved version.");
  }
  if (/reçine|resin/i.test(p.materials ?? "")) {
    items.push(
      tr
        ? "Yetersiz kürleme veya yüzey kusuru: kürleme parametrelerini ve ekipman uyumluluğunu kontrol edin."
        : "Insufficient cure or surface defect: check curing parameters and equipment compatibility.",
    );
  }
  return items;
}

function defaultSymbolsGlossary(ctx: ExportContext): string[] {
  const p = ctx.product!;
  return describeSymbols(
    {
      deviceClass: p.deviceClass,
      isSterile: p.isSterile,
      isReusable: p.isReusable,
      shelfLife: p.shelfLife,
      variantsJson: p.variantsJson,
      sterilization: p.sterilization,
      basicUdiDi: p.basicUdiDi,
      udiDi: p.udiDi,
    },
    {
      name: ctx.company.name,
      legalName: ctx.company.legalName,
      address: ctx.company.address,
      notifiedBody: ctx.company.notifiedBody,
      notifiedBodyNumber: ctx.company.notifiedBodyNumber,
    },
    ctx.language,
  );
}

function defaultRegulatoryInfo(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  const c = ctx.company;
  const cls = classTr(p.deviceClass);
  const nb = [c.notifiedBodyNumber, c.notifiedBody].filter(Boolean).join(" — ");
  const needsNb = p.deviceClass !== "CLASS_I";
  if (tr) {
    return [
      `CE işareti taşır — MDR 2017/745 kapsamında sınıf ${cls} tıbbi cihaz.`,
      needsNb ? `Onaylanmış Kuruluş (NB): ${nb || "[TEYİT EDİLECEK]"}.` : "Sınıf I öz beyanlı cihaz — NB numarası uygulanmaz.",
      p.basicUdiDi ? `Temel UDI-DI: ${p.basicUdiDi}` : "",
      p.udiDi ? `UDI-DI: ${p.udiDi}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    `Bears CE marking — Class ${cls} medical device under MDR 2017/745.`,
    needsNb ? `Notified Body (NB): ${nb || "[TO BE CONFIRMED]"}.` : "Self-certified Class I — NB number not applicable.",
    p.basicUdiDi ? `Basic UDI-DI: ${p.basicUdiDi}` : "",
    p.udiDi ? `UDI-DI: ${p.udiDi}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function defaultRevisionHistory(ctx: ExportContext, tr: boolean): string {
  const date = ctx.generatedAt.toISOString().slice(0, 10);
  if (tr) {
    return [
      "| Rev | Tarih | Değişiklik | Hazırlayan |",
      "| --- | --- | --- | --- |",
      `| 01 | ${date} | MDRpilot IFU ilk taslağı | ${ctx.generatedBy} |`,
    ].join("\n");
  }
  return [
    "| Rev | Date | Change | Author |",
    "| --- | --- | --- | --- |",
    `| 01 | ${date} | Initial MDRpilot IFU draft | ${ctx.generatedBy} |`,
  ].join("\n");
}

function deviceDescription(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  const cls = classTr(p.deviceClass);
  const parts = [
    tr ? `Ticari adı: ${p.name}` : `Trade name: ${p.name}`,
    tr ? `Sınıf: ${cls}` : `Class: ${cls}`,
    p.basicUdiDi ? `UDI-DI (temel): ${p.basicUdiDi}` : "",
    p.udiDi ? `UDI-DI: ${p.udiDi}` : "",
    p.packagingType?.trim() ? (tr ? `Ambalaj: ${p.packagingType}` : `Packaging: ${p.packagingType}`) : "",
  ].filter(Boolean);
  return parts.join(tr ? " · " : " · ");
}

export function buildIfuContent(ctx: ExportContext, override?: IfuContentOverride): IfuContentBlock {
  const p = ctx.product!;
  const tr = ctx.language === "tr";
  const models = flattenDeclarationModels(p.name, p.variantsJson, null, p.model, p.brand);
  const modelList = models.map((m) => `${m.orderNo}. ${m.modelName} (${m.sterilization})`).join("\n");

  const warnings = override?.warnings?.length ? override.warnings : defaultWarnings(ctx, tr);
  const precautions = override?.precautions?.length ? override.precautions : defaultPrecautions(ctx, tr);
  const troubleshooting = override?.troubleshooting?.length ? override.troubleshooting : defaultTroubleshooting(ctx, tr);
  const symbolsGlossary = override?.symbolsGlossary?.length ? override.symbolsGlossary : defaultSymbolsGlossary(ctx);

  return {
    productDescription: override?.productDescription?.trim() || defaultProductDescription(ctx, tr),
    technicalSpecifications: override?.technicalSpecifications?.trim() || defaultTechnicalSpecs(ctx, tr),
    intendedPurpose: override?.intendedPurpose?.trim() || p.intendedPurpose?.trim() || (tr ? "Belirtilmemiş — ürün dosyasında tanımlayın." : "Not specified — define in product dossier."),
    intendedUsers: override?.intendedUsers?.trim() || defaultIntendedUsers(ctx, tr),
    patientPopulation: override?.patientPopulation?.trim() || defaultPatientPopulation(ctx, tr),
    clinicalBenefits: override?.clinicalBenefits?.trim() || defaultClinicalBenefits(ctx, tr),
    indications: override?.indications?.trim() || p.indications?.trim() || (tr ? "Ürün dosyasında endikasyonları tanımlayın." : "Define indications in the product dossier."),
    contraindications: override?.contraindications?.trim() || p.contraindications?.trim() || (tr ? "Ürün dosyasında kontrendikasyonları tanımlayın." : "Define contraindications in the product dossier."),
    warnings,
    precautions,
    instructions: override?.instructions?.trim() || defaultInstructions(ctx, tr),
    biocompatibility: override?.biocompatibility?.trim() || defaultBiocompatibility(ctx, tr),
    storage: override?.storage?.trim() || defaultStorage(ctx, tr),
    shelfLifeDetail: override?.shelfLifeDetail?.trim() || defaultShelfLifeDetail(ctx, tr),
    sterilityInfo: override?.sterilityInfo?.trim() || defaultSterility(ctx, tr),
    disposal: override?.disposal?.trim() || defaultDisposal(ctx, tr),
    wasteSeparation: override?.wasteSeparation?.trim() || defaultWasteSeparation(ctx, tr),
    mdrAnnexIDeclaration: override?.mdrAnnexIDeclaration?.trim() || defaultMdrAnnexI(ctx, tr),
    incidentReporting: override?.incidentReporting?.trim() || defaultIncidentReporting(ctx, tr),
    troubleshooting,
    symbolsGlossary,
    regulatoryInfo: override?.regulatoryInfo?.trim() || defaultRegulatoryInfo(ctx, tr),
    revisionHistory: override?.revisionHistory?.trim() || defaultRevisionHistory(ctx, tr),
    deviceDescription: deviceDescription(ctx, tr),
    modelList,
  };
}
