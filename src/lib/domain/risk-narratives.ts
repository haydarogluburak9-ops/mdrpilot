import type { RiskLevel } from "./types";

export interface RiskNarrativeInput {
  hazardousSituation: string;
  harm?: string | null;
  residualScore: number;
  residualLevel: RiskLevel;
  intendedPurpose?: string | null;
  productName?: string | null;
}

export function buildRiskNarratives(
  input: RiskNarrativeInput,
  locale: "tr" | "en" = "tr",
): { residualAssessment: string; benefitRiskJustification: string } {
  const harm = input.harm?.trim() || (locale === "tr" ? "hedeflenmeyen zarar" : "unintended harm");
  const situation = input.hazardousSituation.trim();
  const score = input.residualScore;
  const product = input.productName?.trim() || (locale === "tr" ? "Cihaz" : "The device");
  const purpose = input.intendedPurpose?.trim() || (locale === "tr" ? "amaçlanan kullanım" : "intended use");

  if (locale === "tr") {
    const levelNote =
      score >= 15
        ? "Artık risk yüksek seviyede kalmıştır; ek kontrol veya fayda-risk gerekçesi dokümante edilmelidir."
        : score >= 9
          ? "Artık risk orta seviyededir; uygulanan kontroller sonrası izleme ve doğrulama kayıtları ile desteklenmiştir."
          : "Artık risk kabul edilebilir seviyededir.";

    const residualAssessment = [
      `Tehlikeli durum: ${situation}. Zarar: ${harm}.`,
      `Tasarım, üretim ve satış sonrası risk azaltma önlemleri uygulandıktan sonra artık risk skoru ${score} olarak değerlendirilmiştir.`,
      levelNote,
    ].join(" ");

    const benefitRiskJustification = `${product} için ${purpose} kapsamındaki klinik fayda, ${harm} dahil kalan risklerle karşılaştırıldığında olumludur. Fayda-risk dengesi kabul edilebilir bulunmuştur.`;

    return { residualAssessment, benefitRiskJustification };
  }

  const levelNote =
    score >= 15
      ? "Residual risk remains high; additional controls or benefit-risk justification must be documented."
      : score >= 9
        ? "Residual risk is moderate; supported by verification records and monitoring after controls."
        : "Residual risk is at an acceptable level.";

  const residualAssessment = [
    `Hazardous situation: ${situation}. Harm: ${harm}.`,
    `After design, production and post-market controls, residual risk score is ${score}.`,
    levelNote,
  ].join(" ");

  const benefitRiskJustification = `Clinical benefit of ${product} for ${purpose} outweighs remaining risks, including ${harm}. Overall benefit-risk balance is acceptable.`;

  return { residualAssessment, benefitRiskJustification };
}
