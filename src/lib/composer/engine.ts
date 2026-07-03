import "server-only";
import { z } from "zod";
import type { DocumentComposerType } from "@prisma/client";
import { DISCLAIMER, CHANGE_CONTROL_CLAUSE_REFS } from "@/lib/domain/constants";
import { getMeteredAiProvider, aiProviderInfo, extractJson } from "@/lib/ai/provider-factory";
import { AiTokenLimitError } from "@/lib/auth/errors";
import { documentComposerPrompt } from "@/lib/ai/prompts/document-composer.prompt";
import type { RetrievedClause } from "@/lib/rag/types";
import { COMPOSER_TYPE_LABEL, COMPOSER_TYPE_STANDARD, type ComposerLanguage } from "./types";
import { buildQualityManualSectionsFromWizard } from "@/lib/wizards/quality-manual/quality-manual-sections";

export const composerSectionSchema = z.object({
  heading: z.string(),
  content: z.string(),
  evidenceRefs: z.array(z.string()).default([]),
  requiresConfirmation: z.boolean().default(false),
});

export const composerCitationSchema = z.object({
  standardCode: z.string(),
  clauseNo: z.string(),
  reason: z.string().default(""),
  confidence: z.number().min(0).max(1).default(0.5),
});

export const composerResultSchema = z.object({
  title: z.string(),
  documentType: z.string(),
  language: z.enum(["tr", "en"]).default("en"),
  markdown: z.string(),
  sections: z.array(composerSectionSchema).default([]),
  missingInformation: z.array(z.string()).default([]),
  complianceGaps: z.array(z.string()).default([]),
  consistencyWarnings: z.array(z.string()).default([]),
  evidenceUsed: z.array(z.string()).default([]),
  recommendedNextActions: z.array(z.string()).default([]),
  citations: z.array(composerCitationSchema).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
  disclaimer: z.string().default(DISCLAIMER),
});

export type ComposerResult = z.infer<typeof composerResultSchema>;
export type ComposerSection = z.infer<typeof composerSectionSchema>;

export interface ComposerContext {
  companyId: string;
  company: { name: string; legalName: string | null; country: string | null; notifiedBody: string | null };
  product: {
    name: string; brand: string | null; model: string | null; deviceClass: string;
    basicUdiDi: string | null; udiDi: string | null; intendedPurpose: string | null;
    indications: string | null; contraindications: string | null; isSterile: boolean;
    sterilization: string; isInvasive: boolean; containsSoftware: boolean; hasMeasuringFn: boolean;
    materials: string | null; packagingType: string | null; shelfLife: string | null; appliedStandards: string | null;
  } | null;
  gspr: { gsprNo: string; requirementSummary: string; status: string; applicable: string; evidenceFiles: string[] }[];
  risks: { hazard: string; harm: string | null; initialRiskLevel: string; residualRiskLevel: string; riskControlMeasure: string | null; evidenceFiles: string[] }[];
  sections: { title: string; status: string; evidenceFiles: string[] }[];
  qmsDocs: { code: string | null; title: string; standard: string; status: string }[];
  files: { fileName: string; documentKind: string; analysisSummary: string | null }[];
  linkedEvidence: { fileName: string; documentKind: string; target: string; analysisSummary: string | null }[];
  clauses: RetrievedClause[];
}

export interface ComposerOptions {
  type: DocumentComposerType;
  language: ComposerLanguage;
  title?: string;
  instructions?: string;
  /** When set, ISO 13485/9001 quality manuals use wizard intake for section bodies. */
  wizardAnswers?: Record<string, unknown>;
  /** Full KYS docs with content for QM manual assembly. */
  wizardKysDocs?: Array<{ code: string | null; title: string; content: string | null; status: string; standard?: string }>;
}

const L = (lang: ComposerLanguage, en: string, tr: string) => (lang === "tr" ? tr : en);
const TBC = "[TO BE CONFIRMED]";

type RawSection = { heading: string; content: string; evidenceRefs?: string[]; requiresConfirmation?: boolean };

// ---------------- Section blueprints ----------------

function procedureSections(label: string, standard: string, ctx: ComposerContext, lang: ComposerLanguage): RawSection[] {
  const co = ctx.company.name;
  return [
    { heading: L(lang, "1. Purpose", "1. Amaç"), content: L(lang,
      `This procedure defines the methodology used by ${co} to ensure ${label.toLowerCase()} activities are performed in a controlled and consistent manner in accordance with ${standard}.`,
      `Bu prosedür, ${co} bünyesinde ${label.toLowerCase()} faaliyetlerinin ${standard} gerekliliklerine uygun, kontrollü ve tutarlı şekilde yürütülmesini tanımlar.`) },
    { heading: L(lang, "2. Scope", "2. Kapsam"), content: L(lang,
      `This procedure applies to all processes, personnel and records of ${co} that fall within the scope of its quality management system.`,
      `Bu prosedür, ${co} kalite yönetim sistemi kapsamındaki tüm süreçler, personel ve kayıtlar için geçerlidir.`) },
    { heading: L(lang, "3. Responsibilities", "3. Sorumluluklar"), content: L(lang,
      `The Quality Manager is responsible for maintaining this procedure. Process owners are responsible for execution. Top management ensures adequate resources. Specific role assignments: ${TBC}.`,
      `Bu prosedürün güncelliğinden Kalite Yöneticisi sorumludur. Süreç sahipleri uygulamadan, üst yönetim kaynakların sağlanmasından sorumludur. Spesifik rol atamaları: ${TBC}.`), requiresConfirmation: true },
    { heading: L(lang, "4. Definitions and References", "4. Tanımlar ve Referanslar"), content: L(lang,
      `Applicable references: ${standard}. Terms and definitions follow ISO 9000 and ISO 13485 unless otherwise stated.`,
      `Geçerli referanslar: ${standard}. Terimler ve tanımlar aksi belirtilmedikçe ISO 9000 ve ISO 13485'e göredir.`) },
    { heading: L(lang, "5. Procedure", "5. Prosedür"), content: L(lang,
      `The process is executed in the following stages: input identification, planning, execution with defined acceptance criteria, verification, recording, and review. Each stage shall be documented with objective evidence. Process-specific steps and acceptance criteria: ${TBC}.`,
      `Süreç şu aşamalarda yürütülür: girdilerin belirlenmesi, planlama, tanımlı kabul kriterleriyle uygulama, doğrulama, kayıt ve gözden geçirme. Her aşama nesnel kanıtla belgelenir. Sürece özgü adımlar ve kabul kriterleri: ${TBC}.`), requiresConfirmation: true },
    { heading: L(lang, "6. Records", "6. Kayıtlar"), content: L(lang,
      `Records generated by this procedure are controlled per the Document & Record Control Procedure and retained for the period required by ${standard} and applicable regulation.`,
      `Bu prosedürle oluşan kayıtlar, Doküman ve Kayıt Kontrol Prosedürüne göre kontrol edilir ve ${standard} ile ilgili mevzuatın gerektirdiği süre boyunca saklanır.`) },
    { heading: L(lang, "7. Revision History", "7. Revizyon Geçmişi"), content: L(lang,
      `v1.0 — Initial draft generated by MDRpilot for review and approval. Approver and effective date: ${TBC}.`,
      `v1.0 — MDRpilot tarafından inceleme ve onay için oluşturulan ilk taslak. Onaylayan ve yürürlük tarihi: ${TBC}.`), requiresConfirmation: true },
  ];
}

