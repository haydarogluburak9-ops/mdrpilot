import { riskScore } from "@/lib/domain/risk-template";
import {
  buildSearchQueryFromPico,
  databaseLabel,
  defaultExclusionCriteria,
  defaultInclusionCriteria,
  serializePrismaFlowMarkdown,
  type LiteratureSearchData,
} from "@/lib/domain/clinical-literature-model";
import type { EquivalentDevicesData } from "@/lib/domain/clinical-equivalent-model";
import {
  CEP_IMPORTANT_CONTENT_EN,
  CEP_IMPORTANT_CONTENT_TR,
  cepSectionTitles,
} from "@/lib/domain/clinical-cep-template";

export interface CepBuildInput {
  locale: "tr" | "en";
  product: {
    name: string;
    brand?: string | null;
    model?: string | null;
    emdnCode?: string | null;
    basicUdiDi?: string | null;
    deviceClass: string;
    intendedPurpose?: string | null;
    indications?: string | null;
    contraindications?: string | null;
    patientPopulation?: string | null;
    userProfile?: string | null;
    materials?: string | null;
    isSterile: boolean;
    sterilization?: string | null;
    isInvasive: boolean;
    containsSoftware: boolean;
    isImplantable: boolean;
    hasMeasuringFn: boolean;
    bodyContactDuration?: string | null;
    isReusable?: boolean;
    shelfLife?: string | null;
  };
  risks: Array<{
    riskNo?: string | null;
    hazardousSituation?: string | null;
    harm?: string | null;
    initialSeverity: number;
    initialProbability: number;
    residualSeverity?: number | null;
    residualProbability?: number | null;
  }>;
  literatureData?: LiteratureSearchData | null;
  equivalentDevicesData?: EquivalentDevicesData | null;
  pmsPmcfInputs?: string | null;
  /** User-edited team / schedule notes from plan field (optional). */
  planNotes?: string | null;
  /** Device family matrix for variant justification (optional). */
  variantsJson?: unknown;
}

function higherClass(deviceClass: string): boolean {
  return /IIA|IIB|III/i.test(deviceClass);
}

function cell(v: string): string {
  return v.replace(/\|/g, "/").replace(/\n/g, " ").trim() || "—";
}

function gsprClinicalRows(input: CepBuildInput): string[] {
  const { locale, product: p } = input;
  const tr = locale === "tr";
  const rows: [string, string, string][] = [
    [
      "1",
      tr ? "Güvenlik ve performans" : "Safety and performance",
      tr ? "Klinik veri ile doğrulanır" : "Verified by clinical data",
    ],
    [
      "4",
      tr ? "Tasarım ve üretim — güvenlik" : "Design and manufacture — safety",
      tr ? "Risk dosyası + klinik değerlendirme" : "Risk file + clinical evaluation",
    ],
    [
      "5",
      tr ? "Fayda-risk oranı" : "Benefit-risk ratio",
      tr ? "Fayda-risk analizi (Bölüm 9)" : "Benefit-risk analysis (Section 9)",
    ],
    [
      "8",
      tr ? "Genel fayda-risk kabul edilebilirliği" : "Overall acceptable benefit-risk",
      tr ? "CER fayda-risk sonucu" : "CER benefit-risk conclusion",
    ],
  ];
  if (p.isInvasive) {
    rows.push([
      "10.4",
      tr ? "Biyouyumluluk" : "Biocompatibility",
      tr ? "ISO 10993 + klinik/literatür kanıtı" : "ISO 10993 + clinical/literature evidence",
    ]);
  }
  if (p.isSterile) {
    rows.push([
      "11",
      tr ? "Sterilite" : "Sterility",
      tr ? "Sterilizasyon validasyonu + klinik güvenlik" : "Sterilization validation + clinical safety",
    ]);
  }
  if (p.containsSoftware) {
    rows.push([
      "14",
      tr ? "Yazılım / siber güvenlik" : "Software / cybersecurity",
      tr ? "IEC 62304 + klinik güvenlik verisi" : "IEC 62304 + clinical safety data",
    ]);
  }
  if (p.hasMeasuringFn) {
    rows.push([
      "15",
      tr ? "Ölçüm fonksiyonu doğruluğu" : "Measuring function accuracy",
      tr ? "Performans verisi / klinik doğrulama" : "Performance / clinical validation data",
    ]);
  }
  return rows.map(([ref, req, evidence]) => `| ${ref} | ${cell(req)} | ${cell(evidence)} |`);
}

