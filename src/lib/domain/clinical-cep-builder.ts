import { riskScore } from "@/lib/domain/risk-template";
import {
  buildSearchQueryFromPico,
  databaseLabel,
  serializePrismaFlowMarkdown,
  type LiteratureSearchData,
} from "@/lib/domain/clinical-literature-model";
import type { EquivalentDevicesData } from "@/lib/domain/clinical-equivalent-model";

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

function evaluationRoute(input: CepBuildInput): string {
  const { locale, literatureData: lit, equivalentDevicesData: equiv } = input;
  const tr = locale === "tr";
  const routes: string[] = [];
  if (lit?.preparedByMedDoc || lit?.searchQuery?.trim()) {
    routes.push(tr ? "- Yayınlanmış bilimsel literatür taraması" : "- Published scientific literature review");
  }
  if ((equiv?.devices.length ?? 0) > 0) {
    routes.push(
      tr
        ? "- Eşdeğer cihaz yolu (MDCG 2020-5 üçlü sütun analizi)"
        : "- Equivalence route (MDCG 2020-5 three-pillar analysis)",
    );
  }
  routes.push(tr ? "- Üretici PMS / vigilans verileri" : "- Manufacturer PMS / vigilance data");
  routes.push(tr ? "- Risk yönetimi dosyası (ISO 14971)" : "- Risk management file (ISO 14971)");
  if (higherClass(input.product.deviceClass)) {
    routes.push(tr ? "- PMCF planı (MDCG 2020-7)" : "- PMCF plan (MDCG 2020-7)");
  }
  return routes.join("\n");
}

