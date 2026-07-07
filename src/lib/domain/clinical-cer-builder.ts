import type { ClinicalSectionKey } from "@/lib/domain/clinical-evaluation";
import type { AiResult } from "@/lib/ai/types";
import { buildCepCore, type CepBuildInput } from "@/lib/domain/clinical-cep-builder";
import {
  defaultExclusionCriteria,
  defaultInclusionCriteria,
} from "@/lib/domain/clinical-literature-model";
import { riskScore } from "@/lib/domain/risk-template";

export type CerDraftSections = Record<ClinicalSectionKey, string>;

export interface CerBuildInput {
  locale: "tr" | "en";
  product: {
    name: string;
    deviceClass: string;
    intendedPurpose?: string | null;
    indications?: string | null;
    contraindications?: string | null;
    materials?: string | null;
    isSterile: boolean;
    sterilization?: string | null;
    containsSoftware: boolean;
    isInvasive: boolean;
    hasMeasuringFn: boolean;
    bodyContactDuration?: string | null;
    userProfile?: string | null;
    model?: string | null;
  };
  risks: Array<{
    riskNo?: string | null;
    hazardousSituation?: string | null;
    harm?: string | null;
    initialSeverity: number;
    initialProbability: number;
    residualSeverity?: number;
    residualProbability?: number;
    residualAssessment?: string | null;
    benefitRiskJustification?: string | null;
  }>;
}

function higherClass(deviceClass: string): boolean {
  return /IIA|IIB|III/i.test(deviceClass);
}

function riskLines(input: CerBuildInput): string[] {
  return input.risks.map((r) => {
    const no = r.riskNo?.trim() || "—";
    const situation = r.hazardousSituation?.trim() || "—";
    const harm = r.harm?.trim() || "—";
    const init = riskScore(r.initialSeverity, r.initialProbability);
    const res =
      r.residualSeverity != null && r.residualProbability != null
        ? riskScore(r.residualSeverity, r.residualProbability)
        : init;
    return `| ${no} | ${situation} | ${harm} | ${init} | ${res} |`;
  });
}

function buildPlan(input: CerBuildInput): string {
  const cepInput: CepBuildInput = {
    locale: input.locale,
    product: {
      name: input.product.name,
      model: input.product.model,
      deviceClass: input.product.deviceClass,
      intendedPurpose: input.product.intendedPurpose,
      indications: input.product.indications,
      contraindications: input.product.contraindications,
      userProfile: input.product.userProfile,
      materials: input.product.materials,
      isSterile: input.product.isSterile,
      sterilization: input.product.sterilization,
      isInvasive: input.product.isInvasive,
      containsSoftware: input.product.containsSoftware,
      isImplantable: false,
      hasMeasuringFn: input.product.hasMeasuringFn,
      bodyContactDuration: input.product.bodyContactDuration,
    },
    risks: input.risks,
  };
  return buildCepCore(cepInput);
}