function deviceParagraph(ctx: ComposerContext, lang: ComposerLanguage): string {
  const p = ctx.product;
  if (!p) return L(lang, "No product selected.", "Ürün seçilmedi.");
  return L(lang,
    `${p.name}${p.model ? ` (${p.model})` : ""} is a ${p.deviceClass} medical device manufactured by ${ctx.company.name}. Intended purpose: ${p.intendedPurpose ?? TBC}. Sterility: ${p.isSterile ? `sterile (${p.sterilization})` : "non-sterile"}. Materials: ${p.materials ?? TBC}.`,
    `${p.name}${p.model ? ` (${p.model})` : ""}, ${ctx.company.name} tarafından üretilen ${p.deviceClass} sınıfı tıbbi cihazdır. Kullanım amacı: ${p.intendedPurpose ?? TBC}. Sterilite: ${p.isSterile ? `steril (${p.sterilization})` : "non-steril"}. Malzemeler: ${p.materials ?? TBC}.`);
}

function typedSections(ctx: ComposerContext, opts: ComposerOptions): RawSection[] {
  const lang = opts.language;
  const label = COMPOSER_TYPE_LABEL[opts.type];
  const standard = COMPOSER_TYPE_STANDARD[opts.type];
  const p = ctx.product;
  const gsprRefs = ctx.linkedEvidence.filter((e) => e.target.startsWith("GSPR")).map((e) => e.fileName);
  const riskRefs = ctx.linkedEvidence.filter((e) => e.target.startsWith("RISK")).map((e) => e.fileName);

  switch (opts.type) {
    case "ISO13485_QUALITY_MANUAL":
      if (opts.wizardAnswers && Object.keys(opts.wizardAnswers).length > 0) {
        return buildQualityManualSectionsFromWizard(
          opts.wizardAnswers,
          ctx.company.name,
          lang,
          ctx.qmsDocs.length,
          opts.wizardKysDocs ?? [],
          { bilingual: true },
        ).map((s) => ({
          heading: s.heading,
          content: s.content,
          requiresConfirmation: s.requiresConfirmation ?? false,
        }));
      }
      return [
        { heading: L(lang, "1. Introduction", "1. Giriş"), content: L(lang, `This Quality Manual describes the quality management system (QMS) of ${ctx.company.name}, established to meet ISO 13485:2016 and applicable regulatory requirements.`, `Bu Kalite El Kitabı, ${ctx.company.name} firmasının ISO 13485:2016 ve ilgili mevzuat gerekliliklerini karşılamak üzere kurduğu kalite yönetim sistemini (KYS) tanımlar.`) },
        { heading: L(lang, "2. Scope of the QMS", "2. KYS Kapsamı"), content: L(lang, `The QMS covers the design, development, production and distribution activities of ${ctx.company.name}. Exclusions and justifications: ${TBC}.`, `KYS, ${ctx.company.name} firmasının tasarım, geliştirme, üretim ve dağıtım faaliyetlerini kapsar. Hariç tutmalar ve gerekçeleri: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "3. Quality Policy & Objectives", "3. Kalite Politikası ve Hedefleri"), content: L(lang, `Top management has defined a quality policy and measurable objectives. Statement text: ${TBC}.`, `Üst yönetim bir kalite politikası ve ölçülebilir hedefler tanımlamıştır. Politika metni: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "4. Process Approach", "4. Süreç Yaklaşımı"), content: L(lang, `The QMS is structured around interrelated processes with defined inputs, outputs and KPIs, following the process approach of ISO 13485.`, `KYS, ISO 13485 süreç yaklaşımına göre tanımlı girdi, çıktı ve KPI'lara sahip birbiriyle ilişkili süreçler etrafında yapılandırılmıştır.`) },
        { heading: L(lang, "5. Documentation Structure", "5. Dokümantasyon Yapısı"), content: L(lang, `Documentation comprises this manual, procedures, work instructions and records, controlled per the Document Control Procedure. Existing QMS documents: ${ctx.qmsDocs.length}.`, `Dokümantasyon; bu el kitabı, prosedürler, talimatlar ve kayıtlardan oluşur ve Doküman Kontrol Prosedürüne göre kontrol edilir. Mevcut KYS dokümanı: ${ctx.qmsDocs.length}.`) },
        { heading: L(lang, "6. Management Commitment & Improvement", "6. Yönetim Taahhüdü ve İyileştirme"), content: L(lang, `Top management demonstrates commitment through management reviews, resource provision and continual improvement via CAPA and internal audit.`, `Üst yönetim; yönetim gözden geçirmeleri, kaynak sağlama ve DÖF ile iç tetkik yoluyla sürekli iyileştirme aracılığıyla taahhüdünü gösterir.`) },
      ];

    case "ISO9001_QUALITY_MANUAL":
      return [
        { heading: L(lang, "1. Introduction & Context of the Organization", "1. Giriş ve Kuruluşun Bağlamı"), content: L(lang, `This Quality Manual describes the quality management system (QMS) of ${ctx.company.name}, established to meet ISO 9001:2015. Context, interested parties and their requirements: ${TBC}.`, `Bu Kalite El Kitabı, ${ctx.company.name} firmasının ISO 9001:2015'i karşılamak üzere kurduğu kalite yönetim sistemini (KYS) tanımlar. Bağlam, ilgili taraflar ve gereklilikleri: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "2. Scope of the QMS", "2. KYS Kapsamı"), content: L(lang, `The QMS covers the activities of ${ctx.company.name}. Exclusions and justifications: ${TBC}.`, `KYS, ${ctx.company.name} firmasının faaliyetlerini kapsar. Hariç tutmalar ve gerekçeleri: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "3. Leadership & Quality Policy", "3. Liderlik ve Kalite Politikası"), content: L(lang, `Top management demonstrates leadership and commitment, and has established a quality policy and measurable objectives. Policy text: ${TBC}.`, `Üst yönetim liderlik ve taahhüt gösterir; bir kalite politikası ve ölçülebilir hedefler oluşturmuştur. Politika metni: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "4. Process Approach & Risk-Based Thinking", "4. Süreç Yaklaşımı ve Risk Temelli Düşünce"), content: L(lang, `The QMS is structured around interrelated processes with defined inputs, outputs and KPIs, applying risk-based thinking per ISO 9001 clause 6.1.`, `KYS, ISO 9001 madde 6.1 uyarınca risk temelli düşünce uygulanarak tanımlı girdi, çıktı ve KPI'lara sahip birbiriyle ilişkili süreçler etrafında yapılandırılmıştır.`) },
        { heading: L(lang, "5. Support & Operation", "5. Destek ve Operasyon"), content: L(lang, `Resources, competence, awareness, communication and documented information are managed per clause 7; operational planning and control per clause 8. Existing QMS documents: ${ctx.qmsDocs.length}.`, `Kaynaklar, yetkinlik, farkındalık, iletişim ve dokümante bilgi madde 7'ye göre; operasyonel planlama ve kontrol madde 8'e göre yönetilir. Mevcut KYS dokümanı: ${ctx.qmsDocs.length}.`) },
        { heading: L(lang, "6. Performance Evaluation & Improvement", "6. Performans Değerlendirme ve İyileştirme"), content: L(lang, `Monitoring, internal audit and management review (clause 9) and continual improvement via corrective action (clause 10) are maintained.`, `İzleme, iç tetkik ve yönetim gözden geçirmesi (madde 9) ile düzeltici faaliyet yoluyla sürekli iyileştirme (madde 10) sürdürülür.`) },
      ];

    case "MDR_TECHNICAL_FILE_NARRATIVE":
      return [
        { heading: L(lang, "1. Device Description and Specification", "1. Cihaz Tanımı ve Spesifikasyonu"), content: deviceParagraph(ctx, lang), evidenceRefs: ctx.sections.flatMap((s) => s.evidenceFiles) },
        { heading: L(lang, "2. Intended Purpose and Indications", "2. Kullanım Amacı ve Endikasyonlar"), content: L(lang, `Intended purpose: ${p?.intendedPurpose ?? TBC}. Indications: ${p?.indications ?? TBC}. Contraindications: ${p?.contraindications ?? TBC}.`, `Kullanım amacı: ${p?.intendedPurpose ?? TBC}. Endikasyonlar: ${p?.indications ?? TBC}. Kontrendikasyonlar: ${p?.contraindications ?? TBC}.`), requiresConfirmation: !p?.indications },
        { heading: L(lang, "3. Classification Rationale", "3. Sınıflandırma Gerekçesi"), content: L(lang, `The device is classified as ${p?.deviceClass ?? TBC} under MDR Annex VIII. Applied rule and justification: ${TBC}.`, `Cihaz, MDR Ek VIII'e göre ${p?.deviceClass ?? TBC} olarak sınıflandırılmıştır. Uygulanan kural ve gerekçe: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "4. GSPR Conformity Summary", "4. GSPR Uygunluk Özeti"), content: gsprSummaryText(ctx, lang), evidenceRefs: gsprRefs },
        { heading: L(lang, "5. Risk Management Summary", "5. Risk Yönetimi Özeti"), content: riskSummaryText(ctx, lang), evidenceRefs: riskRefs },
        { heading: L(lang, "6. Verification and Validation", "6. Doğrulama ve Geçerli Kılma"), content: L(lang, `Design verification and validation, biocompatibility (ISO 10993), ${p?.isSterile ? "sterilization validation (ISO 11135) and packaging validation (ISO 11607)" : "applicable performance testing"} support conformity. Test report references: ${TBC}.`, `Tasarım doğrulama ve geçerli kılma, biyouyumluluk (ISO 10993), ${p?.isSterile ? "sterilizasyon validasyonu (ISO 11135) ve ambalaj validasyonu (ISO 11607)" : "ilgili performans testleri"} uygunluğu destekler. Test raporu referansları: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "7. Clinical Evaluation, PMS and PMCF", "7. Klinik Değerlendirme, PMS ve PMCF"), content: L(lang, `A clinical evaluation has been performed and is maintained under a PMS/PMCF plan proportionate to the device class. References: ${TBC}.`, `Cihaz sınıfıyla orantılı bir PMS/PMCF planı kapsamında klinik değerlendirme yapılmış ve sürdürülmektedir. Referanslar: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "8. Conclusion", "8. Sonuç"), content: L(lang, `Based on the documentation referenced above, the device is considered to conform to the relevant GSPRs, subject to confirmation of outstanding items.`, `Yukarıda atıfta bulunulan dokümantasyona dayanarak, açık maddelerin teyidine bağlı olarak cihazın ilgili GSPR'lere uygun olduğu değerlendirilmektedir.`) },
      ];

    case "MDR_DECLARATION_OF_CONFORMITY_DRAFT":
      return [
        { heading: L(lang, "1. Manufacturer", "1. Üretici"), content: L(lang, `${ctx.company.legalName ?? ctx.company.name}, ${ctx.company.country ?? TBC}. SRN: ${TBC}.`, `${ctx.company.legalName ?? ctx.company.name}, ${ctx.company.country ?? TBC}. SRN: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "2. Product Identification", "2. Ürün Tanımı"), content: L(lang, `Product: ${p?.name ?? TBC}. Basic UDI-DI: ${p?.basicUdiDi ?? TBC}. UDI-DI: ${p?.udiDi ?? TBC}.`, `Ürün: ${p?.name ?? TBC}. Basic UDI-DI: ${p?.basicUdiDi ?? TBC}. UDI-DI: ${p?.udiDi ?? TBC}.`), requiresConfirmation: !p?.basicUdiDi },
        { heading: L(lang, "3. Conformity Route", "3. Uygunluk Yolu"), content: L(lang, `Class ${p?.deviceClass ?? TBC} device. Conformity assessment route under MDR Annex: ${TBC}. Notified Body: ${ctx.company.notifiedBody ?? TBC}.`, `${p?.deviceClass ?? TBC} sınıfı cihaz. MDR Eki uyarınca uygunluk değerlendirme yolu: ${TBC}. Onaylanmış Kuruluş: ${ctx.company.notifiedBody ?? TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "4. Applied Legislation and Standards", "4. Uygulanan Mevzuat ve Standartlar"), content: L(lang, `Regulation (EU) 2017/745. Harmonised/applied standards: ${p?.appliedStandards ?? TBC}.`, `(AB) 2017/745 Tüzüğü. Uyumlaştırılmış/uygulanan standartlar: ${p?.appliedStandards ?? TBC}.`) },
        { heading: L(lang, "5. Declaration", "5. Beyan"), content: L(lang, `This declaration is issued under the sole responsibility of the manufacturer. The above product is in conformity with the relevant Union harmonisation legislation.`, `Bu beyan, üreticinin tek sorumluluğu altında düzenlenmiştir. Yukarıdaki ürün, ilgili Birlik uyumlaştırma mevzuatına uygundur.`) },
        { heading: L(lang, "6. Authorised Signatory", "6. Yetkili İmza"), content: L(lang, `Name, position, place and date of issue, signature: ${TBC}.`, `Ad, unvan, düzenlenme yeri ve tarihi, imza: ${TBC}.`), requiresConfirmation: true },
      ];

    case "MDR_GSPR_COMPLIANCE_STATEMENT":
      return [
        { heading: L(lang, "1. Introduction", "1. Giriş"), content: deviceParagraph(ctx, lang) },
        { heading: L(lang, "2. Conformity Summary by GSPR", "2. GSPR Bazında Uygunluk Özeti"), content: gsprSummaryText(ctx, lang), evidenceRefs: gsprRefs },
        { heading: L(lang, "3. Evidence Mapping", "3. Kanıt Eşleştirmesi"), content: evidenceMappingText(ctx, lang), evidenceRefs: gsprRefs },
        { heading: L(lang, "4. Outstanding Items", "4. Açık Maddeler"), content: gsprGapText(ctx, lang), requiresConfirmation: true },
        { heading: L(lang, "5. Conclusion", "5. Sonuç"), content: L(lang, `Subject to closure of the outstanding items above, the device demonstrates conformity with the applicable GSPRs of MDR Annex I.`, `Yukarıdaki açık maddelerin kapatılmasına bağlı olarak, cihaz MDR Ek I'in geçerli GSPR'lerine uygunluk göstermektedir.`) },
      ];

    case "ISO14971_RISK_MANAGEMENT_PLAN":
      return [
        { heading: L(lang, "1. Scope", "1. Kapsam"), content: deviceParagraph(ctx, lang) },
        { heading: L(lang, "2. Risk Management Process & Responsibilities", "2. Risk Yönetim Süreci ve Sorumluluklar"), content: L(lang, `Risk management is conducted per ISO 14971 across the product lifecycle. The Risk Management Team and responsibilities: ${TBC}.`, `Risk yönetimi, ürün yaşam döngüsü boyunca ISO 14971'e göre yürütülür. Risk Yönetim Ekibi ve sorumluluklar: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "3. Risk Acceptability Criteria", "3. Risk Kabul Edilebilirlik Kriterleri"), content: L(lang, `A 5×5 severity/probability matrix is used with Low/Medium/High/Critical bands. Acceptability thresholds: ${TBC}.`, `Düşük/Orta/Yüksek/Kritik bantlarına sahip 5×5 şiddet/olasılık matrisi kullanılır. Kabul edilebilirlik eşikleri: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "4. Risk Analysis Methods", "4. Risk Analiz Yöntemleri"), content: riskSummaryText(ctx, lang), evidenceRefs: riskRefs },
        { heading: L(lang, "5. Verification of Risk Controls", "5. Risk Kontrollerinin Doğrulanması"), content: L(lang, `Implementation and effectiveness of each risk control is verified via design verification, testing and labeling review.`, `Her risk kontrolünün uygulanması ve etkinliği; tasarım doğrulama, test ve etiket gözden geçirmesi ile doğrulanır.`) },
        { heading: L(lang, "6. Production & Post-Production Information", "6. Üretim ve Üretim Sonrası Bilgi"), content: L(lang, `Information from production and PMS/PMCF is fed back into the risk file for continual reassessment.`, `Üretim ve PMS/PMCF'den gelen bilgiler, sürekli yeniden değerlendirme için risk dosyasına geri beslenir.`) },
      ];

    case "ISO14971_RISK_MANAGEMENT_REPORT":
      return [
        { heading: L(lang, "1. Scope", "1. Kapsam"), content: deviceParagraph(ctx, lang) },
        { heading: L(lang, "2. Summary of Risk Management Activities", "2. Risk Yönetim Faaliyetleri Özeti"), content: riskSummaryText(ctx, lang), evidenceRefs: riskRefs },
        { heading: L(lang, "3. Residual Risk Evaluation", "3. Artık Risk Değerlendirmesi"), content: L(lang, `Following risk controls, residual risks have been re-evaluated. Distribution: ${riskLevelDistribution(ctx)}.`, `Risk kontrollerinin ardından artık riskler yeniden değerlendirilmiştir. Dağılım: ${riskLevelDistribution(ctx)}.`) },
        { heading: L(lang, "4. Overall Benefit-Risk Conclusion", "4. Genel Fayda-Risk Sonucu"), content: L(lang, `The overall residual risk is judged acceptable in relation to the device benefits, subject to confirmation of pending verification activities.`, `Genel artık risk, bekleyen doğrulama faaliyetlerinin teyidine bağlı olarak cihaz faydalarına göre kabul edilebilir bulunmuştur.`), requiresConfirmation: true },
        { heading: L(lang, "5. Post-Production Plan", "5. Üretim Sonrası Plan"), content: L(lang, `Residual risks are monitored through PMS/PMCF activities defined in the corresponding plans.`, `Artık riskler, ilgili planlarda tanımlanan PMS/PMCF faaliyetleri ile izlenir.`) },
      ];

    case "PMS_PLAN":
      return [
        { heading: L(lang, "1. Scope", "1. Kapsam"), content: deviceParagraph(ctx, lang) },
        { heading: L(lang, "2. PMS System & Responsibilities", "2. PMS Sistemi ve Sorumluluklar"), content: L(lang, `A proactive and reactive PMS system is maintained per MDR Articles 83-86. Responsibilities: ${TBC}.`, `MDR Madde 83-86 uyarınca proaktif ve reaktif bir PMS sistemi sürdürülür. Sorumluluklar: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "3. Data Collection Methods", "3. Veri Toplama Yöntemleri"), content: L(lang, `Sources include complaints, feedback, vigilance, literature monitoring and trend analysis.`, `Kaynaklar; şikayetler, geri bildirim, vijilans, literatür takibi ve trend analizini içerir.`) },
        { heading: L(lang, "4. Indicators & Thresholds", "4. Göstergeler ve Eşikler"), content: L(lang, `Quantitative indicators and reactive thresholds trigger investigation and CAPA. Thresholds: ${TBC}.`, `Nicel göstergeler ve reaktif eşikler, inceleme ve DÖF tetikler. Eşikler: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "5. Reporting", "5. Raporlama"), content: L(lang, `${p?.deviceClass?.includes("I") && !p?.deviceClass?.includes("II") ? "A PMS report" : "A PSUR"} is produced and updated at a frequency proportionate to the device class.`, `Cihaz sınıfıyla orantılı sıklıkta ${p?.deviceClass?.includes("I") && !p?.deviceClass?.includes("II") ? "PMS raporu" : "PSUR"} hazırlanır ve güncellenir.`) },
        { heading: L(lang, "6. CAPA & Vigilance Linkage", "6. DÖF ve Vijilans Bağlantısı"), content: L(lang, `PMS outputs feed CAPA and vigilance/FSCA processes where applicable.`, `PMS çıktıları, uygun olduğunda DÖF ve vijilans/FSCA süreçlerini besler.`) },
      ];

    case "PMCF_PLAN":
      return [
        { heading: L(lang, "1. Objectives", "1. Hedefler"), content: L(lang, `Confirm safety and performance throughout the lifetime of ${p?.name ?? TBC}, identify emerging risks and confirm acceptability of residual risks.`, `${p?.name ?? TBC} cihazının yaşam döngüsü boyunca güvenlik ve performansı teyit etmek, ortaya çıkan riskleri belirlemek ve artık risklerin kabul edilebilirliğini doğrulamak.`) },
        { heading: L(lang, "2. Device and Equivalence", "2. Cihaz ve Eşdeğerlik"), content: deviceParagraph(ctx, lang) },
        { heading: L(lang, "3. General & Specific Methods", "3. Genel ve Spesifik Yöntemler"), content: L(lang, `General methods (literature, registries) and specific methods (surveys, PMCF studies) are defined. Study details: ${TBC}.`, `Genel yöntemler (literatür, kayıt sistemleri) ve spesifik yöntemler (anketler, PMCF çalışmaları) tanımlanır. Çalışma detayları: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "4. Evaluation Criteria & Timeline", "4. Değerlendirme Kriterleri ve Zaman Çizelgesi"), content: L(lang, `Acceptance criteria and milestones: ${TBC}.`, `Kabul kriterleri ve kilometre taşları: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "5. Link to Clinical Evaluation", "5. Klinik Değerlendirme ile Bağlantı"), content: L(lang, `PMCF outputs are integrated into the clinical evaluation and risk management files.`, `PMCF çıktıları, klinik değerlendirme ve risk yönetimi dosyalarına entegre edilir.`) },
      ];

    case "PMCF_EVALUATION_REPORT":
      return [
        { heading: L(lang, "1. Scope", "1. Kapsam"), content: deviceParagraph(ctx, lang) },
        { heading: L(lang, "2. PMCF Activities Conducted", "2. Yürütülen PMCF Faaliyetleri"), content: L(lang, `Activities executed per the PMCF plan. Data and results: ${TBC}.`, `Faaliyetler PMCF planına göre yürütülmüştür. Veri ve sonuçlar: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "3. Findings & Impact", "3. Bulgular ve Etki"), content: L(lang, `Findings are assessed for impact on benefit-risk and risk controls.`, `Bulgular, fayda-risk ve risk kontrolleri üzerindeki etkisi açısından değerlendirilir.`) },
        { heading: L(lang, "4. Conclusions and Actions", "4. Sonuçlar ve Aksiyonlar"), content: L(lang, `Conclusions and required updates to the technical documentation: ${TBC}.`, `Sonuçlar ve teknik dokümantasyonda gerekli güncellemeler: ${TBC}.`), requiresConfirmation: true },
      ];

    case "CLINICAL_EVALUATION_PLAN":
      return [
        { heading: L(lang, "1. Scope and Device Description", "1. Kapsam ve Cihaz Tanımı"), content: deviceParagraph(ctx, lang) },
        { heading: L(lang, "2. Clinical Background & State of the Art", "2. Klinik Arka Plan ve Güncel Teknoloji"), content: L(lang, `The state of the art for this device category and clinical background: ${TBC}.`, `Bu cihaz kategorisi için güncel teknoloji düzeyi ve klinik arka plan: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "3. Clinical Evaluation Strategy", "3. Klinik Değerlendirme Stratejisi"), content: L(lang, `The evaluation route (own data / equivalence / literature) is defined per MDCG 2020-6 and MDR Annex XIV.`, `Değerlendirme yolu (kendi verisi / eşdeğerlik / literatür) MDCG 2020-6 ve MDR Ek XIV'e göre tanımlanır.`) },
        { heading: L(lang, "4. Literature Search Strategy", "4. Literatür Arama Stratejisi"), content: L(lang, `Databases, search terms, inclusion/exclusion criteria and appraisal method: ${TBC}.`, `Veri tabanları, arama terimleri, dahil etme/dışlama kriterleri ve değerlendirme yöntemi: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "5. Acceptance Criteria & Timeline", "5. Kabul Kriterleri ve Zaman Çizelgesi"), content: L(lang, `Acceptance criteria for safety/performance and the evaluation schedule: ${TBC}.`, `Güvenlik/performans için kabul kriterleri ve değerlendirme takvimi: ${TBC}.`), requiresConfirmation: true },
      ];

    case "CLINICAL_EVALUATION_REPORT_DRAFT":
      return [
        { heading: L(lang, "1. Scope", "1. Kapsam"), content: deviceParagraph(ctx, lang) },
        { heading: L(lang, "2. State of the Art", "2. Güncel Teknoloji"), content: L(lang, `Summary of current knowledge, alternatives and applicable standards: ${TBC}.`, `Mevcut bilgi birikimi, alternatifler ve geçerli standartların özeti: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "3. Clinical Data Identification & Appraisal", "3. Klinik Veri Tanımlama ve Değerlendirme"), content: L(lang, `Clinical data sources identified and appraised for relevance and quality: ${TBC}.`, `Klinik veri kaynakları belirlenmiş ve uygunluk/kalite açısından değerlendirilmiştir: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "4. Benefit-Risk Conclusion", "4. Fayda-Risk Sonucu"), content: riskSummaryText(ctx, lang), evidenceRefs: riskRefs },
        { heading: L(lang, "5. PMS/PMCF Inputs", "5. PMS/PMCF Girdileri"), content: L(lang, `Residual questions are addressed through the PMS/PMCF plans.`, `Açık kalan sorular, PMS/PMCF planları aracılığıyla ele alınır.`) },
      ];

    case "IFU_DRAFT":
      return [
        { heading: L(lang, "1. Intended Purpose", "1. Kullanım Amacı"), content: p?.intendedPurpose ?? TBC, requiresConfirmation: !p?.intendedPurpose },
        { heading: L(lang, "2. Indications", "2. Endikasyonlar"), content: p?.indications ?? TBC, requiresConfirmation: !p?.indications },
        { heading: L(lang, "3. Contraindications", "3. Kontrendikasyonlar"), content: p?.contraindications ?? TBC, requiresConfirmation: !p?.contraindications },
        { heading: L(lang, "4. Warnings & Precautions", "4. Uyarılar ve Önlemler"), content: ifuWarningsText(ctx, lang), requiresConfirmation: true },
        { heading: L(lang, "5. Instructions for Use", "5. Kullanım Talimatları"), content: L(lang, `Step-by-step instructions for safe use: ${TBC}.`, `Güvenli kullanım için adım adım talimatlar: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "6. Sterility, Storage & Disposal", "6. Sterilite, Saklama ve Bertaraf"), content: L(lang, `${p?.isSterile ? `Sterile (${p.sterilization}). Single use unless stated otherwise.` : "Non-sterile."} Storage conditions and shelf life: ${p?.shelfLife ?? TBC}. Disposal per local regulations.`, `${p?.isSterile ? `Steril (${p.sterilization}). Aksi belirtilmedikçe tek kullanımlıktır.` : "Non-steril."} Saklama koşulları ve raf ömrü: ${p?.shelfLife ?? TBC}. Bertaraf yerel mevzuata göredir.`) },
        { heading: L(lang, "7. Symbols & Manufacturer Information", "7. Semboller ve Üretici Bilgisi"), content: L(lang, `Symbols per ISO 15223-1. Manufacturer: ${ctx.company.legalName ?? ctx.company.name}. UDI: ${p?.udiDi ?? TBC}.`, `ISO 15223-1'e göre semboller. Üretici: ${ctx.company.legalName ?? ctx.company.name}. UDI: ${p?.udiDi ?? TBC}.`) },
      ];

    case "LABELING_TEXT_DRAFT":
      return [
        { heading: L(lang, "1. Primary Label Text", "1. Ana Etiket Metni"), content: L(lang, `${p?.name ?? TBC} — ${p?.model ?? ""}. Manufacturer: ${ctx.company.legalName ?? ctx.company.name}.`, `${p?.name ?? TBC} — ${p?.model ?? ""}. Üretici: ${ctx.company.legalName ?? ctx.company.name}.`) },
        { heading: L(lang, "2. Symbols (ISO 15223-1)", "2. Semboller (ISO 15223-1)"), content: L(lang, `Manufacturer, LOT, REF, use-by, ${p?.isSterile ? `STERILE ${p.sterilization}, single use,` : ""} consult IFU, CE mark placeholder.`, `Üretici, LOT, REF, son kullanma, ${p?.isSterile ? `STERİL ${p.sterilization}, tek kullanımlık,` : ""} IFU'ya bakınız, CE işareti yer tutucusu.`) },
        { heading: L(lang, "3. UDI & Identification", "3. UDI ve Tanımlama"), content: L(lang, `Basic UDI-DI: ${p?.basicUdiDi ?? TBC}. UDI-DI: ${p?.udiDi ?? TBC}. LOT/Expiry: ${TBC}.`, `Basic UDI-DI: ${p?.basicUdiDi ?? TBC}. UDI-DI: ${p?.udiDi ?? TBC}. LOT/SKT: ${TBC}.`), requiresConfirmation: true },
        { heading: L(lang, "4. Storage & Cautions", "4. Saklama ve İkazlar"), content: L(lang, `Storage: ${p?.shelfLife ?? TBC}. Do not use if package is damaged. ${p?.isSterile ? "Do not resterilize." : ""}`, `Saklama: ${p?.shelfLife ?? TBC}. Ambalaj hasarlıysa kullanmayın. ${p?.isSterile ? "Tekrar sterilize etmeyin." : ""}`) },
      ];

    case "CHANGE_CONTROL_PROCEDURE":
      return [
        { heading: L(lang, "1. Purpose", "1. Amaç"), content: L(lang,
          `This procedure defines how ${ctx.company.name} identifies, evaluates, approves and implements changes to products, processes and the QMS in accordance with ISO 13485, MDR Article 120 and MDCG 2020-3.`,
          `Bu prosedür, ${ctx.company.name} bünyesinde ürün, süreç ve KYS değişikliklerinin ISO 13485, MDR Madde 120 ve MDCG 2020-3'e uygun şekilde tanımlanması, değerlendirilmesi, onaylanması ve uygulanmasını tanımlar.`) },
        { heading: L(lang, "2. Scope", "2. Kapsam"), content: L(lang,
          `Applies to design changes, manufacturing/process changes, supplier changes, labeling/IFU changes, software updates and QMS documentation changes affecting medical devices.`,
          `Tasarım değişiklikleri, üretim/süreç değişiklikleri, tedarikçi değişiklikleri, etiket/IFU değişiklikleri, yazılım güncellemeleri ve tıbbi cihazları etkileyen KYS doküman değişiklikleri için geçerlidir.`) },
        { heading: L(lang, "3. Responsibilities", "3. Sorumluluklar"), content: L(lang,
          `Change initiator documents the request. Process owners perform impact assessment. Quality Manager coordinates review and approval. Design authority approves design changes. Top management approves significant changes. Regulatory affairs assesses NB notification and Art. 120 implications.`,
          `Değişiklik başlatan talebi kaydeder. Süreç sahipleri etki değerlendirmesi yapar. Kalite Müdürü inceleme ve onayı koordine eder. Tasarım yetkilisi tasarım değişikliklerini onaylar. Üst yönetim önemli değişiklikleri onaylar. Düzenleyici işler NB bildirimi ve Madde 120 etkilerini değerlendirir.`) },
        { heading: L(lang, "4. Definitions and References", "4. Tanımlar ve Referanslar"), content: L(lang,
          `References: EN ISO 13485:2016 (${CHANGE_CONTROL_CLAUSE_REFS}), MDR Article 120, MDCG 2020-3. Significant change: a change to design or intended purpose that may affect safety, performance or benefit-risk, assessed per MDCG 2020-3.`,
          `Referanslar: EN ISO 13485:2016 (${CHANGE_CONTROL_CLAUSE_REFS}), MDR Madde 120, MDCG 2020-3. Önemli değişiklik: güvenlik, performans veya fayda-riski etkileyebilecek tasarım veya amaçlanan kullanım değişikliği; MDCG 2020-3'e göre değerlendirilir.`) },
        { heading: L(lang, "5. Procedure", "5. Prosedür"), content: L(lang,
          `5.1 Submit change request (CR) with description, reason and affected products/processes.\n5.2 Impact assessment: risk file (ISO 14971), verification/validation, clinical evaluation, labeling, suppliers, regulatory (NB, DoC, technical file).\n5.3 Significant change assessment per MDCG 2020-3 / MDR Art. 120 — document significant vs non-significant with rationale.\n5.4 Approval by defined authority; NB consultation/notification when required.\n5.5 Implement change, update controlled documents and train affected personnel.\n5.6 Verify effectiveness and close CR with objective evidence.`,
          `5.1 Değişiklik talebi (CR): açıklama, gerekçe ve etkilenen ürün/süreçler.\n5.2 Etki değerlendirmesi: risk dosyası (ISO 14971), doğrulama/geçerli kılma, klinik değerlendirme, etiketleme, tedarikçiler, düzenleyici (NB, DoC, teknik dosya).\n5.3 Önemli değişiklik değerlendirmesi MDCG 2020-3 / MDR Madde 120 — önemli/önemsiz ayrımı ve gerekçe kaydı.\n5.4 Tanımlı otorite onayı; gerektiğinde NB görüşü/bildirimi.\n5.5 Değişikliği uygula, kontrollü dokümanları güncelle, etkilenen personeli eğit.\n5.6 Etkinliği doğrula ve CR'yi nesnel kanıtla kapat.`) },
        { heading: L(lang, "6. Records", "6. Kayıtlar"), content: L(lang,
          `Change request form, impact assessment, significant change assessment (MDCG 2020-3), approval records, updated document revision history, training records.`,
          `Değişiklik talep formu, etki değerlendirmesi, önemli değişiklik değerlendirme formu (MDCG 2020-3), onay kayıtları, güncellenen doküman revizyon geçmişi, eğitim kayıtları.`) },
        { heading: L(lang, "7. Revision History", "7. Revizyon Geçmişi"), content: L(lang,
          `v1.0 — Initial draft generated by MDRpilot for review and approval. Approver and effective date: ${TBC}.`,
          `v1.0 — MDRpilot tarafından inceleme ve onay için oluşturulan ilk taslak. Onaylayan ve yürürlük tarihi: ${TBC}.`), requiresConfirmation: true },
      ];

    default:
      // All procedure-type documents share the generic procedure blueprint.
      return procedureSections(label, standard, ctx, lang);
  }
}

// ---------------- Context-derived text helpers ----------------

function gsprSummaryText(ctx: ComposerContext, lang: ComposerLanguage): string {
  if (!ctx.gspr.length) return L(lang, `No GSPR items are recorded for this product. ${TBC}`, `Bu ürün için kayıtlı GSPR maddesi yok. ${TBC}`);
  const total = ctx.gspr.length;
  const approved = ctx.gspr.filter((g) => g.status === "APPROVED").length;
  const missing = ctx.gspr.filter((g) => g.status === "MISSING").length;
  return L(lang,
    `Of ${total} applicable GSPR items, ${approved} are supported by approved evidence and ${missing} require evidence. Conformity is demonstrated through harmonised standards and the evidence referenced in this file.`,
    `${total} geçerli GSPR maddesinden ${approved} tanesi onaylı kanıtla desteklenmekte, ${missing} tanesi kanıt gerektirmektedir. Uygunluk; uyumlaştırılmış standartlar ve bu dosyada atıfta bulunulan kanıtlarla gösterilmektedir.`);
}

function gsprGapText(ctx: ComposerContext, lang: ComposerLanguage): string {
  const missing = ctx.gspr.filter((g) => g.status === "MISSING").map((g) => `GSPR ${g.gsprNo}`);
  if (!missing.length) return L(lang, "No outstanding GSPR evidence gaps were identified.", "Açık GSPR kanıt eksikliği tespit edilmedi.");
  return L(lang, `Evidence is still required for: ${missing.join(", ")}.`, `Şu maddeler için hâlâ kanıt gereklidir: ${missing.join(", ")}.`);
}

function evidenceMappingText(ctx: ComposerContext, lang: ComposerLanguage): string {
  const items = ctx.linkedEvidence.filter((e) => e.target.startsWith("GSPR"));
  if (!items.length) return L(lang, `No files are linked as GSPR evidence yet. ${TBC}`, `Henüz GSPR kanıtı olarak bağlı dosya yok. ${TBC}`);
  return items.map((e) => `- ${e.target}: ${e.fileName}${e.analysisSummary ? ` — ${e.analysisSummary}` : ""}`).join("\n");
}

function riskSummaryText(ctx: ComposerContext, lang: ComposerLanguage): string {
  if (!ctx.risks.length) return L(lang, `No risk items are recorded. ${TBC}`, `Kayıtlı risk maddesi yok. ${TBC}`);
  return L(lang,
    `${ctx.risks.length} hazards have been analysed with initial and residual risk levels. Risk controls (design, protective measures, information for safety) have been applied and verified. Residual risk distribution: ${riskLevelDistribution(ctx)}.`,
    `${ctx.risks.length} tehlike, başlangıç ve artık risk seviyeleriyle analiz edilmiştir. Risk kontrolleri (tasarım, koruyucu önlemler, güvenlik bilgisi) uygulanmış ve doğrulanmıştır. Artık risk dağılımı: ${riskLevelDistribution(ctx)}.`);
}

function riskLevelDistribution(ctx: ComposerContext): string {
  const counts: Record<string, number> = {};
  for (const r of ctx.risks) counts[r.residualRiskLevel] = (counts[r.residualRiskLevel] ?? 0) + 1;
  return Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(", ") || "n/a";
}

function ifuWarningsText(ctx: ComposerContext, lang: ComposerLanguage): string {
  const fromRisk = ctx.risks.filter((r) => r.harm).slice(0, 6).map((r) => `- ${r.harm}`);
  const head = L(lang, "Warnings derived from the risk management file:", "Risk yönetimi dosyasından türetilen uyarılar:");
  return fromRisk.length ? `${head}\n${fromRisk.join("\n")}` : L(lang, `Warnings and precautions: ${TBC}`, `Uyarılar ve önlemler: ${TBC}`);
}

// ---------------- Assembly ----------------

function clauseTokens(c: RetrievedClause): Set<string> {
  return new Set(
    `${c.clauseNo} ${c.title} ${c.summary}`.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [],
  );
}

/** Picks the clauses most relevant to a given section heading/content. */
function clausesForSection(heading: string, content: string, clauses: RetrievedClause[]): RetrievedClause[] {
  const hay = new Set((`${heading} ${content}`).toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);
  return clauses
    .map((c) => {
      const ct = clauseTokens(c);
      let n = 0;
      for (const w of ct) if (hay.has(w)) n++;
      return { c, n };
    })
    .filter((x) => x.n >= 1)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .map((x) => x.c);
}

function assembleMarkdown(title: string, sections: RawSection[], ctx: ComposerContext, result: Omit<ComposerResult, "markdown">, lang: ComposerLanguage): string {
  const lines: string[] = [`# ${title}`, "", `*${COMPOSER_TYPE_STANDARD[result.documentType as DocumentComposerType] ?? ""} — ${ctx.company.name}*`, ""];
  for (const s of sections) {
    lines.push(`## ${s.heading}`, "", s.content, "");
    if (s.evidenceRefs && s.evidenceRefs.length) {
      lines.push(L(lang, `*Evidence: ${s.evidenceRefs.join(", ")}*`, `*Kanıt: ${s.evidenceRefs.join(", ")}*`), "");
    }
    const relevant = clausesForSection(s.heading, s.content, ctx.clauses);
    if (relevant.length) {
      lines.push(L(lang, `*Relevant clauses: ${relevant.map((c) => `${c.standardCode} ${c.clauseNo}`).join("; ")}*`,
        `*İlgili maddeler: ${relevant.map((c) => `${c.standardCode} ${c.clauseNo}`).join("; ")}*`), "");
    }
    if (s.requiresConfirmation) lines.push(L(lang, "> Requires confirmation by a qualified person.", "> Yetkili bir kişi tarafından teyit gerektirir."), "");
  }
  if (result.missingInformation.length) {
    lines.push(`## ${L(lang, "Missing Information", "Eksik Bilgiler")}`, "");
    for (const m of result.missingInformation) lines.push(`- ${m}`);
    lines.push("");
  }
  if (result.complianceGaps.length) {
    lines.push(`## ${L(lang, "Compliance Gaps", "Uygunluk Açıkları")}`, "");
    for (const g of result.complianceGaps) lines.push(`- ${g}`);
    lines.push("");
  }
  if (result.evidenceUsed.length) {
    lines.push(`## ${L(lang, "Evidence Used", "Kullanılan Kanıtlar")}`, "");
    for (const e of result.evidenceUsed) lines.push(`- ${e}`);
    lines.push("");
  }
  if (result.citations.length) {
    lines.push(`## ${L(lang, "Regulatory References", "Regülasyon Referansları")}`, "");
    for (const c of result.citations) lines.push(`- **${c.standardCode} ${c.clauseNo}** — ${c.reason}`);
    lines.push("");
  }
  lines.push("---", "", `*${result.disclaimer}*`);
  return lines.join("\n");
}

function deterministicCompose(ctx: ComposerContext, opts: ComposerOptions): ComposerResult {
  const lang = opts.language;
  const label = COMPOSER_TYPE_LABEL[opts.type];
  const title = opts.title?.trim() || `${label}${ctx.product ? ` — ${ctx.product.name}` : ` — ${ctx.company.name}`}`;
  const raw = typedSections(ctx, opts);

  const sections: ComposerSection[] = raw.map((s) => ({
    heading: s.heading,
    content: s.content,
    evidenceRefs: s.evidenceRefs ?? [],
    requiresConfirmation: s.requiresConfirmation ?? false,
  }));

  // Missing information
  const missingInformation: string[] = [];
  if (!ctx.product && COMPOSER_TYPE_STANDARD[opts.type]) {
    // product-scoped types handled by caller; still note if absent
  }
  if (ctx.product) {
    const p = ctx.product;
    const checks: [string, unknown][] = [
      ["Intended purpose", p.intendedPurpose], ["Indications", p.indications],
      ["Basic UDI-DI", p.basicUdiDi], ["Materials", p.materials], ["Shelf life", p.shelfLife],
    ];
    for (const [name, val] of checks) if (!val) missingInformation.push(L(lang, `${name} is not defined for the product.`, `Ürün için ${name} tanımlı değil.`));
  }
  for (const s of sections) if (s.content.includes(TBC) && !missingInformation.some((m) => m.includes(s.heading))) {
    missingInformation.push(L(lang, `Section "${s.heading}" contains placeholders to be completed.`, `"${s.heading}" bölümü tamamlanması gereken yer tutucular içeriyor.`));
  }

  // Compliance gaps
  const complianceGaps: string[] = [];
  const gsprMissing = ctx.gspr.filter((g) => g.status === "MISSING");
  if (gsprMissing.length) complianceGaps.push(L(lang, `${gsprMissing.length} GSPR item(s) lack linked evidence.`, `${gsprMissing.length} GSPR maddesinde bağlı kanıt eksik.`));
  const unapprovedSections = ctx.sections.filter((s) => s.status !== "APPROVED");
  if (unapprovedSections.length) complianceGaps.push(L(lang, `${unapprovedSections.length} technical file section(s) are not yet approved.`, `${unapprovedSections.length} teknik dosya bölümü henüz onaylanmadı.`));
  if (ctx.linkedEvidence.length === 0) complianceGaps.push(L(lang, "No objective evidence is linked to this product.", "Bu ürüne bağlı nesnel kanıt bulunmuyor."));

  // Consistency warnings
  const consistencyWarnings: string[] = [];
  if (ctx.product?.isSterile && !ctx.linkedEvidence.some((e) => /steril/i.test(e.fileName) || /steril/i.test(e.analysisSummary ?? ""))) {
    consistencyWarnings.push(L(lang, "Product is sterile but no sterilization-related evidence is linked.", "Ürün steril ancak sterilizasyonla ilgili bağlı kanıt yok."));
  }
  if (ctx.risks.some((r) => r.harm) && opts.type === "IFU_DRAFT") {
    consistencyWarnings.push(L(lang, "Verify that all risk-file harms are reflected as warnings in the IFU.", "Risk dosyasındaki tüm zararların IFU'da uyarı olarak yer aldığını doğrulayın."));
  }

  // Evidence used
  const evidenceUsed = Array.from(new Set([
    ...ctx.linkedEvidence.map((e) => `${e.fileName} (${e.documentKind}) → ${e.target}`),
    ...ctx.files.filter((f) => f.analysisSummary).map((f) => `${f.fileName}: ${f.analysisSummary}`),
  ])).slice(0, 30);

  const recommendedNextActions = [
    L(lang, "Have a qualified person review and complete all [TO BE CONFIRMED] fields.", "Tüm [TO BE CONFIRMED] alanlarını yetkili bir kişiye gözden geçirtip tamamlatın."),
    L(lang, "Link supporting objective evidence to the relevant sections.", "İlgili bölümlere destekleyici nesnel kanıtları bağlayın."),
    L(lang, "Route the document through review and approval before use.", "Dokümanı kullanımdan önce inceleme ve onaydan geçirin."),
  ];

  const wizardQm =
    opts.wizardAnswers &&
    Object.keys(opts.wizardAnswers).length > 0 &&
    (opts.type === "ISO13485_QUALITY_MANUAL" || opts.type === "ISO9001_QUALITY_MANUAL");
  const kysWithContent = (opts.wizardKysDocs ?? []).filter((d) => d.content?.trim()).length;
  const sectionChars = sections.reduce((n, s) => n + s.content.length, 0);

  let confidence = Math.max(0.35, Math.min(0.7,
    0.45 + (ctx.linkedEvidence.length ? 0.1 : 0) + (ctx.product ? 0.05 : 0) - missingInformation.length * 0.02));

  if (wizardQm) {
    confidence = Math.max(0.55, Math.min(0.92,
      0.62 + Math.min(0.2, kysWithContent * 0.015) + Math.min(0.1, sectionChars / 80000) - missingInformation.length * 0.01));
  }

  const citations = ctx.clauses.map((c) => ({
    standardCode: c.standardCode,
    clauseNo: c.clauseNo,
    reason: c.title,
    confidence: Math.min(0.95, Math.max(0.3, c.score)),
  }));

  const partial: Omit<ComposerResult, "markdown"> = {
    title,
    documentType: opts.type,
    language: lang,
    sections,
    missingInformation,
    complianceGaps,
    consistencyWarnings,
    evidenceUsed,
    recommendedNextActions,
    citations,
    confidence,
    disclaimer: DISCLAIMER,
  };

  return { ...partial, markdown: assembleMarkdown(title, raw, ctx, partial, lang) };
}

// ---------------- Context serialization for AI ----------------

function serializeContext(ctx: ComposerContext) {
  const companyContext = `Company: ${ctx.company.legalName ?? ctx.company.name} (${ctx.company.country ?? "country n/a"}). Notified Body: ${ctx.company.notifiedBody ?? "n/a"}. QMS documents on file: ${ctx.qmsDocs.length}.`;
  const productContext = ctx.product
    ? `Name: ${ctx.product.name}; Class: ${ctx.product.deviceClass}; Intended purpose: ${ctx.product.intendedPurpose ?? "n/a"}; Sterile: ${ctx.product.isSterile} (${ctx.product.sterilization}); Materials: ${ctx.product.materials ?? "n/a"}; Standards: ${ctx.product.appliedStandards ?? "n/a"}.`
    : undefined;
  const dossierContext = [
    `GSPR items: ${ctx.gspr.map((g) => `${g.gsprNo}=${g.status}`).join(", ") || "none"}`,
    `Risks: ${ctx.risks.map((r) => `${r.hazard}(${r.residualRiskLevel})`).join("; ") || "none"}`,
    `Technical file sections: ${ctx.sections.map((s) => `${s.title}=${s.status}`).join(", ") || "none"}`,
  ].join("\n");
  const evidenceContext = ctx.linkedEvidence.map((e) => `[${e.target}] ${e.fileName}: ${e.analysisSummary ?? ""}`).join("\n") || undefined;
  const clausesContext = ctx.clauses.length
    ? ctx.clauses.map((c) => `${c.standardCode} ${c.clauseNo} — ${c.title}: ${c.summary}`).join("\n")
    : undefined;
  return { companyContext, productContext, dossierContext, evidenceContext, clausesContext };
}

/**
 * Generate a composer document. Uses the live AI provider when configured
 * (validated against the schema) and always falls back to the deterministic engine.
 */
export async function composeDocument(
  ctx: ComposerContext,
  opts: ComposerOptions,
  providerOverride?: import("@/lib/ai/types").AiProvider | null,
): Promise<{ result: ComposerResult; aiModel: string }> {
  const deterministic = deterministicCompose(ctx, opts);

  const wizardQm =
    opts.wizardAnswers &&
    Object.keys(opts.wizardAnswers).length > 0 &&
    (opts.type === "ISO13485_QUALITY_MANUAL" || opts.type === "ISO9001_QUALITY_MANUAL");

  if (wizardQm) {
    return { result: deterministic, aiModel: "qm-wizard-template" };
  }

  let provider = providerOverride ?? null;
  if (!provider && ctx.companyId) {
    try {
      provider = await getMeteredAiProvider({ companyId: ctx.companyId, feature: "composer" });
    } catch (err) {
      if (err instanceof AiTokenLimitError) throw err;
    }
  }
  if (!provider) {
    return { result: deterministic, aiModel: "mock-composer" };
  }

  try {
    const ser = serializeContext(ctx);
    const user = documentComposerPrompt.buildUser({
      documentType: opts.type,
      documentLabel: COMPOSER_TYPE_LABEL[opts.type],
      standard: COMPOSER_TYPE_STANDARD[opts.type],
      language: opts.language,
      title: opts.title,
      instructions: opts.instructions,
      companyContext: ser.companyContext,
      productContext: ser.productContext,
      dossierContext: ser.dossierContext,
      evidenceContext: ser.evidenceContext,
      clausesContext: ser.clausesContext,
    });
    const raw = await provider.complete(
      [{ role: "system", content: documentComposerPrompt.system }, { role: "user", content: user }],
      { json: true },
    );
    const parsed = composerResultSchema.safeParse(extractJson(raw));
    if (parsed.success && parsed.data.markdown.trim().length > 50) {
      return {
        result: {
          ...parsed.data,
          disclaimer: parsed.data.disclaimer || DISCLAIMER,
          // keep deterministic analysis arrays if model returned empty
          missingInformation: parsed.data.missingInformation.length ? parsed.data.missingInformation : deterministic.missingInformation,
          complianceGaps: parsed.data.complianceGaps.length ? parsed.data.complianceGaps : deterministic.complianceGaps,
          evidenceUsed: parsed.data.evidenceUsed.length ? parsed.data.evidenceUsed : deterministic.evidenceUsed,
          citations: parsed.data.citations.length ? parsed.data.citations : deterministic.citations,
        },
        aiModel: providerOverride?.modelId ?? aiProviderInfo().model,
      };
    }
  } catch (err) {
    console.error("[composer] provider failed, using deterministic engine", err);
  }
  return { result: deterministic, aiModel: "mock-composer" };
}