function literatureAnnex(input: CepBuildInput): string {
  const { locale, literatureData: lit } = input;
  if (!lit) return "";
  const tr = locale === "tr";
  const query = lit.searchQuery?.trim() || buildSearchQueryFromPico(lit);
  const litDbs = lit.databases
    .filter((id) => !/fda|bfarm|mhra|eudamed|titck|ansm|aemps|swiss|health-canada|tga|pmda/i.test(id))
    .map((id) => databaseLabel(id, locale));
  const regDbs = lit.databases
    .filter((id) => /fda|bfarm|mhra|eudamed|titck|ansm|aemps|swiss|health-canada|tga|pmda/i.test(id))
    .map((id) => databaseLabel(id, locale));

  return [
    tr ? "## Ek A — Literatür tarama protokolü" : "## Annex A — Literature search protocol",
    "",
    tr ? "### PICO" : "### PICO",
    tr ? `- **Popülasyon:** ${lit.population.trim() || "—"}` : `- **Population:** ${lit.population.trim() || "—"}`,
    tr
      ? `- **Müdahale / cihaz:** ${lit.intervention.trim() || "—"}`
      : `- **Intervention / device:** ${lit.intervention.trim() || "—"}`,
    tr ? `- **Karşılaştırma:** ${lit.comparator.trim() || "—"}` : `- **Comparator:** ${lit.comparator.trim() || "—"}`,
    tr ? `- **Sonuçlar:** ${lit.outcomes.trim() || "—"}` : `- **Outcomes:** ${lit.outcomes.trim() || "—"}`,
    "",
    tr ? `- **Tarama tarihi:** ${lit.searchDate || "—"}` : `- **Search date:** ${lit.searchDate || "—"}`,
    tr ? `- **Sorgu:** \`${query}\`` : `- **Query:** \`${query}\``,
    lit.liveLiteratureSearch && lit.pubmedTotal != null
      ? tr
        ? `- **Canlı PubMed:** ${lit.pubmedTotal.toLocaleString("tr-TR")} kayıt`
        : `- **Live PubMed:** ${lit.pubmedTotal.toLocaleString()} records`
      : "",
    "",
    tr ? "### Veri tabanları" : "### Databases",
    litDbs.length ? litDbs.map((d) => `- ${d}`).join("\n") : "—",
    "",
    tr ? "### Ulusal kayıtlar ve vigilans" : "### National registries and vigilance",
    regDbs.length ? regDbs.map((d) => `- ${d}`).join("\n") : "—",
    "",
    tr ? "### Dahil etme kriterleri" : "### Inclusion criteria",
    lit.inclusionCriteria.trim() || (tr ? "_Tanımlanacak_" : "_To be defined_"),
    "",
    tr ? "### Hariç tutma kriterleri" : "### Exclusion criteria",
    lit.exclusionCriteria.trim() || (tr ? "_Tanımlanacak_" : "_To be defined_"),
    "",
    serializePrismaFlowMarkdown(lit.prisma, locale),
    "",
    tr
      ? "_Tam ulusal kayıt sonuçları ve kanıt ekran görüntüleri Literatür sekmesinde ve CER export'ta yer alır._"
      : "_Full national registry results and evidence screenshots are in the Literature tab and CER export._",
  ]
    .filter(Boolean)
    .join("\n");
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

function clinicalOutcomesBlock(input: CepBuildInput): string {
  const { locale, literatureData: lit, product: p } = input;
  const tr = locale === "tr";
  const outcomes = lit?.outcomes?.trim() || p.intendedPurpose?.trim() || "—";
  return [
    tr ? "## 5. Beklenen klinik sonuç parametreleri" : "## 5. Expected clinical outcome parameters",
    "",
    tr
      ? "Fayda-risk değerlendirmesi ve literatür taraması aşağıdaki sonuç parametrelerine göre yapılır:"
      : "Benefit-risk and literature appraisal use the following outcome parameters:",
    "",
    outcomes,
    "",
    "| Parametre | Kabul kriteri (SOTA) | Veri kaynağı |",
    "| --- | --- | --- |",
    tr
      ? `| Güvenlik (advers olay, komplikasyon) | Kabul edilebilir risk seviyesi (ISO 14971) | Literatür, PMS, risk dosyası |`
      : `| Safety (adverse events, complications) | Acceptable risk level (ISO 14971) | Literature, PMS, risk file |`,
    tr
      ? `| Klinik performans | Amaçlanan kullanım için yeterli etkinlik | Literatür, eşdeğerlik, PMCF |`
      : `| Clinical performance | Adequate efficacy for intended purpose | Literature, equivalence, PMCF |`,
    tr
      ? `| Kullanılabilirlik | Hedef kullanıcı için güvenli kullanım | Risk dosyası, PMS |`
      : `| Usability | Safe use for intended user | Risk file, PMS |`,
  ].join("\n");
}

/** MDCG 2020-1 core sections (stored in `plan` field). */
export function buildCepCore(input: CepBuildInput): string {
  const { locale, product: p, risks, planNotes } = input;
  const tr = locale === "tr";
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
          tr ? "## 11. Klinik değerlendirme ekibi" : "## 11. Clinical evaluation team",
          "",
          tr ? "- Klinik değerlendirme sorumlusu (ünvan, eğitim, deneyim)" : "- Clinical evaluation lead (qualifications, experience)",
          tr ? "- Risk yönetimi / tasarım temsilcisi" : "- Risk management / design representative",
          tr ? "- Düzenleyici işler ve PMS sorumlusu" : "- Regulatory affairs and PMS owner",
          tr ? "- Gerekirse klinik danışman / PRRC" : "- Clinical advisor / PRRC as required",
        ].join("\n");

  return [
    tr ? "## 1. Giriş ve kapsam" : "## 1. Introduction and scope",
    tr
      ? `Bu Klinik Değerlendirme Planı (CEP), **MDCG 2020-1** ve MDR Ek XIV Bölüm A'ya uygun olarak **${p.name}** için hazırlanmıştır.`
      : `This Clinical Evaluation Plan (CEP) is prepared for **${p.name}** per **MDCG 2020-1** and MDR Annex XIV Part A.`,
    tr
      ? "CEP, klinik değerlendirme sürecinin planlanması, veri toplama, değerlendirme ve güncelleme döngüsünü tanımlar; CER bu plana göre yürütülür."
      : "The CEP defines planning, data collection, appraisal and update cycle for clinical evaluation; the CER is executed per this plan.",
    "",
    tr ? "## 2. Cihaz tanımlama" : "## 2. Device identification",
    tr ? `- **Ticari ad:** ${p.name}` : `- **Trade name:** ${p.name}`,
    p.brand?.trim() ? (tr ? `- **Marka:** ${p.brand}` : `- **Brand:** ${p.brand}`) : "",
    p.model?.trim() ? (tr ? `- **Model:** ${p.model}` : `- **Model:** ${p.model}`) : "",
    p.emdnCode?.trim() ? `- **EMDN:** ${p.emdnCode}` : "",
    p.basicUdiDi?.trim() ? `- **UDI-DI:** ${p.basicUdiDi}` : tr ? "- **UDI-DI:** _Teknik dosyadan tamamlanacak_" : "- **UDI-DI:** _Complete from technical file_",
    tr ? `- **MDR sınıfı:** ${p.deviceClass}` : `- **MDR class:** ${p.deviceClass}`,
    tr
      ? `- **Amaçlanan kullanım:** ${p.intendedPurpose?.trim() || "—"}`
      : `- **Intended purpose:** ${p.intendedPurpose?.trim() || "—"}`,
    tr ? `- **Endikasyonlar:** ${p.indications?.trim() || "—"}` : `- **Indications:** ${p.indications?.trim() || "—"}`,
    tr
      ? `- **Kontrendikasyonlar:** ${p.contraindications?.trim() || "—"}`
      : `- **Contraindications:** ${p.contraindications?.trim() || "—"}`,
    tr
      ? `- **Hasta popülasyonu:** ${p.patientPopulation?.trim() || "—"}`
      : `- **Patient population:** ${p.patientPopulation?.trim() || "—"}`,
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
    tr ? "## 2.1 Cihaz ailesi / varyant gerekçesi" : "## 2.1 Device family / variant rationale",
    variantFamilyBlock(input),
    "",
    tr ? "## 3. Klinik veri gerektiren GSPR'ler" : "## 3. GSPRs requiring clinical data",
    tr
      ? "_MDR Ek I GSPR maddeleri — klinik değerlendirme ile adreslenecekler:_"
      : "_MDR Annex I GSPRs — to be addressed by clinical evaluation:_",
    "",
    tr ? "| GSPR | Gereklilik | Klinik kanıt yaklaşımı |" : "| GSPR | Requirement | Clinical evidence approach |",
    "| --- | --- | --- |",
    ...gsprClinicalRows(input),
    "",
    tr ? "## 4. Klinik değerlendirme türü" : "## 4. Type of clinical evaluation",
    evaluationRoute(input),
    "",
    clinicalOutcomesBlock(input).replace(
      tr ? "## 5. Beklenen klinik sonuç parametreleri" : "## 5. Expected clinical outcome parameters",
      tr ? "## 4.1 Beklenen klinik sonuç parametreleri" : "## 4.1 Expected clinical outcome parameters",
    ),
    "",
    tr ? "## 5. Literatür inceleme planı" : "## 5. Literature review plan",
    input.literatureData?.preparedByMedDoc
      ? tr
        ? "MDRpilot literatür protokolü hazırlanmıştır — ayrıntılar **Ek A**'da. Ulusal kayıt taraması literatür sekmesinde."
        : "MDRpilot literature protocol prepared — details in **Annex A**. National registry search in Literature tab."
      : tr
        ? "Literatür protokolü (PICO, veri tabanları, dahil/hariç kriterler) Literatür sekmesinde tanımlanacaktır."
        : "Literature protocol (PICO, databases, inclusion/exclusion) to be defined in Literature tab.",
    "",
    tr ? "## 6. Eşdeğerlik gösterimi" : "## 6. Equivalence demonstration",
    (input.equivalentDevicesData?.devices.length ?? 0) > 0
      ? tr
        ? `${input.equivalentDevicesData!.devices.length} eşdeğer/benzer cihaz tanımlandı — **Ek B**.`
        : `${input.equivalentDevicesData!.devices.length} equivalent/similar device(s) defined — see **Annex B**.`
      : tr
        ? "Eşdeğerlik iddiası yok veya henüz tanımlanmadı."
        : "No equivalence claim or not yet defined.",
    "",
    tr ? "## 7. Klinik araştırma" : "## 7. Clinical investigation",
    tr
      ? "Ön-pazar klinik araştırma planlanmamıştır / gerekli değildir (literatür + eşdeğerlik + PMS yeterli). Gerekirse bu bölüm güncellenir."
      : "No pre-market clinical investigation planned / not required (literature + equivalence + PMS sufficient). Update if needed.",
    "",
    tr ? "## 8. Klinik veri değerlendirme kriterleri" : "## 8. Appraisal criteria for clinical data",
    tr
      ? "- Bilimsel geçerlilik, istatistiksel güvenilirlik, klinik uygunluk (MEDDEV 2.7/1 Stage 3)"
      : "- Scientific validity, statistical reliability, clinical relevance (MEDDEV 2.7/1 Stage 3)",
    tr ? "- Kalite: Yüksek / Orta / Düşük (PRISMA dahil çalışmalar)" : "- Quality: High / Medium / Low (PRISMA included studies)",
    tr ? "- Cihaza özgü veri ağırlığı > genel veri" : "- Device-specific data weighted above general data",
    "",
    tr ? "## 9. Klinik veri analizi planı" : "## 9. Clinical data analysis plan",
    tr
      ? "- Literatür ve kayıt bulgularının sentezi (CER klinik veri özeti)"
      : "- Synthesis of literature and registry findings (CER clinical data summary)",
    tr ? "- Fayda-risk analizi — risk dosyası ile tutarlılık" : "- Benefit-risk analysis — aligned with risk file",
    tr ? `- Risk dosyası: ${risks.length} FMEA satırı` : `- Risk file: ${risks.length} FMEA row(s)`,
    risks.length > 0 ? riskHeader : "",
    ...riskRows,
    "",
    tr ? "## 10. PMCF planı" : "## 10. PMCF plan",
    input.pmsPmcfInputs?.trim()
      ? tr
        ? "PMCF girdileri tanımlı — özet **Ek C**'de. PMS/PMCF sekmesinden senkronize edilir."
        : "PMCF inputs defined — summary in **Annex C**. Sync from PMS/PMCF tab."
      : tr
        ? "PMCF planı PMS modülünden veya PMS/PMCF sekmesinden tamamlanacaktır (MDCG 2020-7)."
        : "PMCF plan to be completed from PMS module or PMS/PMCF tab (MDCG 2020-7).",
    "",
    teamBlock,
    "",
    tr ? "## 12. Risk yönetimi dosyası" : "## 12. Risk management file",
    tr
      ? "Klinik değerlendirme ISO 14971 risk yönetimi dosyası ile entegre edilir. Artık riskler klinik fayda-risk değerlendirmesine girdi oluşturur."
      : "Clinical evaluation is integrated with the ISO 14971 risk management file. Residual risks feed the clinical benefit-risk assessment.",
    "",
    tr ? "## 13. Takvim ve kilometre taşları" : "## 13. Schedule and milestones",
    tr
      ? `- Literatür tarama: ${input.literatureData?.searchDate || "[tarih]"}`
      : `- Literature search: ${input.literatureData?.searchDate || "[date]"}`,
    tr ? "- CEP onayı: _[tarih / imza]_" : "- CEP approval: _[date / signature]_",
    tr ? "- CER ilk onay: _[tarih]_" : "- Initial CER approval: _[date]_",
    tr ? "- Planlı gözden geçirme: en az yılda bir veya PMS sinyali / önemli değişiklik" : "- Planned review: at least annually or on PMS signal / significant change",
    tr ? "- PSUR / PMS raporu sonrası CER güncellemesi" : "- CER update after PSUR / PMS report",
    "",
    tr ? "## 14. Sınıf ve orantılılık" : "## 14. Class and proportionality",
    classNote,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Full CEP document with annexes (export). */
export function buildCepDocument(input: CepBuildInput): string {
  const core = buildCepCore(input);
  const annexes = [literatureAnnex(input), equivalenceAnnex(input), pmcfAnnex(input)].filter(Boolean);
  if (!annexes.length) return core;
  return [core, "", "---", "", ...annexes].join("\n");
}
