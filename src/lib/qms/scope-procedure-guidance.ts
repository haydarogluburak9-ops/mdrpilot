/** Scope-specific procedure guidance — maps auditor themes to KYS procedure content. */

import { isBooleanTrue } from "@/lib/wizards/quality-manual/steps";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Wizard intake serialized for QMS AI context (generic — any company). */
export function buildWizardQmsContext(
  answers: Record<string, unknown>,
  locale: "tr" | "en",
): string {
  const lines: string[] = [];
  const push = (label: string, key: string) => {
    const v = str(answers[key]);
    if (v) lines.push(`${label}: ${v}`);
  };

  if (locale === "tr") {
    push("Yasal unvan", "companyLegalName");
    push("Kapsam beyanı", "scopeStatement");
    push("KYS kapsamı", "qmsScope");
    push("Sahalar", "sites");
    push("Ürün grupları", "productGroups");
    push("Dış kaynaklı süreçler", "outsourcedProcesses");
    push("Pazarlar", "regulatoryMarkets");
    push("Geçerli standartlar", "applicableStandards");
    if (isBooleanTrue(answers.distributionOnly)) lines.push("Mod: yalnızca dağıtım");
    if (isBooleanTrue(answers.designAndDevelopmentIncluded)) lines.push("Mod: tasarım ve geliştirme dahil");
    if (isBooleanTrue(answers.sterileProductsIncluded)) lines.push("Mod: steril ürünler dahil");
    if (isBooleanTrue(answers.softwareIncluded)) lines.push("Mod: yazılım dahil");
    push("Sterilizasyon yöntemi", "sterilizationMethod");
  } else {
    push("Legal name", "companyLegalName");
    push("Scope statement", "scopeStatement");
    push("QMS scope", "qmsScope");
    push("Sites", "sites");
    push("Product groups", "productGroups");
    push("Outsourced processes", "outsourcedProcesses");
    push("Markets", "regulatoryMarkets");
    push("Applicable standards", "applicableStandards");
    if (isBooleanTrue(answers.distributionOnly)) lines.push("Mode: distribution only");
    if (isBooleanTrue(answers.designAndDevelopmentIncluded)) lines.push("Mode: design & development included");
    if (isBooleanTrue(answers.sterileProductsIncluded)) lines.push("Mode: sterile products included");
    if (isBooleanTrue(answers.softwareIncluded)) lines.push("Mode: software included");
    push("Sterilization method", "sterilizationMethod");
  }
  return lines.join("\n");
}