function equivalenceAnnex(input: CepBuildInput): string {
  const { locale, equivalentDevicesData: equiv } = input;
  if (!equiv?.devices.length) return "";
  const tr = locale === "tr";
  const lines = [
    tr ? "## Ek B — Eşdeğerlik stratejisi" : "## Annex B — Equivalence strategy",
    "",
    tr
      ? "_MDCG 2020-5 üçlü sütun (teknik, biyolojik, klinik) analizi uygulanır. Ayrıntılı tablo CER eşdeğer ürünler bölümünde._"
      : "_MDCG 2020-5 three-pillar (technical, biological, clinical) analysis applies. Detailed table is in the CER equivalent devices section._",
    "",
    tr ? `- **Tarama tarihi:** ${equiv.searchDate || "—"}` : `- **Search date:** ${equiv.searchDate || "—"}`,
    "",
    "| " +
      (tr ? "Cihaz | Üretici | Düzenleyici ref | Klinik sütun" : "Device | Manufacturer | Regulatory ref | Clinical pillar") +
      " |",
    "| --- | --- | --- | --- |",
    ...equiv.devices.map((d) => {
      return `| ${cell(d.deviceName)} | ${cell(d.manufacturer)} | ${cell(d.regulatoryRef)} | ${cell(d.clinicalPillar)} |`;
    }),
  ];
  return lines.join("\n");
}

function pmcfAnnex(input: CepBuildInput): string {
  const { locale, pmsPmcfInputs } = input;
  if (!pmsPmcfInputs?.trim()) return "";
  const tr = locale === "tr";
  const excerpt = pmsPmcfInputs.trim().slice(0, 6000);
  return [
    tr ? "## Ek C — PMCF planı özeti" : "## Annex C — PMCF plan summary",
    "",
    excerpt,
    pmsPmcfInputs.trim().length > 6000
      ? tr
        ? "\n\n_[Özet kısaltıldı — tam metin PMS/PMCF sekmesinde.]_"
        : "\n\n_[Excerpt truncated — full text in PMS/PMCF tab.]_"
      : "",
  ].join("");
}

function variantFamilyBlock(input: CepBuildInput): string {
  const { locale, product: p, variantsJson } = input;
  const tr = locale === "tr";
  const v = variantsJson as
    | { brands?: Array<{ name?: string; models?: Array<{ code?: string }> }> }
    | null
    | undefined;
  const brands = v?.brands ?? [];
  if (brands.length <= 1 && (brands[0]?.models?.length ?? 0) <= 1) {
    return tr
      ? "_Tek varyantlı ürün — ayrı CER gerekçesi uygulanmaz._"
      : "_Single-variant product — separate CER justification not required._";
  }
  const modelCount = brands.reduce((n, b) => n + (b.models?.length ?? 0), 0);
  return [
    tr
      ? `Bu CEP/CER, **${p.name}** cihaz ailesindeki ${brands.length} marka ve ${modelCount} model/referansı kapsar.`
      : `This CEP/CER covers ${brands.length} brand(s) and ${modelCount} model/reference(s) in the **${p.name}** device family.`,
    "",
    tr
      ? "**Gerekçe:** Varyantlar aynı amaçlanan kullanım, aynı risk profili, aynı temel tasarım ve üretim sürecini paylaşır; farklılıklar yalnızca boyut/renk/model kodu düzeyindedir ve klinik güvenlik veya performansı olumsuz etkilemez."
      : "**Rationale:** Variants share intended purpose, risk profile, core design and manufacturing; differences are size/colour/model code only and do not adversely affect clinical safety or performance.",
    "",
    "| Marka | Modeller |",
    "| --- | --- |",
    ...brands.map((b) => `| ${cell(b.name ?? "—")} | ${cell((b.models ?? []).map((m) => m.code).filter(Boolean).join(", ") || "—")} |`),
  ].join("\n");
}

