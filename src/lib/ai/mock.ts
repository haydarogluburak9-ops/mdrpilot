import { CHANGE_CONTROL_CLAUSE_REFS, DISCLAIMER } from "@/lib/domain/constants";
import { buildRuleBasedCerDraft } from "@/lib/domain/clinical-cer-builder";
import { isChangeControlQmsDoc } from "@/lib/qms/change-control-guidance";
import { isOrganizationQmsDoc } from "@/lib/qms/organization-procedure-guidance";
import { getRuleBasedChildContent } from "@/lib/qms/rule-based-child-content";
import { SOP_ORG_ROLES_SECTION_EN, SOP_ORG_ROLES_SECTION_TR } from "@/lib/qms/sop-org-role-text";
import type { AiResult } from "./types";
import type { ProductInput } from "./prompts/input";
import type { PromptId } from "./prompts";

// Deterministic, regulation-aware mock generators.
// Used when AI_PROVIDER=mock OR as a graceful fallback if the live provider fails
// or returns malformed JSON. Output is good enough to drive the full UI offline.

function base(partial: Partial<AiResult>): AiResult {
  return {
    summary: "",
    complianceStatus: "partial",
    missingItems: [],
    risks: [],
    recommendedDocuments: [],
    regulatoryReferences: [],
    confidence: 0.72,
    disclaimer: DISCLAIMER,
    ...partial,
  };
}

function isHigherClass(deviceClass: string): boolean {
  return /IIA|IIB|III/i.test(deviceClass);
}