/** Per-code guidance aligned to common auditor expectations (not company-specific). */
export function procedureScopeGuidance(
  code: string,
  answers: Record<string, unknown>,
  locale: "tr" | "en",
): string | null {
  const sterile = isBooleanTrue(answers.sterileProductsIncluded);
  const multiSite = str(answers.sites).includes("\n") || str(answers.sites).split(/[,;]/).length > 1;
  const outsourced = Boolean(str(answers.outsourcedProcesses));

  const guides: Record<string, { tr: string; en: string }> = {
    "SOP-VG": {
      tr: [
        "Vigilance ve regülasyon bölümünde EN ISO 13485:2016+A11:2021 harmonizasyon atfı ile MDR uyum varsayımı sınırlarını netleştir.",
        "TİTCK bildirim eşikleri ve zaman çizelgelerini MDR ile bağla.",
        "Annex ZA/ZZ uyum matrisine atıf bırak; teknik dosya ve Uygunluk Beyanı tutarlılığını belirt.",
      ].join("\n"),
      en: [
        "Clarify EN ISO 13485:2016+A11:2021 harmonization reference and limits of MDR presumption of conformity.",
        "Link TİTCK notification thresholds and timelines to MDR requirements.",
        "Reference Annex ZA/ZZ compliance matrix; align with technical file and Declaration of Conformity.",
      ].join("\n"),
    },
    "SOP-ST": {
      tr: sterile
        ? "Steril tek kullanımlık ürünler: proses validasyonu, SAL hedefleri, biyolojik yük ve sterilite testleri, yetkilendirilmiş serbest bırakma (7.5.5/7.5.7), harici sterilizasyon tedarikçi kontrolü ve çevresel izleme — ürün ailesi bazında."
        : "Sterilizasyon kontrollerini ISO 13485 7.5.7 ile uyumlu tanımla.",
      en: sterile
        ? "Sterile single-use: process validation, SAL targets, bioburden/sterility tests, authorized release (7.5.5/7.5.7), external sterilizer control and environmental monitoring by product family."
        : "Define sterilization controls per ISO 13485 7.5.7.",
    },
    "SOP-CLN": {
      tr: "Temiz oda / steril ortam gereklilikleri, izleme ve validasyon kayıtları.",
      en: "Cleanroom/controlled environment requirements, monitoring and validation records.",
    },
    "SOP-FB": {
      tr: [
        "PMS çıktıları: sınıfa göre PMSR/PSUR ayrımı ve PMCF gerekçesi.",
        "Trend raporlama kriterleri ve şikâyet/PMS sinyal değerlendirmesi.",
        "PMS verilerinin risk yönetimi (ISO 14971) ve CAPA ile bağlantısı.",
      ].join("\n"),
      en: [
        "PMS outputs: PMSR vs PSUR by class and PMCF justification.",
        "Trend reporting criteria and complaint/PMS signal evaluation.",
        "Link PMS data to risk management (ISO 14971) and CAPA.",
      ].join("\n"),
    },
    "SOP-AN": {
      tr: "Geri çağırma / FSCA eşikleri, MDR ve TİTCK zaman çizelgeleri.",
      en: "Recall/FSCA thresholds, MDR and TİTCK timelines.",
    },
    "SOP-TR": {
      tr: "UDI tahsisi ve etiketleme (ISO 13485 7.5.9.2, MDR Ek VI); EUDAMED/ÜTS veri yüklemeleri; lot/seri dağıtım kayıt derinliği; aksesuar/implant ayrımı.",
      en: "UDI assignment and labeling (ISO 13485 7.5.9.2, MDR Annex VI); EUDAMED/ÜTS uploads; lot/serial distribution records; accessory vs implant distinction.",
    },
    "SOP-ID": {
      tr: "Ürün tanımlama ve izlenebilirlik; UDI ile uyumlu tanımlama kayıtları.",
      en: "Product identification and traceability aligned with UDI records.",
    },
    "SOP-SE": {
      tr: (multiSite || outsourced)
        ? "Dış kaynaklı süreçler (sterilizasyon, depolama, dağıtım) 4.1.5 ve 7.4 kapsamında kontrol planları; çoklu saha tedarikçi değerlendirmesi."
        : "Tedarikçi değerlendirme ve dış kaynaklı süreç kontrolü (7.4).",
      en: (multiSite || outsourced)
        ? "Outsourced processes (sterilization, storage, distribution) under 4.1.5 and 7.4 control plans; multi-site supplier evaluation."
        : "Supplier evaluation and outsourced process control (7.4).",
    },
    "SOP-PC": {
      tr: multiSite
        ? "Çoklu saha: imalatçı (legal manufacturer) adresi ile üretim sahası; etiket, teknik dosya ve belgelendirme kapsam beyanı tutarlılığı."
        : "Üretim kontrol adımları ve serbest bırakma.",
      en: multiSite
        ? "Multi-site: legal manufacturer vs production site; consistency with label, technical file and certification scope."
        : "Production control steps and release.",
    },
  };

  const g = guides[code];
  if (!g) return null;
  return locale === "tr" ? g.tr : g.en;
}

/** Codes that should be auto-generated from wizard scope when content is empty. */
export function resolveScopeAutoApplyCodes(
  answers: Record<string, unknown>,
  emptyCodes: Set<string>,
): string[] {
  const sterile = isBooleanTrue(answers.sterileProductsIncluded);
  const multiSite = str(answers.sites).includes("\n") || str(answers.sites).split(/[,;]/).length > 1;
  const outsourced = Boolean(str(answers.outsourcedProcesses));

  const wanted = new Set<string>([
    "SOP-VG",
    "SOP-FB",
    "SOP-AN",
    "SOP-TR",
    "SOP-ID",
  ]);
  if (sterile) wanted.add("SOP-ST").add("SOP-CLN");
  if (multiSite || outsourced) wanted.add("SOP-SE").add("SOP-PC");

  return [...wanted].filter((c) => emptyCodes.has(c));
}