function literatureSection(input: CepBuildInput, t: ReturnType<typeof cepSectionTitles>): string[] {
  const { locale, literatureData: lit } = input;
  const tr = locale === "tr";
  if (!lit) {
    return [
      `## ${t.stage1}`,
      "",
      `### ${t.s21}`,
      tr
        ? "Literatür protokolü Literatür sekmesinde tanımlanacaktır."
        : "Literature protocol to be defined in the Literature tab.",
    ];
  }

  const query = lit.searchQuery?.trim() || buildSearchQueryFromPico(lit);
  const keywords = lit.searchKeywords?.length
    ? lit.searchKeywords.join(", ")
    : query;
  const litDbs = lit.databases
    .filter((id) => !/fda|bfarm|mhra|eudamed|titck|ansm|aemps|swiss|health-canada|tga|pmda/i.test(id))
    .map((id) => databaseLabel(id, locale));
  const regDbs = lit.databases
    .filter((id) => /fda|bfarm|mhra|eudamed|titck|ansm|aemps|swiss|health-canada|tga|pmda/i.test(id))
    .map((id) => databaseLabel(id, locale));
  const important = tr ? CEP_IMPORTANT_CONTENT_TR : CEP_IMPORTANT_CONTENT_EN;

  return [
    `## ${t.stage1}`,
    "",
    `### ${t.s21}`,
    tr
      ? "Bu bölüm, klinik değerlendirme raporunun Aşama 1 literatür taraması için planlanan protokolü tanımlar."
      : "This section defines the planned protocol for Stage 1 literature search of the clinical evaluation report.",
    "",
    `### ${t.s22}`,
    tr
      ? "Tarama; bilimsel veri tabanları, ulusal kayıtlar ve eşdeğer cihaz literatürünü kapsar. Dahil edilen çalışmalar EK-4'e, arama kanıtları EK-3'e eklenir."
      : "Search covers scientific databases, national registries and equivalent-device literature. Included studies go to Annex 4; search evidence to Annex 3.",
    "",
    `### ${t.s23}`,
    tr ? "- PICO tabanlı sistematik tarama (PRISMA)" : "- PICO-based systematic search (PRISMA)",
    tr ? "- İki bağımsız değerlendirici tarama / eleme (planlanır)" : "- Dual-reviewer screening (planned)",
    tr ? "- Tam metin değerlendirme ve kalite değerlendirmesi" : "- Full-text assessment and quality appraisal",
    "",
    tr ? "**PICO**" : "**PICO**",
    tr ? `- Popülasyon: ${lit.population.trim() || "—"}` : `- Population: ${lit.population.trim() || "—"}`,
    tr ? `- Müdahale: ${lit.intervention.trim() || "—"}` : `- Intervention: ${lit.intervention.trim() || "—"}`,
    tr ? `- Karşılaştırma: ${lit.comparator.trim() || "—"}` : `- Comparator: ${lit.comparator.trim() || "—"}`,
    tr ? `- Sonuçlar: ${lit.outcomes.trim() || "—"}` : `- Outcomes: ${lit.outcomes.trim() || "—"}`,
    "",
    `### ${t.s24}`,
    tr ? `- Tarama tarihi: ${lit.searchDate || "—"}` : `- Search date: ${lit.searchDate || "—"}`,
    tr ? `- Arama sorgusu: \`${query}\`` : `- Search query: \`${query}\``,
    tr ? `- İngilizce anahtar kelimeler (max 5): ${keywords}` : `- English keywords (max 5): ${keywords}`,
    lit.liveLiteratureSearch && lit.pubmedTotal != null
      ? tr
        ? `- Canlı PubMed kayıt sayısı: ${lit.pubmedTotal.toLocaleString("tr-TR")}`
        : `- Live PubMed records: ${lit.pubmedTotal.toLocaleString()}`
      : "",
    "",
    tr ? "**Bilimsel veri tabanları**" : "**Scientific databases**",
    litDbs.length ? litDbs.map((d) => `- ${d}`).join("\n") : "—",
    "",
    tr ? "**Ulusal kayıtlar / vigilans**" : "**National registries / vigilance**",
    regDbs.length ? regDbs.map((d) => `- ${d}`).join("\n") : "—",
    "",
    `### ${t.s25}`,
    lit.exclusionCriteria.trim() || defaultExclusionCriteria(locale),
    "",
    `### ${t.s26}`,
    lit.inclusionCriteria.trim() || defaultInclusionCriteria(locale),
    "",
    `### ${t.s27}`,
    ...important.map((line) => `- ${line}`),
    "",
    serializePrismaFlowMarkdown(lit.prisma, locale),
  ].filter(Boolean);
}