function buildSota(input: CerBuildInput): string {
  const { locale, product: p } = input;
  const tr = locale === "tr";
  const indication = p.indications?.trim() || p.intendedPurpose?.trim() || (tr ? "hedef endikasyon" : "target indication");

  if (tr) {
    return [
      "## Güncel teknoloji durumu (SOTA)",
      "",
      `### Klinik bağlam`,
      `${indication} için güncel klinik uygulama, ilgili kılavuzlar, konsensüs belgeleri ve alternatif tedavi seçenekleri özetlenmelidir.`,
      "",
      "### Alternatifler ve karşılaştırma",
      "| Yaklaşım | Klinik kullanım | Güvenlik / performans | Not |",
      "| --- | --- | --- | --- |",
      "| Mevcut standart bakım | | | |",
      "| Benzer tıbbi cihazlar | | | |",
      `| **${p.name}** | ${p.intendedPurpose?.trim() || "—"} | Değerlendirme devam ediyor | Bu CER kapsamında |`,
      "",
      "### İlgili standartlar ve kılavuzlar",
      "- MDR 2017/745 Ek I (GSPR)",
      "- ISO 14971 (risk yönetimi)",
      p.isInvasive ? "- ISO 10993-1 (biyouyumluluk — temas süresi ve materyale göre)" : null,
      p.isSterile ? "- ISO 11135 / 11137 / 11138 (sterilizasyon — yönteme göre)" : null,
      p.containsSoftware ? "- IEC 62304 / IEC 81001-5-1 (yazılım)" : null,
      "- MDCG 2020-6, MDCG 2020-13 (klinik değerlendirme rehberleri)",
      "",
      "### Karşılanmamış klinik ihtiyaç",
      `${p.name}, ${indication} alanında [klinik ihtiyaç / kullanım kolaylığı / hasta sonucu] açısından mevcut alternatiflere kıyasla [avantaj / farklılaşma] sağlamayı hedefler. Bu iddia literatür ve klinik veri ile desteklenmelidir.`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "## State of the art (SOTA)",
    "",
    "### Clinical context",
    `For ${indication}, summarise current clinical practice, applicable guidelines, consensus documents and alternative treatment options.`,
    "",
    "### Alternatives and comparison",
    "| Approach | Clinical use | Safety / performance | Notes |",
    "| --- | --- | --- | --- |",
    "| Standard of care | | | |",
    "| Similar medical devices | | | |",
    `| **${p.name}** | ${p.intendedPurpose?.trim() || "—"} | Under evaluation | Within this CER |`,
    "",
    "### Relevant standards and guidance",
    "- MDR 2017/745 Annex I (GSPR)",
    "- ISO 14971 (risk management)",
    p.isInvasive ? "- ISO 10993-1 (biocompatibility — per contact duration and materials)" : null,
    p.isSterile ? "- ISO 11135 / 11137 / 11138 (sterilization — per method)" : null,
    p.containsSoftware ? "- IEC 62304 / IEC 81001-5-1 (software)" : null,
    "- MDCG 2020-6, MDCG 2020-13 (clinical evaluation guidance)",
    "",
    "### Unmet clinical need",
    `${p.name} is intended to address [clinical need / usability / patient outcome] compared with existing alternatives for ${indication}. Claims must be supported by literature and clinical data.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildEquivalence(input: CerBuildInput): string {
  const { locale, product: p } = input;
  const tr = locale === "tr";

  if (tr) {
    return [
      "## Eşdeğer cihaz değerlendirmesi",
      "",
      "**Ön değerlendirme:** Bu aşamada üretici tarafından eşdeğer cihaz iddiası [yapılmamaktadır / yapılmaktadır — seçin ve gerekçelendirin].",
      "",
      "Eşdeğerlik iddiası yapılırsa MDR Ek XIV ve MEDDEV 2.7/1 Rev. 4 üçlü analiz gereklidir:",
      "",
      `| Boyut | Kriter | ${p.name} | Eşdeğer / benzer cihaz | Farklılık ve klinik etki |`,
      "| --- | --- | --- | --- | --- |",
      "| **Klinik** | Amaçlanan kullanım, endikasyon, hasta popülasyonu, klinik performans | | | |",
      "| **Teknik** | Tasarım, özellikler, enerji, ölçüm, yazılım, sterilizasyon | | | |",
      "| **Biyolojik** | Materyaller, biyouyumluluk, sterilite, kalıntılar | | | |",
      "",
      "### Sonuç",
      "- Farklılıklar klinik güvenlik veya performansı olumsuz etkilemiyorsa eşdeğerlik verisi kullanılabilir.",
      "- Anlamlı farklılıklar varsa ek klinik veri veya PMCF gerekir.",
      "",
      `Materyaller (${p.materials?.trim() || "belirtilecek"}) ve temas süresi (${p.bodyContactDuration?.trim() || "belirtilecek"}) biyolojik eşdeğerlik değerlendirmesinde dikkate alınmalıdır.`,
    ].join("\n");
  }

  return [
    "## Equivalent device assessment",
    "",
    "**Preliminary position:** The manufacturer [does not / does] claim equivalence at this stage — select and justify.",
    "",
    "If equivalence is claimed, MDR Annex XIV and MEDDEV 2.7/1 Rev. 4 require three-pillar analysis:",
    "",
    `| Pillar | Criteria | ${p.name} | Equivalent / similar device | Difference and clinical impact |`,
    "| --- | --- | --- | --- | --- |",
    "| **Clinical** | Intended purpose, indications, population, clinical performance | | | |",
    "| **Technical** | Design, features, energy, measuring, software, sterilization | | | |",
    "| **Biological** | Materials, biocompatibility, sterility, residues | | | |",
    "",
    "### Conclusion",
    "- Equivalent-device data may be used if differences do not adversely affect safety or performance.",
    "- Material differences require additional clinical data or PMCF.",
    "",
    `Materials (${p.materials?.trim() || "to be stated"}) and contact duration (${p.bodyContactDuration?.trim() || "to be stated"}) must be considered for biological equivalence.`,
  ].join("\n");
}

function buildLiterature(input: CerBuildInput): string {
  const { locale, product: p } = input;
  const tr = locale === "tr";
  const purpose = p.intendedPurpose?.trim() || p.name;
  const terms = [
    p.name,
    purpose.split(/\s+/).slice(0, 4).join(" "),
    p.indications?.trim()?.split(/\s+/).slice(0, 3).join(" "),
  ]
    .filter(Boolean)
    .join('", "');

  if (tr) {
    return [
      "## Literatür tarama stratejisi",
      "",
      "### Araştırma sorusu (PICO)",
      `- **P (Popülasyon):** ${p.userProfile?.trim() || "hedef hasta / kullanıcı popülasyonu"}`,
      `- **I (Müdahale / cihaz):** ${p.name} — ${purpose}`,
      `- **C (Karşılaştırma):** standart bakım / benzer cihazlar`,
      `- **O (Sonuçlar):** güvenlik (advers olay, komplikasyon), klinik performans, kullanılabilirlik`,
      "",
      "### Veri tabanları",
      "",
      "**Bilimsel:** PubMed/MEDLINE, Embase, Cochrane Library, Scopus; TR Dizin / ULAKBİM (uygulanırsa).",
      "",
      "**Ulusal kayıtlar / vigilans:** FDA MAUDE, FDA geri çağırma, FDA 510(k)/PMA; BfArM (DE), MHRA (UK), EUDAMED, ANSM (FR), AEMPS (ES), Swissmedic (CH), Health Canada, TGA (AU), PMDA (JP), TİTCK (TR).",
      "",
      "### Arama terimleri (örnek)",
      `("${terms}") AND (safety OR performance OR clinical OR adverse OR complication)`,
      "",
      "### Dahil etme kriterleri",
      defaultInclusionCriteria(locale),
      "",
      "### Hariç tutma",
      defaultExclusionCriteria(locale),
      "",
      "### Kalite değerlendirmesi",
      "- Yayın tipi, örneklem, takip süresi, bias, cihaza özgü veri varlığı",
      "- Düşük kaliteli çalışmalar fayda-risk gerekçesinde sınırlı ağırlık taşır",
      "",
      "### Raporlama",
      "PRISMA akış diyagramı, arama tarihi, veri tabanı, tam arama stringleri ve eleme kayıtları literatür dosyasında saklanır.",
    ].join("\n");
  }

  return [
    "## Literature search strategy",
    "",
    "### Research question (PICO)",
    `- **P (Population):** ${p.userProfile?.trim() || "target patient / user population"}`,
    `- **I (Intervention / device):** ${p.name} — ${purpose}`,
    `- **C (Comparator):** standard of care / similar devices`,
    `- **O (Outcomes):** safety (adverse events, complications), clinical performance, usability`,
    "",
    "### Databases",
    "",
    "**Scientific:** PubMed/MEDLINE, Embase, Cochrane Library, Scopus; grey literature and IFUs where relevant.",
    "",
    "**National registries / vigilance:** FDA MAUDE, FDA recalls, FDA 510(k)/PMA; BfArM (DE), MHRA (UK), EUDAMED, ANSM (FR), AEMPS (ES), Swissmedic (CH), Health Canada, TGA (AU), PMDA (JP), TİTCK (TR).",
    "",
    "### Search terms (example)",
    `("${terms}") AND (safety OR performance OR clinical OR adverse OR complication)`,
    "",
    "### Inclusion criteria",
    defaultInclusionCriteria(locale),
    "",
    "### Exclusion criteria",
    defaultExclusionCriteria(locale),
    "",
    "### Quality appraisal",
    "- Study type, sample size, follow-up, bias, device-specific data",
    "- Low-quality studies carry limited weight in benefit-risk",
    "",
    "### Reporting",
    "PRISMA flow, search date, databases, full search strings and screening log stored in the literature file.",
  ].join("\n");
}

function buildDataSummary(input: CerBuildInput): string {
  const { locale, product: p } = input;
  const tr = locale === "tr";
  const rows = riskLines(input);
  const riskTable =
    rows.length > 0
      ? ["| Risk kodu | Tehlikeli durum | Zarar | Başlangıç skoru | Artık skor |", "| --- | --- | --- | --- | --- |", ...rows].join(
          "\n",
        )
      : tr
        ? "_Risk dosyasında henüz kayıtlı satır yok — FMEA tamamlandığında bu bölüm güncellenmelidir._"
        : "_No risk file rows yet — update this section when the FMEA is complete._";

  if (tr) {
    return [
      "## Klinik veri özeti",
      "",
      "### Literatür taraması sonuçları",
      "| Kaynak | Tasarım | n | Sonuç (güvenlik / performans) | Cihaza özgü veri | Kalite |",
      "| --- | --- | --- | --- | --- | --- |",
      "| [Yazar, yıl] | | | | Evet / Hayır | Yüksek / Orta / Düşük |",
      "",
      "_Literatür taraması tamamlandığında tablo doldurulacaktır._",
      "",
      "### Üretici klinik verileri",
      "- Ön-pazar klinik araştırma: [yok / planlandı / tamamlandı — referans]",
      "- Bench / simülasyon / kullanılabilirlik: teknik dosyaya atıf",
      "",
      "### Risk dosyası ile ilişki (ISO 14971)",
      riskTable,
      "",
      "### Veri yeterliliği değerlendirmesi",
      `- Cihaz sınıfı: **${p.deviceClass}**`,
      "- Literatür + PMS + risk kontrolleri birlikte değerlendirildiğinde klinik veri seti [yeterli / kısmen yeterli / yetersiz — gerekçe]",
      "- Belirlenen boşluklar PMCF veya ek çalışma ile kapatılacaktır.",
    ].join("\n");
  }

  return [
    "## Clinical data summary",
    "",
    "### Literature search results",
    "| Source | Design | n | Outcomes (safety / performance) | Device-specific | Quality |",
    "| --- | --- | --- | --- | --- | --- |",
    "| [Author, year] | | | | Yes / No | High / Med / Low |",
    "",
    "_Populate after literature screening is complete._",
    "",
    "### Manufacturer clinical data",
    "- Pre-market clinical investigation: [none / planned / completed — reference]",
    "- Bench / simulation / usability: refer to technical file",
    "",
    "### Link to risk file (ISO 14971)",
    riskTable,
    "",
    "### Data sufficiency",
    `- Device class: **${p.deviceClass}**`,
    "- Combined literature, PMS and risk controls: clinical data set is [sufficient / partially sufficient / insufficient — justify]",
    "- Identified gaps will be addressed via PMCF or additional studies.",
  ].join("\n");
}

function buildBenefitRisk(input: CerBuildInput): string {
  const { locale, product: p } = input;
  const tr = locale === "tr";
  const riskNarratives = input.risks
    .filter((r) => r.benefitRiskJustification?.trim() || r.residualAssessment?.trim())
    .slice(0, 8)
    .map((r) => {
      const no = r.riskNo?.trim() || "—";
      const br = r.benefitRiskJustification?.trim();
      const res = r.residualAssessment?.trim();
      if (tr) return `**${no}:** ${br || res || "—"}`;
      return `**${no}:** ${br || res || "—"}`;
    });

  if (tr) {
    return [
      "## Fayda-risk değerlendirmesi",
      "",
      `### Klinik fayda`,
      `${p.name}, ${p.intendedPurpose?.trim() || "amaçlanan kullanım"} kapsamında hasta / kullanıcı için [klinik fayda tanımı — performans iddiaları ve SOTA ile uyumlu].`,
      "",
      "### Kalan riskler",
      p.contraindications?.trim()
        ? `Kontrendikasyonlar: ${p.contraindications}`
        : "Kontrendikasyonlar IFU ve risk dosyasında tanımlanmıştır.",
      "",
      ...(riskNarratives.length > 0
        ? ["Risk dosyasından özet:", ...riskNarratives.map((l) => `- ${l}`), ""]
        : []),
      "",
      "### Genel sonuç",
      `Mevcut klinik veri, literatür ve risk yönetimi çıktıları birlikte değerlendirildiğinde, **${p.name}** için klinik faydanın kalan riskleri aştığı ve fayda-risk dengesinin kabul edilebilir olduğu sonucuna varılmıştır.`,
      "",
      "_Nihai onay, yetkin kişi tarafından kanıt dosyası ile birlikte verilmelidir._",
    ].join("\n");
  }

  return [
    "## Benefit-risk assessment",
    "",
    "### Clinical benefit",
    `${p.name} provides [clinical benefit — aligned with performance claims and SOTA] for ${p.intendedPurpose?.trim() || "intended use"}.`,
    "",
    "### Residual risks",
    p.contraindications?.trim()
      ? `Contraindications: ${p.contraindications}`
      : "Contraindications are defined in the IFU and risk file.",
    "",
    ...(riskNarratives.length > 0
      ? ["Summary from risk file:", ...riskNarratives.map((l) => `- ${l}`), ""]
      : []),
    "",
    "### Overall conclusion",
    `Considering clinical data, literature and risk management outputs, the clinical benefits of **${p.name}** outweigh residual risks and the benefit-risk profile is acceptable.`,
    "",
    "_Final approval must be given by a qualified person with supporting evidence._",
  ].join("\n");
}