const generators: Record<PromptId, (input: any) => AiResult> = {
  "technical-file": (p: ProductInput) =>
    base({
      summary: `MDR Annex II/III gap analysis for ${p.name} (${p.deviceClass}). Core structure identified; several evidence sections still required.`,
      missingItems: [
        p.isSterile ? "Sterilization validation report (ISO 11135/11137)" : null,
        p.isSterile ? "Packaging validation (ISO 11607-1/-2)" : null,
        "Biocompatibility evaluation (ISO 10993-1)",
        p.containsSoftware ? "Software validation file (IEC 62304)" : null,
        "Clinical Evaluation Report (CER)",
        "PMS plan and PMCF plan",
      ].filter(Boolean) as string[],
      recommendedDocuments: [
        "Device Description & Specification",
        "Risk Management File (ISO 14971)",
        "Declaration of Conformity (Annex IV)",
      ],
      regulatoryReferences: ["MDR 2017/745 Annex II", "MDR 2017/745 Annex III"],
      data: { sectionsAnalysed: 19 },
    }),

  gspr: (p: ProductInput) =>
    base({
      summary: `Suggested applicable GSPR (MDR Annex I) clauses for ${p.name}.`,
      missingItems: [
        "GSPR 10.1 biocompatibility evidence",
        p.isSterile ? "GSPR 11.2/11.4 sterilization evidence" : "GSPR 11.1 microbial control rationale",
        "GSPR 23.4 IFU completeness",
      ],
      recommendedDocuments: ["GSPR checklist with linked evidence"],
      regulatoryReferences: ["MDR 2017/745 Annex I"],
      data: {
        items: [
          { gsprNo: "1", applicable: "YES", standardReference: "ISO 14971", evidenceNeeded: "Risk management file" },
          { gsprNo: "10.1", applicable: "YES", standardReference: "ISO 10993-1", evidenceNeeded: "Biological evaluation" },
          ...(p.isSterile
            ? [{ gsprNo: "11.2", applicable: "YES", standardReference: "ISO 11135", evidenceNeeded: "EO sterilization validation" }]
            : []),
          ...(p.hasMeasuringFn
            ? [{ gsprNo: "19.1", applicable: "YES", standardReference: "—", evidenceNeeded: "Measurement accuracy verification" }]
            : []),
          ...(p.containsSoftware
            ? [{ gsprNo: "17.1", applicable: "YES", standardReference: "IEC 62304", evidenceNeeded: "Software lifecycle records" }]
            : []),
        ],
      },
    }),

  risk: (p: ProductInput) => {
    const tr = (p as ProductInput & { _locale?: string })._locale === "tr";
    const templateMitigations = (
      design: string,
      production: string,
      postMarket: string,
      designP: number,
      prodP: number,
      postP: number,
    ) => [
      { category: "DESIGN", actions: design, residualSeverity: 5, residualProbability: designP },
      { category: "PRODUCTION", actions: production, residualSeverity: 5, residualProbability: prodP },
      { category: "POST_MARKET", actions: postMarket, residualSeverity: 5, residualProbability: postP },
    ];

    const risks: Array<Record<string, unknown>> = [];
    if (p.isSterile && /EO/i.test(p.sterilization ?? "")) {
      risks.push({
        hazardousSituation: tr
          ? "Yüksek sıcaklıkta depolama nedeniyle ürün bozulması"
          : "Product deterioration due to high-temperature storage",
        harm: tr
          ? "Enflamasyon, enfeksiyon, toksik etki, ateş, alerji, doku hasarı"
          : "Inflammation, infection, toxic effect, fever, allergy, tissue damage",
        riskSource: tr
          ? "Tanımlanmamış depolama ve sevkiyat parametreleri"
          : "Unidentified storage and shipment parameters",
        severity: 5,
        probability: 3,
        mitigations: templateMitigations(
          tr
            ? "ISO 13485, ISO 14644, ISO 11607; sterilizasyon validasyonu (Referans: RP-00.02)"
            : "ISO 13485, ISO 14644, ISO 11607; sterilization validation (Ref: RP-00.02)",
          tr
            ? "Proses kontrolleri; üretim emri ve kalite kayıtları (FO-202)"
            : "Process controls; production order and quality records (FO-202)",
          tr
            ? "Etiketleme ve kullanım kılavuzu uyarıları"
            : "Labelling and user manual warnings",
          2,
          1,
          1,
        ),
        residualAssessment: tr
          ? "Alınan önlemler sonrası artık risk kabul edilebilir düzeydedir."
          : "Residual risk after measures is at an acceptable level.",
        benefitRiskJustification: tr
          ? "Ürünün klinik faydası, kalan riskleri aşmaktadır; risk/fayda analizi olumludur."
          : "Clinical benefit outweighs remaining risks; benefit-risk analysis is favourable.",
      });
      risks.push({
        hazardousSituation: tr ? "Steril bariyerin bozulması" : "Compromised sterile barrier",
        harm: tr ? "Enfeksiyon" : "Infection",
        riskSource: tr ? "Paketleme ve taşıma hasarı" : "Packaging and transport damage",
        severity: 5,
        probability: 2,
        mitigations: templateMitigations(
          tr ? "ISO 11607 paketleme validasyonu" : "ISO 11607 packaging validation",
          tr ? "Sızdırmazlık testi ve lot kontrolü" : "Seal integrity testing and lot control",
          tr ? "IFU depolama koşulları" : "IFU storage conditions",
          2,
          1,
          1,
        ),
        residualAssessment: tr ? "Artık risk kabul edilebilir." : "Residual risk acceptable.",
        benefitRiskJustification: tr ? "Fayda-risk dengesi olumludur." : "Benefit-risk balance favourable.",
      });
    }
    if (p.isInvasive) {
      risks.push({
        hazardousSituation: tr ? "Yanlış yerleştirme" : "Incorrect insertion",
        harm: tr ? "Yerel yaralanma / kanama" : "Local injury / bleeding",
        riskSource: tr ? "Kullanıcı hatası / eğitim eksikliği" : "User error / insufficient training",
        severity: 3,
        probability: 3,
        mitigations: templateMitigations(
          tr ? "Atraumatik uç tasarımı" : "Atraumatic tip design",
          tr ? "Üretim kalite kontrolü" : "Production QC",
          tr ? "IFU uyarıları ve eğitim materyali" : "IFU warnings and training material",
          2,
          2,
          1,
        ),
        residualAssessment: tr ? "Artık risk kabul edilebilir." : "Residual risk acceptable.",
      });
    }
    if (p.containsSoftware) {
      risks.push({
        hazardousSituation: tr ? "Hatalı yazılım çıktısı" : "Erroneous software output",
        harm: tr ? "Yanlış tanı / gecikmiş tedavi" : "Misdiagnosis / delayed therapy",
        riskSource: tr ? "Yazılım hatası veya siber tehdit" : "Software defect or cyber threat",
        severity: 4,
        probability: 2,
        mitigations: templateMitigations(
          tr ? "IEC 62304 doğrulama" : "IEC 62304 verification",
          tr ? "Sürüm kontrolü ve test kayıtları" : "Version control and test records",
          tr ? "IEC 81001-5-1 siber güvenlik" : "IEC 81001-5-1 cybersecurity",
          2,
          1,
          1,
        ),
        residualAssessment: tr ? "Artık risk kabul edilebilir." : "Residual risk acceptable.",
      });
    }
    if (risks.length === 0) {
      risks.push({
        hazardousSituation: tr ? "Uzun süreli materyal teması" : "Prolonged material contact",
        harm: tr ? "İrritasyon / duyarlılık" : "Irritation / sensitisation",
        riskSource: tr ? "Biyouyumluluk verisi eksikliği" : "Insufficient biocompatibility data",
        severity: 3,
        probability: 2,
        mitigations: templateMitigations(
          tr ? "ISO 10993 biyolojik değerlendirme" : "ISO 10993 biological evaluation",
          tr ? "Hammadde kontrolü" : "Raw material control",
          tr ? "IFU kontrendikasyonlar" : "IFU contraindications",
          2,
          1,
          1,
        ),
        residualAssessment: tr ? "Artık risk kabul edilebilir." : "Residual risk acceptable.",
      });
    }

    const existing = (p.extra ?? "").toLowerCase();
    const novel = risks.filter((r) => {
      const label = String(r.hazardousSituation ?? "").toLowerCase();
      return label && !existing.includes(label.slice(0, 40));
    });
    const proposed = novel.length > 0 ? novel : risks;
    const hasTable = /existing risk table \(\d+ items\)/i.test(p.extra ?? "") && !/empty/i.test(p.extra ?? "");
    return base({
      summary: hasTable
        ? `ISO 14971 audit for ${p.name}: ${proposed.length} additional hazard(s) proposed; review gaps below.`
        : `ISO 14971 audit for ${p.name}: initial hazard set proposed (${proposed.length} items).`,
      missingItems: [
        "Process-FMEA / Design-FMEA linkage",
        "Benefit-risk justification for residual risks",
        p.isSterile ? "Sterilization validation summary (ISO 11135/11137)" : null,
        "Verification records for each risk control",
      ].filter(Boolean) as string[],
      risks: proposed.map((r) => `${r.hazardousSituation} → ${r.harm}`),
      regulatoryReferences: ["ISO 14971:2019", "MDR Annex I 1-8"],
      confidence: 0.7,
      data: { risks: proposed },
    });
  },

  ifu: (p: ProductInput & { _locale?: string }) => {
    const tr = p._locale === "tr";
    const purpose = p.intendedPurpose?.trim() || (tr ? `${p.name} için tanımlanan kullanım amacına uygun kullanım.` : `Use per the defined intended purpose for ${p.name}.`);
    const warnings = [
      p.isSterile
        ? tr
          ? "Ambalaj hasarlı veya açılmışsa kullanmayın."
          : "Do not use if package is damaged or open."
        : tr
          ? "Kullanmadan önce cihazı görsel olarak kontrol edin."
          : "Inspect the device before use.",
      tr ? "Tek kullanımlıktır; yeniden kullanmayın veya yeniden sterilize etmeyin." : "Single use — do not reuse or re-sterilize.",
      ...(p.isInvasive
        ? [tr ? "Yalnızca eğitimli sağlık personeli tarafından kullanılmalıdır." : "For trained healthcare professionals only."]
        : []),
    ];
    const precautions = [
      tr ? "Son kullanma tarihini kontrol edin." : "Check the expiry date.",
      tr ? "Steril bariyer hasarlıysa kullanmayın." : "Do not use if sterile barrier is compromised.",
      tr ? "Kuru ve temiz ortamda saklayın." : "Store in a dry, clean place.",
    ];
    return base({
      summary: tr
        ? `${p.name} için IFU taslağı ve risk/IFU uyum kontrolü.`
        : `IFU draft and risk/IFU alignment check for ${p.name}.`,
      missingItems: tr
        ? ["ISO 15223-1 sembolleri", "Bertaraf talimatları", "Üretici / UDI bloğu"]
        : ["Symbols per ISO 15223-1", "Disposal instructions", "Manufacturer / UDI block"],
      regulatoryReferences: ["MDR Annex I 23.4", "ISO 15223-1"],
      data: {
        ifu: {
          intendedPurpose: purpose,
          indications: p.indications?.trim() || (tr ? "Ürün dosyasındaki endikasyonlara uygun kullanın." : "Use per indications in the product dossier."),
          contraindications: p.contraindications?.trim() || (tr ? "Ürün dosyasındaki kontrendikasyonlara dikkat edin." : "Observe contraindications in the product dossier."),
          warnings,
          precautions,
          instructions: tr
            ? `${p.name} yalnızca tanımlanan amaç için kullanılmalıdır. Aseptik tekniğe uyun.`
            : `Use ${p.name} only for the stated purpose. Follow aseptic technique.`,
          storage: tr ? "15–25 °C arasında, kuru ortamda saklayın." : "Store at 15–25 °C in a dry place.",
          sterilityInfo: p.isSterile
            ? tr
              ? `${p.sterilization ?? "EO"} ile sterilize edilmiştir. Tek kullanımlıktır.`
              : `Sterilized by ${p.sterilization ?? "EO"}. Single use.`
            : tr
              ? "Steril değildir."
              : "Non-sterile.",
          disposal: tr
            ? "Yerel tıbbi atık mevzuatına uygun bertaraf edin."
            : "Dispose per local medical waste regulations.",
        },
        labelCaution: tr
          ? "Kullanmadan önce kullanım talimatını okuyunuz. Hasarlı ambalajı kullanmayınız."
          : "Read the IFU before use. Do not use damaged packaging.",
      },
    });
  },

  cer: (p: ProductInput) => {
    const tr = (p as ProductInput & { _locale?: string })._locale === "tr";
    const sections = buildRuleBasedCerDraft({
      locale: tr ? "tr" : "en",
      product: {
        name: p.name,
        deviceClass: p.deviceClass,
        intendedPurpose: p.intendedPurpose,
        indications: p.indications,
        contraindications: p.contraindications,
        materials: p.materials,
        isSterile: !!p.isSterile,
        sterilization: p.sterilization,
        containsSoftware: !!p.containsSoftware,
        isInvasive: !!p.isInvasive,
        hasMeasuringFn: !!p.hasMeasuringFn,
        bodyContactDuration: p.bodyContactDuration,
        userProfile: undefined,
      },
      risks: [],
    });
    return base({
      summary: tr
        ? `${p.name} için MDR Ek XIV uyumlu klinik değerlendirme taslağı (8 bölüm) oluşturuldu. Literatür taraması ve eşdeğerlik kanıtları tamamlanmalıdır.`
        : `Clinical evaluation draft (8 sections) for ${p.name} per MDR Annex XIV. Literature search and equivalence evidence still required.`,
      missingItems: [
        tr ? "Literatür taramasının yürütülmesi ve PRISMA kaydı" : "Execute literature search and PRISMA log",
        tr ? "Klinik veri kalite değerlendirmesi" : "Clinical data quality appraisal",
        tr ? "Eşdeğerlik iddiası varsa üçlü analiz kanıtı" : "Three-pillar equivalence evidence if claimed",
        isHigherClass(p.deviceClass)
          ? tr
            ? "PMCF planı ve PSUR süreci"
            : "PMCF plan and PSUR process"
          : tr
            ? "PMS raporu ve PMCF gerekçesi"
            : "PMS report and PMCF justification",
      ],
      complianceStatus: isHigherClass(p.deviceClass) ? "partial" : "partial",
      regulatoryReferences: ["MDR Annex XIV Part A", "MEDDEV 2.7/1 rev 4", "MDCG 2020-6"],
      data: {
        cer: {
          ...sections,
          equivalenceEvidence: [
            tr ? "Klinik eşdeğerlik kanıtı" : "Clinical equivalence evidence",
            tr ? "Teknik özellik karşılaştırması" : "Technical characteristic comparison",
            tr ? "Biyolojik / materyal profili" : "Biological / material profile",
          ],
          dataGaps: [
            tr ? "Cihaza özgü klinik veri seti sınırlı" : "Device-specific clinical data limited",
            tr ? "Uzun dönem PMS verisi henüz yok" : "Long-term PMS data not yet available",
          ],
        },
      },
    });
  },

  pms: (p: ProductInput) => {
    const higher = isHigherClass(p.deviceClass);
    return base({
      summary: `PMS/PMCF requirements for ${p.name} (${p.deviceClass}).`,
      regulatoryReferences: ["MDR Art. 83-86", "MDR Annex III", "MDR Annex XIV Part B"],
      missingItems: [higher ? "PSUR (periodic safety update report)" : "PMS report", "PMCF plan / justification"],
      data: {
        pms: {
          activities: ["Complaint handling", "Vigilance reporting", "Literature monitoring", "Trend reporting", "CAPA linkage"],
          reportType: higher ? "PSUR (Art. 86)" : "PMS Report (Art. 85)",
          frequency: higher ? "Annually (min.)" : "As needed / per plan",
        },
        pmcf: {
          needed: higher,
          methods: higher ? ["PMCF study", "Registry data", "Surveys"] : ["Literature monitoring"],
          justification: higher ? "Higher class device - active PMCF expected." : "PMCF waiver may be justified with sufficient existing data.",
        },
      },
    });
  },

  qms: (input: {
    documentTitle: string;
    standard: string;
    clauseRefs?: string;
    documentCode?: string;
    documentLayer?: string;
    _locale?: string;
  }) => {
    const tr = input._locale === "tr";
    const title = input.documentTitle;
    const changeControl = isChangeControlQmsDoc(input.documentCode, title);

    if (changeControl) {
      const sections = tr
        ? [
            {
              heading: "1. Amaç",
              body: `Bu prosedür, ürün, süreç ve KYS değişikliklerinin ISO 13485, MDR Madde 120 ve MDCG 2020-3'e uygun şekilde yönetilmesini tanımlar.`,
            },
            {
              heading: "2. Kapsam",
              body: "Tasarım, üretim, tedarikçi, etiket/IFU, yazılım ve KYS doküman değişiklikleri için geçerlidir.",
            },
            {
              heading: "3. Sorumluluklar",
              body: "Değişiklik başlatan, süreç sahipleri, Kalite Müdürü, tasarım yetkilisi, üst yönetim ve düzenleyici işler sorumlulukları bu prosedürde tanımlanır.",
            },
            {
              heading: "4. Tanımlar",
              body: "Önemli değişiklik (significant change): MDCG 2020-3 ve MDR Madde 120 kapsamında tasarım veya amaçlanan kullanımdaki değişikliklerin güvenlik/performans/fayda-risk açısından değerlendirilmesi.",
            },
            {
              heading: "5. Prosedür",
              body: [
                "5.1 Değişiklik talebi (CR) kaydı",
                "5.2 Etki değerlendirmesi (risk, V&V, klinik, etiket, NB gerekliliği)",
                "5.3 Önemli değişiklik değerlendirmesi (MDCG 2020-3 / Madde 120)",
                "5.4 Onay ve gerektiğinde NB bildirimi",
                "5.5 Uygulama, doküman güncelleme ve eğitim",
                "5.6 Doğrulama ve CR kapatma",
              ].join("\n"),
            },
            {
              heading: "6. Kayıtlar",
              body: "CR formu, etki analizi, önemli değişiklik değerlendirme formu, onay kayıtları, revizyon geçmişi.",
            },
            {
              heading: "7. Referanslar",
              body: `EN ISO 13485 — ${CHANGE_CONTROL_CLAUSE_REFS}; MDR Madde 120; MDCG 2020-3`,
            },
            {
              heading: "8. Revizyon geçmişi",
              body: "Revizyon No: 00 | Tarih: [TBC] | Açıklama: İlk yayın",
            },
          ]
        : [
            { heading: "1. Purpose", body: "Defines change control per ISO 13485, MDR Art. 120 and MDCG 2020-3." },
            { heading: "2. Scope", body: "Design, manufacturing, supplier, labeling/IFU, software and QMS documentation changes." },
            { heading: "3. Responsibilities", body: "Change initiator, process owners, Quality Manager, design authority, top management, regulatory affairs." },
            { heading: "4. Definitions", body: "Significant change: design or intended purpose change assessed per MDCG 2020-3 and MDR Art. 120." },
            {
              heading: "5. Procedure",
              body: "5.1 CR logging\n5.2 Impact assessment\n5.3 Significant change assessment (MDCG 2020-3)\n5.4 Approval / NB notification\n5.5 Implementation and training\n5.6 Verification and closure",
            },
            { heading: "6. Records", body: "CR form, impact analysis, significant change form, approvals, revision history." },
            { heading: "7. References", body: `EN ISO 13485 — ${CHANGE_CONTROL_CLAUSE_REFS}; MDR Art. 120; MDCG 2020-3` },
            { heading: "8. Revision history", body: "Rev 00 | Date: [TBC] | Initial issue" },
          ];
      return base({
        summary: tr
          ? `"${title}" için MDCG 2020-3 uyumlu değişiklik kontrol taslak prosedürü oluşturuldu.`
          : `Change control draft for "${title}" aligned with MDCG 2020-3.`,
        regulatoryReferences: ["EN ISO 13485", "MDR Art. 120", "MDCG 2020-3", CHANGE_CONTROL_CLAUSE_REFS],
        confidence: 0.85,
        data: { document: { sections } },
      });
    }

    const organization = isOrganizationQmsDoc(input.documentCode, title);
    if (organization) {
      const sections = tr
        ? [
            {
              heading: "1. Amaç",
              body: "Kalite yönetim sistemi organizasyonu, raporlama ilişkileri, roller ve sorumlulukların ISO 13485 madde 5.5'e uygun tanımını sağlar.",
            },
            {
              heading: "2. Kapsam",
              body: "KYS kapsamındaki tüm birimler, fonksiyonel sorumlular ve atanmış roller için geçerlidir.",
            },
            {
              heading: "3. Sorumluluklar",
              body: "Üst yönetim organizasyon yapısını onaylar. Kalite Müdürü bu prosedürün uygulanmasını izler. Rol sahipleri atanmış görevleri yürütür.",
            },
            {
              heading: "4. Tanımlar",
              body: "Yönetim Temsilcisi (YT), Person Responsible for Regulatory Compliance (PRRC), rol atama formu (FOR-ORG).",
            },
            {
              heading: "5.1 Organizasyon Yapısı",
              body: [
                "Kalite yönetim sistemi organizasyonu, tıbbi cihaz güvenliği ve MDR/ISO 13485 uygunluğu için yapılandırılmıştır.",
                "Üst yönetim nihai onay otoritesidir; günlük KYS koordinasyonu Kalite Müdürü ve Yönetim Temsilcisi üzerinden yürütülür.",
                "Fonksiyonel sorumlular ilgili prosedürler ve kayıtlar üzerinden faaliyetlerini yürütür.",
              ].join("\n\n"),
            },
            {
              heading: "5.2 Organizasyon Şeması",
              body: [
                "Genel Müdür",
                "├── Yönetim Temsilcisi",
                "├── Kalite Müdürü",
                "│   ├── İç Denetim Sorumlusu",
                "│   ├── Şikâyet Yönetimi Sorumlusu",
                "│   └── Yönetimin Gözden Geçirme Sorumlusu",
                "├── Düzenleyici Sorumlu (PRRC)",
                "├── Üretim Sorumlusu",
                "└── Satın Alma Sorumlusu",
              ].join("\n"),
            },
            {
              heading: "5.3 Roller ve Sorumluluklar",
              body: SOP_ORG_ROLES_SECTION_TR,
            },
            {
              heading: "6. Kayıtlar",
              body: "FOR-ORG Rol Atama Formu, organizasyon şeması çıktısı, yetki devri kayıtları.",
            },
            {
              heading: "7. Referanslar",
              body: "EN ISO 13485:2016 madde 5.5; kalite el kitabı organizasyon bölümü.",
            },
            {
              heading: "8. Revizyon geçmişi",
              body: "Revizyon No: 00 | Tarih: [TBC] | Açıklama: İlk yayın",
            },
          ]
        : [
            { heading: "1. Purpose", body: "Defines QMS organization, reporting lines, roles and responsibilities per ISO 13485 clause 5.5." },
            { heading: "2. Scope", body: "All units and functional owners within the QMS scope." },
            { heading: "3. Responsibilities", body: "Top management approves structure; Quality Manager monitors this procedure; role owners execute assigned duties." },
            { heading: "4. Definitions", body: "Management Representative, PRRC, FOR-ORG Role Assignment Form." },
            {
              heading: "5.1 Organization Structure",
              body: "The QMS organization is structured for medical device safety and MDR/ISO 13485 conformity. Top management is the approval authority; day-to-day coordination is led by the Quality Manager and Management Representative.",
            },
            {
              heading: "5.2 Organization Chart",
              body: "General Manager\n├── Management Representative\n├── Quality Manager\n│   ├── Internal Audit Responsible\n│   ├── Complaint Handling Responsible\n│   └── Management Review Owner\n├── Regulatory Responsible (PRRC)\n├── Production Responsible\n└── Purchasing Responsible",
            },
            {
              heading: "5.3 Roles and Responsibilities",
              body: SOP_ORG_ROLES_SECTION_EN,
            },
            { heading: "6. Records", body: "FOR-ORG Role Assignment Form, organization chart output, delegation records." },
            { heading: "7. References", body: "EN ISO 13485:2016 clause 5.5; quality manual organization section." },
            { heading: "8. Revision history", body: "Rev 00 | Date: [TBC] | Initial issue" },
          ];
      return base({
        summary: tr
          ? `"${title}" için organizasyon ve rol/sorumluluk taslak prosedürü oluşturuldu.`
          : `Organization and roles draft for "${title}".`,
        regulatoryReferences: ["EN ISO 13485", "ISO 13485 clause 5.5"],
        confidence: 0.85,
        data: { document: { sections } },
      });
    }

    const code = input.documentCode?.trim().toUpperCase();
    const locale = tr ? "tr" : "en";
    const ruleChild = getRuleBasedChildContent({
      code,
      title,
      layer: input.documentLayer,
      locale,
      parentProcedureCode: null,
      clauseRefs: input.clauseRefs ?? null,
    });
    if (ruleChild) {
      const isForm = code?.startsWith("FORM-") || input.documentLayer === "FORM";
      return base({
        summary: tr
          ? isForm
            ? `"${title}" için kontrollü form şablonu oluşturuldu.`
            : "Danışma / FSCA karar akışı şeması oluşturuldu."
          : isForm
            ? `Controlled form template for "${title}".`
            : "Advisory / FSCA decision flow diagram created.",
        regulatoryReferences: ["EN ISO 13485", input.clauseRefs ?? ""].filter(Boolean),
        confidence: 0.95,
      data: {
        document: {
          sections: [
              {
                heading: tr ? (isForm ? "Form şablonu" : "Akış özeti") : isForm ? "Form template" : "Flow summary",
                body: ruleChild,
              },
          ],
        },
      },
      });
    }

    const sections = tr
      ? [
          {
            heading: "1. Amaç",
            body: `Bu prosedür, ${title} kapsamında ${input.standard} gerekliliklerine uygun faaliyetlerin planlanması, uygulanması ve sürdürülmesini tanımlar.`,
          },
          {
            heading: "2. Kapsam",
            body: "Bu prosedür, kalite yönetim sistemi kapsamındaki ilgili tüm süreçler, birimler ve personel için geçerlidir.",
          },
          {
            heading: "3. Sorumluluklar",
            body: "Genel Müdür, Kalite Müdürü, süreç sahipleri ve ilgili personel bu prosedürde tanımlanan sorumlulukları yerine getirir.",
          },
          {
            heading: "4. Tanımlar",
            body: "Bu prosedürde kullanılan terimler kalite el kitabı ve ilgili standart tanımlarına uygun olarak yorumlanır.",
          },
          {
            heading: "5. Prosedür",
            body: [
              "5.1 Gerekliliklerin belirlenmesi ve kayıt altına alınması.",
              "5.2 Planlanan adımların uygulanması ve kontrol noktalarının izlenmesi.",
              "5.3 Uygunsuzlukların kaydı, değerlendirilmesi ve gerekli düzeltici faaliyetlerin başlatılması.",
              "5.4 Sonuçların gözden geçirilmesi ve etkinliğin periyodik değerlendirilmesi.",
            ].join("\n"),
          },
          {
            heading: "6. Kayıtlar",
            body: "Bu prosedürden oluşan kayıtlar Kayıtların Kontrolü Prosedürüne uygun olarak saklanır ve erişilebilir tutulur.",
          },
          {
            heading: "7. Referanslar",
            body: [input.standard, input.clauseRefs].filter(Boolean).join(" — "),
          },
          {
            heading: "8. Revizyon geçmişi",
            body: "Revizyon No: 00 | Tarih: [TBC] | Açıklama: İlk yayın",
          },
        ]
      : [
          { heading: "1. Purpose", body: `Defines activities for ${title} in accordance with ${input.standard}.` },
          { heading: "2. Scope", body: "Applies to all relevant QMS processes and personnel." },
          { heading: "3. Responsibilities", body: "General Manager, Quality Manager, and process owners." },
          { heading: "4. Definitions", body: "Terms follow the quality manual and applicable standards." },
          {
            heading: "5. Procedure",
            body: "5.1 Define requirements.\n5.2 Execute planned steps.\n5.3 Record and evaluate nonconformities.\n5.4 Review effectiveness.",
          },
          { heading: "6. Records", body: "Records are maintained per the Record Control Procedure." },
          { heading: "7. References", body: [input.standard, input.clauseRefs].filter(Boolean).join(" — ") },
          { heading: "8. Revision history", body: "Rev 00 | Date: [TBC] | Initial issue" },
        ];
    return base({
      summary: tr
        ? `"${title}" için taslak prosedür oluşturuldu (${input.standard}).`
        : `Draft for "${title}" (${input.standard}).`,
      regulatoryReferences: [input.standard + (input.clauseRefs ? ` ${input.clauseRefs}` : "")],
      confidence: 0.8,
      data: { document: { sections } },
    });
  },

  "audit-readiness": (input: { productName: string; score: number; breakdown: { label: string; value: number }[] }) => {
    const weak = input.breakdown.filter((b) => b.value < 70).map((b) => b.label);
    return base({
      summary: `${input.productName} is approximately ${input.score}% ready for an MDR/ISO 13485 audit. Most critical gaps: ${weak.slice(0, 3).join(", ") || "none major"}.`,
      complianceStatus: input.score >= 80 ? "compliant" : input.score >= 50 ? "partial" : "non_compliant",
      missingItems: weak,
      confidence: 0.75,
      regulatoryReferences: ["MDR Annex II", "ISO 13485:2016"],
      data: {
        actions: weak.map((w) => ({ priority: "high", action: `Close gap: ${w}` })),
      },
    });
  },

  "file-analysis": (input: { fileName: string; mimeType: string }) =>
    base({
      summary: `Classified "${input.fileName}". Likely a regulatory evidence document.`,
      confidence: 0.6,
      recommendedDocuments: ["Link to relevant GSPR clause", "Attach to technical file section"],
      data: {
        documentType: /report/i.test(input.fileName) ? "Test report" : "Supporting document",
        suggestedGspr: ["10.1", "11.2"],
        evidenceFor: ["Biocompatibility", "Sterilization"],
      },
    }),
};

export function mockGenerate(promptId: PromptId, input: unknown): AiResult {
  const gen = generators[promptId];
  return gen(input);
}