/** MDCG 2020-1 / Tekno Bio–ARMA style CEP (stored in `plan` field). */
export function buildCepCore(input: CepBuildInput): string {
  const { locale, product: p, risks, planNotes } = input;
  const tr = locale === "tr";
  const t = cepSectionTitles(locale);
  const classNote = higherClass(p.deviceClass)
    ? tr
      ? "Sınıf IIa ve üzeri: literatür ve/veya klinik veri + PMCF zorunludur."
      : "Class IIa and above: literature and/or clinical data + PMCF required."
    : tr
      ? "Düşük risk sınıfı: literatür ve klinik deneyim yeterli olabilir; boşluklar belgelenmelidir."
      : "Lower risk class: literature and clinical experience may suffice; gaps must be documented.";

  const riskHeader = tr
    ? "| Risk kodu | Tehlikeli durum | Zarar | Başlangıç | Artık |"
    : "| Risk code | Hazardous situation | Harm | Initial | Residual |";
  const riskRows = risks.map((r) => {
    const no = r.riskNo?.trim() || "—";
    const init = riskScore(r.initialSeverity, r.initialProbability);
    const res =
      r.residualSeverity != null && r.residualProbability != null
        ? riskScore(r.residualSeverity, r.residualProbability)
        : init;
    return `| ${no} | ${cell(r.hazardousSituation ?? "")} | ${cell(r.harm ?? "")} | ${init} | ${res} |`;
  });

  const teamBlock =
    planNotes?.trim() && planNotes.includes(tr ? "Değerlendirme ekibi" : "Evaluation team")
      ? planNotes.trim()
      : [
          `## ${t.team}`,
          "",
          tr ? "- Klinik değerlendirme sorumlusu (ünvan, eğitim, deneyim)" : "- Clinical evaluation lead (qualifications, experience)",
          tr ? "- Bağımsız klinisyen / danışman (EK-2 CV)" : "- Independent clinician / advisor (Annex 2 CV)",
          tr ? "- Risk yönetimi / tasarım temsilcisi" : "- Risk management / design representative",
          tr ? "- Düzenleyici işler ve PMS sorumlusu" : "- Regulatory affairs and PMS owner",
        ].join("\n");

  const equivBlock =
    (input.equivalentDevicesData?.devices.length ?? 0) > 0
      ? [
          ...input.equivalentDevicesData!.devices.map((d) =>
            `- ${cell(d.deviceName)} · ${cell(d.manufacturer)} · ${cell(d.regulatoryRef)}`,
          ),
          "",
          tr
            ? "_Ayrıntılı eşdeğerlik tablosu EK-7 ve CER eşdeğer ürünler bölümündedir._"
            : "_Detailed equivalence table is in Annex 7 and CER equivalent devices section._",
        ].join("\n")
      : tr
        ? "Eşdeğerlik iddiası yok veya henüz tanımlanmadı."
        : "No equivalence claim or not yet defined.";

  return [
    `## ${t.intro}`,
    tr
      ? `Bu Klinik Değerlendirme Planı, **${p.name}** için MEDDEV 2.7/1 Rev. 4 ve MDR Ek XIV Bölüm A'ya uygun olarak hazırlanmıştır. Plan; Aşama 0–4 sürecini, literatür protokolünü, veri değerlendirme/analiz yaklaşımını ve PMCF'i tanımlar.`
      : `This Clinical Evaluation Plan for **${p.name}** is prepared per MEDDEV 2.7/1 Rev. 4 and MDR Annex XIV Part A. It defines Stages 0–4, literature protocol, data appraisal/analysis approach and PMCF.`,
    "",
    `## ${t.stage0}`,
    "",
    `### ${t.s11}`,
    "",
    `#### ${t.s111}`,
    tr ? "_Üretici bilgileri teknik dosya / şirket profilinden tamamlanır._" : "_Manufacturer details completed from technical file / company profile._",
    "",
    `#### ${t.s112}`,
    tr ? `- **Ticari ad:** ${p.name}` : `- **Trade name:** ${p.name}`,
    p.brand?.trim() ? (tr ? `- **Marka:** ${p.brand}` : `- **Brand:** ${p.brand}`) : "",
    p.model?.trim() ? (tr ? `- **Model:** ${p.model}` : `- **Model:** ${p.model}`) : "",
    "",
    `#### ${t.s113}`,
    p.emdnCode?.trim() ? `- **EMDN:** ${p.emdnCode}` : tr ? "- **EMDN:** _Teknik dosyadan_" : "- **EMDN:** _From technical file_",
    p.basicUdiDi?.trim() ? `- **UDI-DI:** ${p.basicUdiDi}` : "",
    "",
    `#### ${t.s114}`,
    tr ? `- **MDR sınıfı:** ${p.deviceClass}` : `- **MDR class:** ${p.deviceClass}`,
    classNote,
    "",
    `#### ${t.s115}`,
    tr ? "_Pazar durumu ve satış bölgeleri teknik dosyadan tamamlanır._" : "_Market status and sales regions completed from technical file._",
    "",
    `### ${t.s12}`,
    tr
      ? `- **Amaçlanan kullanım:** ${p.intendedPurpose?.trim() || "—"}`
      : `- **Intended purpose:** ${p.intendedPurpose?.trim() || "—"}`,
    tr ? `- **Hasta popülasyonu:** ${p.patientPopulation?.trim() || "—"}` : `- **Patient population:** ${p.patientPopulation?.trim() || "—"}`,
    tr ? `- **Kullanıcı profili:** ${p.userProfile?.trim() || "—"}` : `- **User profile:** ${p.userProfile?.trim() || "—"}`,
    p.materials?.trim() ? (tr ? `- **Materyaller:** ${p.materials}` : `- **Materials:** ${p.materials}`) : "",
    p.isSterile
      ? tr
        ? `- **Steril:** Evet (${p.sterilization ?? "yöntem — teknik dosya"})`
        : `- **Sterile:** Yes (${p.sterilization ?? "method — technical file"})`
      : "",
    p.bodyContactDuration?.trim()
      ? tr
        ? `- **Temas süresi:** ${p.bodyContactDuration}`
        : `- **Contact duration:** ${p.bodyContactDuration}`
      : "",
    "",
    `### ${t.s13}`,
    "",
    `#### ${t.s131}`,
    tr ? `- **Endikasyonlar:** ${p.indications?.trim() || "—"}` : `- **Indications:** ${p.indications?.trim() || "—"}`,
    "",
    `#### ${t.s132}`,
    tr
      ? `- **Kontrendikasyonlar:** ${p.contraindications?.trim() || "—"}`
      : `- **Contraindications:** ${p.contraindications?.trim() || "—"}`,
    "",
    `### ${t.s14}`,
    equivBlock,
    "",
    `### ${t.s15}`,
    variantFamilyBlock(input),
    "",
    ...literatureSection(input, t),
    "",
    `## ${t.stage2}`,
    "",
    `### ${t.s31}`,
    tr
      ? "- Bilimsel geçerlilik, istatistiksel güvenilirlik, klinik uygunluk (MEDDEV 2.7/1 Aşama 2)"
      : "- Scientific validity, statistical reliability, clinical relevance (MEDDEV 2.7/1 Stage 2)",
    tr ? "- Cihaza özgü veri ağırlığı > genel veri" : "- Device-specific data weighted above general data",
    "",
    `### ${t.s32}`,
    tr ? "- Kalite: Yüksek / Orta / Düşük (PRISMA dahil çalışmalar)" : "- Quality: High / Medium / Low (PRISMA included studies)",
    tr ? "- Literatür, eşdeğerlik, PMS ve risk dosyası bulgularının katkısı" : "- Contribution of literature, equivalence, PMS and risk file findings",
    "",
    `## ${t.stage3}`,
    "",
    `### ${t.s41}`,
    tr
      ? "- Literatür ve kayıt bulgularının sentezi (CER klinik veri özeti)"
      : "- Synthesis of literature and registry findings (CER clinical data summary)",
    tr ? "- Fayda-risk analizi — risk dosyası ile tutarlılık" : "- Benefit-risk analysis — aligned with risk file",
    tr ? `- Risk dosyası: ${risks.length} FMEA satırı` : `- Risk file: ${risks.length} FMEA row(s)`,
    risks.length > 0 ? riskHeader : "",
    ...riskRows,
    "",
    `## ${t.benefitRisk}`,
    tr
      ? "Klinik veri analizi sonrası fayda-risk değerlendirmesi CER Bölüm 5'te tamamlanır; planlanan girdiler: literatür, eşdeğerlik, PMS, risk dosyası."
      : "Benefit-risk after clinical data analysis is completed in CER Section 5; planned inputs: literature, equivalence, PMS, risk file.",
    "",
    `## ${t.pmcf}`,
    input.pmsPmcfInputs?.trim()
      ? input.pmsPmcfInputs.trim().slice(0, 4000)
      : tr
        ? "PMCF planı PMS/PMCF sekmesinden tamamlanacaktır (MDCG 2020-7)."
        : "PMCF plan to be completed from PMS/PMCF tab (MDCG 2020-7).",
    "",
    teamBlock,
    "",
    `## ${t.schedule}`,
    tr
      ? `- Literatür tarama: ${input.literatureData?.searchDate || "[tarih]"}`
      : `- Literature search: ${input.literatureData?.searchDate || "[date]"}`,
    tr ? "- CEP onayı: _[tarih / imza]_" : "- CEP approval: _[date / signature]_",
    tr ? "- CER ilk onay: _[tarih]_" : "- Initial CER approval: _[date]_",
    tr ? "- Planlı gözden geçirme: en az yılda bir veya PMS sinyali" : "- Planned review: at least annually or on PMS signal",
    "",
    `## ${t.riskFile}`,
    tr
      ? "Klinik değerlendirme ISO 14971 risk yönetimi dosyası ile entegre edilir."
      : "Clinical evaluation is integrated with the ISO 14971 risk management file.",
    "",
    tr ? "### GSPR — klinik kanıt yaklaşımı" : "### GSPR — clinical evidence approach",
    tr ? "| GSPR | Gereklilik | Klinik kanıt yaklaşımı |" : "| GSPR | Requirement | Clinical evidence approach |",
    "| --- | --- | --- |",
    ...gsprClinicalRows(input),
  ]
    .filter(Boolean)
    .join("\n");
}

/** Full CEP document with optional equivalence / PMCF annexes (export). */
export function buildCepDocument(input: CepBuildInput): string {
  const core = buildCepCore(input);
  const annexes = [equivalenceAnnex(input), pmcfAnnex(input)].filter(Boolean);
  if (!annexes.length) return core;
  return [core, "", "---", "", ...annexes].join("\n");
}