function buildPmsPmcf(input: CerBuildInput): string {
  const { locale, product: p } = input;
  const tr = locale === "tr";
  const higher = higherClass(p.deviceClass);

  if (tr) {
    return [
      "## PMS ve PMCF girdileri",
      "",
      "### Pazar sonrası gözetim (PMS)",
      "- Şikâyet ve olay trend analizi",
      "- Literatür izleme (yıllık / planlı)",
      "- Düzenleyici geri bildirim ve FSCA",
      `- Raporlama: ${higher ? "**PSUR** (Madde 86)" : "**PMS raporu** (Madde 85)"}`,
      "",
      "### PMCF",
      higher
        ? "Sınıf IIa ve üzeri için aktif PMCF beklenir: anket, kayıt verisi veya prospektif çalışma yöntemleri değerlendirilmelidir."
        : "PMCF muafiyeti yalnızca yeterli klinik veri ve güçlü PMS ile gerekçelendirilebilir.",
      "",
      "### CER güncelleme tetikleyicileri",
      "- Yeni ciddi olay veya trend",
      "- Tasarım / malzeme / sterilizasyon değişikliği",
      "- Literatürde yeni güvenlik sinyali",
      "- Eşdeğerlik veya endikasyon değişikliği",
    ].join("\n");
  }

  return [
    "## PMS and PMCF inputs",
    "",
    "### Post-market surveillance (PMS)",
    "- Complaint and incident trend analysis",
    "- Literature monitoring (planned / annual)",
    "- Regulatory feedback and FSCA",
    `- Reporting: ${higher ? "**PSUR** (Art. 86)" : "**PMS report** (Art. 85)"}`,
    "",
    "### PMCF",
    higher
      ? "Active PMCF is expected for class IIa and above: surveys, registry data or prospective studies should be considered."
      : "PMCF waiver only with sufficient clinical data and robust PMS justification.",
    "",
    "### CER update triggers",
    "- New serious incidents or trends",
    "- Design / material / sterilization change",
    "- New safety signal in literature",
    "- Equivalence or indication change",
  ].join("\n");
}

