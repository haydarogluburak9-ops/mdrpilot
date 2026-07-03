import { formatRiskFormRef } from "./risk-management-templates";
import { sterilizationText } from "./sterilization";
import type { RiskItem } from "./types";

export function buildRuleBasedFmeaBenefitRisk(
  product: {
    name: string;
    intendedPurpose?: string | null;
    isSterile: boolean;
    sterilization: string;
    variantsJson?: unknown;
    materials?: string | null;
    manufacturingSites?: string | null;
    shelfLife?: string | null;
  },
  risks: RiskItem[],
  locale: "tr" | "en" = "tr",
): string {
  const fmeaRef = formatRiskFormRef("fmea", locale);
  const steril = sterilizationText(product) || product.sterilization;
  const harms = [
    ...new Set(
      risks
        .map((r) => r.harm?.trim())
        .filter((h): h is string => Boolean(h)),
    ),
  ].slice(0, 6);

  if (locale === "tr") {
    const mfg = product.manufacturingSites?.trim()
      ? `Üretim koşulları ${product.manufacturingSites} adresinde ISO 13485 uyumlu süreçlerle yönetilir.`
      : "Üretim koşulları ISO 13485 uyumlu süreçlerle yönetilir.";
    const sterile = product.isSterile
      ? `Ürün ${steril} yöntemiyle sterilize edilir; paketleme ve sterilizasyon validasyonları (ISO 11607, EN ISO 11135/11137 vb.) uygulanır. Depolama ve nakliye sıcaklıkları sterilitenin korunması için etiket ve IFU ile tanımlanır.`
      : "Ürün steril değildir veya sterilizasyon uygulanmaz.";
    const harmList =
      harms.length > 0
        ? harms.join(", ")
        : "inflamasyon, enfeksiyon, toksik etki, ateş, alerji ve doku hasarı";
    const riskCount = risks.length;

    return [
      `${product.name} için tanımlanan tehlikeler ve tehlikeli durumlar ${fmeaRef} FMEA tablosunda değerlendirilmiştir (${riskCount} satır). ${mfg} ${sterile}`,
      product.materials?.trim()
        ? `Materyal: ${product.materials.trim()}. ISO 10993 biyouyumluluk değerlendirmesi risk dosyasında referanslanmıştır.`
        : null,
      `Öngörülen klinik riskler arasında ${harmList} yer alabilir. Risk kontrol önlemleri (tasarım, üretim, satış sonrası) uygulandıktan sonra kalan artık riskler değerlendirilmiştir; olasılık düzeyi kabul edilebilir bulunmuştur.`,
      product.shelfLife?.trim()
        ? `Raf ömrü (${product.shelfLife.trim()}) paketleme ve sterilizasyon validasyonları ile desteklenir.`
        : null,
      `${product.name}'in klinik faydası (${product.intendedPurpose ?? "amaçlanan kullanım"}) kalan risklerle karşılaştırıldığında yüksektir. Genel fayda-risk dengesi kabul edilebilir bulunmuştur; artık risk kabul edilmiştir.`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  const mfg = product.manufacturingSites?.trim()
    ? `Manufacturing is controlled at ${product.manufacturingSites} under ISO 13485 processes.`
    : "Manufacturing is controlled under ISO 13485 processes.";
  const sterile = product.isSterile
    ? `The device is sterilized by ${steril}; packaging and sterilization validation (ISO 11607, EN ISO 11135/11137, etc.) applies. Storage and shipping conditions are defined on the label and IFU to maintain sterility.`
    : "The device is not sterile or sterilization is not applicable.";
  const harmList =
    harms.length > 0
      ? harms.join(", ")
      : "inflammation, infection, toxic effects, fever, allergy and tissue damage";
  const riskCount = risks.length;

  return [
    `Hazards and hazardous situations for ${product.name} are assessed in the ${fmeaRef} FMEA table (${riskCount} row(s)). ${mfg} ${sterile}`,
    product.materials?.trim()
      ? `Materials: ${product.materials.trim()}. ISO 10993 biocompatibility is referenced in the risk file.`
      : null,
    `Foreseeable clinical risks include ${harmList}. After design, production and post-market risk controls, residual risks are at an acceptable probability level.`,
    product.shelfLife?.trim()
      ? `Shelf life (${product.shelfLife.trim()}) is supported by packaging and sterilization validation.`
      : null,
    `Clinical benefit of ${product.name} (${product.intendedPurpose ?? "intended use"}) outweighs remaining risks. Overall benefit-risk balance is acceptable; residual risk is accepted.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