function buildReport(input: CerBuildInput, sections: Omit<CerDraftSections, "report">): string {
  const { locale, product: p } = input;
  const tr = locale === "tr";
  const date = new Date().toISOString().slice(0, 10);

  if (tr) {
    return [
      `# Klinik Değerlendirme Raporu (CER) — ${p.name}`,
      "",
      `**Tarih:** ${date} | **Sınıf:** ${p.deviceClass} | **Durum:** TASLAK`,
      "",
      "## Yönetici özeti",
      sections.benefitRiskConclusion.split("\n").slice(0, 6).join("\n"),
      "",
      "## Kapsam",
      `Bu rapor ${p.name} için MDR Ek XIV Bölüm A uyumlu klinik değerlendirme sonuçlarını özetler. Detaylı plan, SOTA, literatür stratejisi ve veri özeti ilgili bölümlerde yer alır.`,
      "",
      "## Ana bulgular",
      "- Güncel teknoloji ve alternatifler değerlendirilmiştir.",
      "- Literatür tarama stratejisi tanımlanmış; tarama sonuçları tamamlandığında veri tablosu güncellenecektir.",
      `- Risk yönetimi dosyasında ${input.risks.length} risk satırı klinik değerlendirmeye entegre edilmiştir.`,
      "- PMS / PMCF çıktıları CER yaşam döngüsü boyunca güncelleme girdisi sağlar.",
      "",
      "## Fayda-risk sonucu",
      "Klinik fayda, kalan riskler ve veri yeterliliği birlikte değerlendirildiğinde fayda-risk profili kabul edilebilir kabul edilmiştir (nihai onay bekleniyor).",
      "",
      "## Eksikler ve sonraki adımlar",
      "- Literatür taramasının yürütülmesi ve kalite değerlendirmesi",
      "- Eşdeğerlik iddiası varsa kanıt dosyasının tamamlanması",
      higherClass(p.deviceClass) ? "- PMCF planının onaylanması ve yürütülmesi" : null,
      "- Yetkin kişi gözden geçirmesi ve onayı",
      "",
      "---",
      "_Bu belge MDRpilot / kural tabanlı taslak üreticisi ile oluşturulmuş bir TASLAKtır; sertifikasyon veya onay yerine geçmez._",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `# Clinical Evaluation Report (CER) — ${p.name}`,
    "",
    `**Date:** ${date} | **Class:** ${p.deviceClass} | **Status:** DRAFT`,
    "",
    "## Executive summary",
    sections.benefitRiskConclusion.split("\n").slice(0, 6).join("\n"),
    "",
    "## Scope",
    `This report summarises the MDR Annex XIV Part A clinical evaluation for ${p.name}. The plan, SOTA, literature strategy and data summary are in the linked sections.`,
    "",
    "## Key findings",
    "- State of the art and alternatives have been reviewed.",
    "- Literature strategy is defined; results table to be updated after screening.",
    `- ${input.risks.length} risk file rows integrated into the clinical evaluation.`,
    "- PMS / PMCF outputs will feed CER updates throughout the lifecycle.",
    "",
    "## Benefit-risk outcome",
    "Clinical benefits, residual risks and data sufficiency support an acceptable benefit-risk profile (final approval pending).",
    "",
    "## Gaps and next steps",
    "- Execute literature search and quality appraisal",
    "- Complete equivalence evidence if claimed",
    higherClass(p.deviceClass) ? "- Approve and execute PMCF plan" : null,
    "- Qualified person review and approval",
    "",
    "---",
    "_DRAFT generated with MDRpilot rule-based builder — not certification or approval._",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Consultant-grade CER section drafts from product + risk file context. */
export function buildRuleBasedCerDraft(input: CerBuildInput): CerDraftSections {
  const plan = buildPlan(input);
  const stateOfTheArt = buildSota(input);
  const equivalentDevices = buildEquivalence(input);
  const literatureStrategy = buildLiterature(input);
  const clinicalDataSummary = buildDataSummary(input);
  const benefitRiskConclusion = buildBenefitRisk(input);
  const pmsPmcfInputs = buildPmsPmcf(input);
  const partial = {
    plan,
    stateOfTheArt,
    equivalentDevices,
    literatureStrategy,
    clinicalDataSummary,
    benefitRiskConclusion,
    pmsPmcfInputs,
  };
  const report = buildReport(input, partial);
  return { ...partial, report };
}

export function extractCerSectionsFromAi(result: AiResult): Partial<CerDraftSections> | null {
  const data = result.data;
  if (!data || typeof data !== "object") return null;
  const cer = (data as { cer?: unknown }).cer;
  if (!cer || typeof cer !== "object") return null;
  const c = cer as Record<string, unknown>;
  const pick = (key: ClinicalSectionKey) =>
    typeof c[key] === "string" && c[key]!.trim().length > 40 ? (c[key] as string).trim() : undefined;

  const sections: Partial<CerDraftSections> = {};
  for (const key of [
    "plan",
    "stateOfTheArt",
    "equivalentDevices",
    "literatureStrategy",
    "clinicalDataSummary",
    "benefitRiskConclusion",
    "pmsPmcfInputs",
    "report",
  ] as ClinicalSectionKey[]) {
    const v = pick(key);
    if (v) sections[key] = v;
  }

  // Legacy AI shape: map stateOfTheArt only
  if (!sections.stateOfTheArt && typeof c.stateOfTheArt === "string") {
    sections.stateOfTheArt = c.stateOfTheArt.trim();
  }

  return Object.keys(sections).length > 0 ? sections : null;
}

export function mergeCerSections(
  base: CerDraftSections,
  overlay: Partial<CerDraftSections>,
): CerDraftSections {
  const out = { ...base };
  for (const [k, v] of Object.entries(overlay)) {
    if (v?.trim()) out[k as ClinicalSectionKey] = v.trim();
  }
  return out;
}
