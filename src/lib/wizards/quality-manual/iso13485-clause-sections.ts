/**
 * ISO 13485:2016 clause-by-clause Quality Manual narratives (deterministic, client-safe).
 */

import { isBooleanTrue } from "./steps";
import type { QmManualSection } from "./quality-manual-types";
import { bi, chapterHeading, clauseHeading } from "./quality-manual-bilingual";
import { appendClauseProcedureReferences } from "./clause-procedure-refs";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function slice(v: unknown, max: number): string {
  const s = str(v);
  return s ? s.slice(0, max) : "";
}

function boolLabel(v: unknown, locale: "tr" | "en"): string {
  if (isBooleanTrue(v)) return locale === "tr" ? "Evet" : "Yes";
  if (v === false || v === "false" || v === "no") return locale === "tr" ? "Hayır" : "No";
  return "[TO BE CONFIRMED]";
}

interface ClauseCtx {
  answers: Record<string, unknown>;
  locale: "tr" | "en";
  legal: string;
  scope: string;
  sites: string;
  qmsDocCount: number;
}

function sop(answers: Record<string, unknown>, key: string, fallback: string): string {
  return str(answers[key]) || fallback;
}

function heading(tr: boolean, clauseNo: string, titleTr: string, titleEn: string): string {
  return clauseHeading(clauseNo, titleTr, titleEn);
}

function refProc(code: string, tr: boolean): string {
  return tr
    ? `Detaylı uygulama ${code} prosedüründe ve ilgili kayıtlarda tanımlanmıştır.`
    : `Detailed implementation is defined in procedure ${code} and associated records.`;
}

type ClauseDef = {
  clauseNo: string;
  titleTr: string;
  titleEn: string;
  requiresConfirmation?: boolean | ((ctx: ClauseCtx) => boolean);
  skip?: (ctx: ClauseCtx) => boolean;
  body: (ctx: ClauseCtx, tr: boolean, TBC: string) => string;
};

const CLAUSES: ClauseDef[] = [
  {
    clauseNo: "4.1",
    titleTr: "Genel Gereklilikler",
    titleEn: "General Requirements",
    body: (ctx, tr, TBC) => tr
      ? `${ctx.legal} kalite yönetim sistemini ISO 13485:2016 ve geçerli mevzuat gerekliliklerine uygun şekilde kurar, dokümante eder, uygular ve sürdürür.\n\n4.1.1 — KYS kapsamı: ${ctx.scope || TBC}. Ürün grupları: ${str(ctx.answers.productGroups) || TBC}. Hariç tutmalar: ${str(ctx.answers.exclusionsAndJustifications) || TBC}.\n4.1.2 — Süreçler tanımlı girdi/çıktı, sıra ve etkileşimle yönetilir (Bölüm 6).\n4.1.3 — Risk yönetimi ürün yaşam döngüsü boyunca ISO 14971 ile entegre (${sop(ctx.answers, "riskManagementProcedureCode", "SOP-RM")}).\n4.1.4 — KYS değişiklikleri planlı; değişiklik kontrolü ${sop(ctx.answers, "changeControlProcedureCode", "SOP-CC")} ile yürütülür.\n4.1.5 — Dış kaynaklı süreçler: ${str(ctx.answers.outsourcedProcesses) || TBC}.\n4.1.6 — Doğrulama faaliyetleri iç tetkik, yönetim gözden geçirmesi ve izleme yoluyla gerçekleştirilir.`
      : `${ctx.legal} establishes, documents, implements and maintains its QMS in accordance with ISO 13485:2016 and applicable regulations.\n\n4.1.1 — QMS scope: ${ctx.scope || TBC}. Product groups: ${str(ctx.answers.productGroups) || TBC}. Exclusions: ${str(ctx.answers.exclusionsAndJustifications) || TBC}.\n4.1.2 — Processes are managed with defined inputs/outputs, sequence and interaction (process map section).\n4.1.3 — Risk management is integrated across the lifecycle per ISO 14971 (${sop(ctx.answers, "riskManagementProcedureCode", "SOP-RM")}).\n4.1.4 — QMS changes are planned; change control follows ${sop(ctx.answers, "changeControlProcedureCode", "SOP-CC")}.\n4.1.5 — Outsourced processes: ${str(ctx.answers.outsourcedProcesses) || TBC}.\n4.1.6 — Validation via internal audit, management review and monitoring.`,
  },
  {
    clauseNo: "4.1.7.1",
    titleTr: "Kuruluş ve Bağlamının Anlaşılması",
    titleEn: "Understanding the Organization and its Context",
    body: (ctx, tr, TBC) => tr
      ? `Kuruluş iç ve dış konularını (pazar, mevzuat, tedarikçi yapısı) periyodik gözden geçirir. İlgili düzenleyici ortam: ${str(ctx.answers.applicableRegulations) || TBC}.`
      : `The organization reviews internal and external issues (market, regulations, supplier base) periodically. Regulatory context: ${str(ctx.answers.applicableRegulations) || TBC}.`,
  },
  {
    clauseNo: "4.1.7.2",
    titleTr: "İlgili Tarafların İhtiyaç ve Beklentileri",
    titleEn: "Understanding Needs and Expectations of Interested Parties",
    body: (_ctx, tr) => tr
      ? `Müşteriler, çalışanlar, düzenleyici otoriteler, onaylanmış kuruluş ve tedarikçiler ilgili taraflar olarak tanımlanır; gereklilikleri KYS planlamasına girdi olur.`
      : `Customers, employees, regulatory authorities, notified bodies and suppliers are defined as interested parties; their requirements feed QMS planning.`,
  },
  {
    clauseNo: "4.1.7.3",
    titleTr: "KYS Kapsamının Belirlenmesi",
    titleEn: "Determining the Scope of the QMS",
    body: (ctx, tr, TBC) => tr
      ? `KYS kapsamı: ${ctx.scope || TBC}. Sahalar: ${ctx.sites || TBC}. Hariç tutmalar gerekçelendirilir.`
      : `QMS scope: ${ctx.scope || TBC}. Sites: ${ctx.sites || TBC}. Exclusions are justified.`,
    requiresConfirmation: (ctx) => !ctx.scope,
  },
  {
    clauseNo: "4.1.7.4",
    titleTr: "Kalite Yönetim Sistemi ve Süreçler",
    titleEn: "Quality Management System and its Processes",
    body: (ctx, tr, TBC) => tr
      ? `Süreçler tanımlı sahipler, KPI'lar ve etkileşimlerle yönetilir. Temel süreçler: ${slice(ctx.answers.coreProcesses, 500) || TBC}.`
      : `Processes are managed with defined owners, KPIs and interactions. Core processes: ${slice(ctx.answers.coreProcesses, 500) || TBC}.`,
  },
  {
    clauseNo: "4.2.1",
    titleTr: "Dokümantasyon — Genel",
    titleEn: "Documentation — General",
    body: (ctx, tr) => tr
      ? `Dokümante bilgi; el kitabı, prosedürler, talimatlar ve kayıtlardan oluşur. Hiyerarşi: bu el kitabı → KYS prosedürleri (${ctx.qmsDocCount} kayıt) → talimatlar → kayıtlar. ${refProc(sop(ctx.answers, "documentControlProcedureCode", "SOP-DC"), tr)}`
      : `Documented information comprises the manual, procedures, work instructions and records. Hierarchy: this manual → QMS procedures (${ctx.qmsDocCount} on file) → instructions → records. ${refProc(sop(ctx.answers, "documentControlProcedureCode", "SOP-DC"), tr)}`,
  },
  {
    clauseNo: "4.2.2",
    titleTr: "Kalite El Kitabı",
    titleEn: "Quality Manual",
    body: (ctx, tr) => tr
      ? `Bu el kitabı KYS kapsamını, süreçlerin etkileşimini ve prosedür referanslarını tanımlar; sertifika kapsamı ile uyumludur. Dağıtım kontrollü kopya üzerinden yapılır.`
      : `This manual defines QMS scope, process interactions and procedure references; it aligns with the certification scope. Distribution is via controlled copies.`,
  },
  {
    clauseNo: "4.2.3",
    titleTr: "Tıbbi Cihaz Dosyası",
    titleEn: "Medical Device File",
    body: (ctx, tr, TBC) => tr
      ? `Her tıbbi cihaz için dosya kapsamı: ${str(ctx.answers.medicalDeviceFileScope) || TBC}. ${refProc("SOP-MDF", tr)}`
      : `Medical device file scope per device: ${str(ctx.answers.medicalDeviceFileScope) || TBC}. ${refProc("SOP-MDF", tr)}`,
    requiresConfirmation: (ctx) => !str(ctx.answers.medicalDeviceFileScope),
  },
  {
    clauseNo: "4.2.4",
    titleTr: "Dokümanların Kontrolü",
    titleEn: "Control of Documents",
    body: (ctx, tr) => refProc(sop(ctx.answers, "documentControlProcedureCode", "SOP-DC"), tr) + (tr
      ? "\nOnay, revizyon, dağıtım, geçersiz kopyaların geri alımı ve dış kaynaklı dokümanlar bu prosedürle kontrol edilir."
      : "\nApproval, revision, distribution, retrieval of obsolete copies and control of external documents are managed per this procedure."),
  },
  {
    clauseNo: "4.2.5",
    titleTr: "Kayıtların Kontrolü",
    titleEn: "Control of Records",
    body: (ctx, tr) => refProc(sop(ctx.answers, "recordControlProcedureCode", "SOP-RC"), tr) + (tr
      ? "\nKayıtlar okunabilir, tanımlanabilir, saklama süreleri ve erişim kısıtları prosedürde tanımlıdır."
      : "\nRecords are legible, identifiable; retention and access restrictions are defined in the procedure."),
  },
  {
    clauseNo: "5.1",
    titleTr: "Yönetim Taahhüdü",
    titleEn: "Management Commitment",
    body: (ctx, tr, TBC) => tr
      ? `Üst yönetim (${str(ctx.answers.generalManager) || TBC}) KYS etkinliğini sağlar; kaynak tahsisi, politika ve hedeflerin iletimi ile müşteri ve düzenleyici gerekliliklere uyumu taahhüt eder. Yönetim gözden geçirmesi ${sop(ctx.answers, "managementReviewProcedureCode", "SOP-MR")} ile periyodik yapılır.`
      : `Top management (${str(ctx.answers.generalManager) || TBC}) ensures QMS effectiveness; commits to resources, policy communication and regulatory/customer compliance. Management review follows ${sop(ctx.answers, "managementReviewProcedureCode", "SOP-MR")}.`,
    requiresConfirmation: (ctx) => !str(ctx.answers.generalManager),
  },
  {
    clauseNo: "5.2",
    titleTr: "Müşteri Odaklılık",
    titleEn: "Customer Focus",
    body: (ctx, tr, TBC) => tr
      ? `Müşteri gereklilikleri belirlenir ve karşılanır; geri bildirim: ${slice(ctx.answers.customerFeedbackMethod, 800) || TBC}. Şikâyet süreci ${sop(ctx.answers, "complaintProcedureCode", "SOP-CH")} ile bağlantılıdır.`
      : `Customer requirements are determined and met; feedback: ${slice(ctx.answers.customerFeedbackMethod, 800) || TBC}. Linked to complaint process ${sop(ctx.answers, "complaintProcedureCode", "SOP-CH")}.`,
  },
  {
    clauseNo: "5.3",
    titleTr: "Kalite Politikası",
    titleEn: "Quality Policy",
    body: (ctx, tr, TBC) => {
      const policy = str(ctx.answers.qualityPolicyText);
      return tr
        ? `Üst yönetim kalite politikasını tanımlar, iletir ve periyodik gözden geçirir.\n\nPolitika metni: ${policy || TBC}.\nPolitika uygunluk ve sürekli iyileştirme taahhüdünü içerir.`
        : `Top management defines, communicates and periodically reviews the quality policy.\n\nPolicy text: ${policy || TBC}.\nThe policy includes commitment to conformity and continual improvement.`;
    },
    requiresConfirmation: (ctx) => !str(ctx.answers.qualityPolicyText),
  },
  {
    clauseNo: "5.4.1",
    titleTr: "Kalite Hedefleri",
    titleEn: "Quality Objectives",
    body: (ctx, tr, TBC) => tr
      ? `Ölçülebilir kalite hedefleri fonksiyon ve süreç düzeyinde tanımlanır; KPI örnekleri: ${slice(ctx.answers.keyProcessKPIs, 600) || TBC}. Hedefler yönetim gözden geçirmesinde izlenir.`
      : `Measurable quality objectives are set at function/process level; KPI examples: ${slice(ctx.answers.keyProcessKPIs, 600) || TBC}. Objectives are monitored in management review.`,
  },
  {
    clauseNo: "5.4.2",
    titleTr: "Kalite Yönetim Sistemi Planlaması",
    titleEn: "QMS Planning",
    body: (ctx, tr, TBC) => tr
      ? `Kalite riskleri: ${slice(ctx.answers.qualityRisks, 500) || TBC}. Düzenleyici riskler: ${slice(ctx.answers.regulatoryRisks, 500) || TBC}. Planlama risk yönetimi ve değişiklik kontrolü ile entegredir.`
      : `Quality risks: ${slice(ctx.answers.qualityRisks, 500) || TBC}. Regulatory risks: ${slice(ctx.answers.regulatoryRisks, 500) || TBC}. Planning is integrated with risk management and change control.`,
  },
  {
    clauseNo: "5.5.1",
    titleTr: "Sorumluluk ve Yetki",
    titleEn: "Responsibility and Authority",
    body: (ctx, tr, TBC) => tr
      ? `Kalite müdürü: ${str(ctx.answers.qualityManager) || TBC}. Yönetim temsilcisi: ${str(ctx.answers.managementRepresentative) || TBC}. PRRC: ${str(ctx.answers.regulatoryResponsible) || TBC}. ${refProc(sop(ctx.answers, "organizationProcedureCode", "SOP-ORG"), tr)}`
      : `Quality manager: ${str(ctx.answers.qualityManager) || TBC}. Management representative: ${str(ctx.answers.managementRepresentative) || TBC}. PRRC: ${str(ctx.answers.regulatoryResponsible) || TBC}. ${refProc(sop(ctx.answers, "organizationProcedureCode", "SOP-ORG"), tr)}`,
    requiresConfirmation: (ctx) => !str(ctx.answers.qualityManager),
  },
  {
    clauseNo: "5.5.2",
    titleTr: "Yönetim Temsilcisi",
    titleEn: "Management Representative",
    body: (ctx, tr, TBC) => tr
      ? `Yönetim temsilcisi (${str(ctx.answers.managementRepresentative) || TBC}) KYS performansını üst yönetime raporlar ve tüm personelin KYS gerekliliklerine farkındalığını destekler.`
      : `The management representative (${str(ctx.answers.managementRepresentative) || TBC}) reports QMS performance to top management and promotes awareness of QMS requirements.`,
  },
  {
    clauseNo: "5.5.3",
    titleTr: "İç İletişim",
    titleEn: "Internal Communication",
    body: (ctx, tr, TBC) => tr
      ? `KYS ile ilgili iletişim toplantılar, e-posta ve dokümante bilgi yoluyla yapılır. Düzenleyici değişiklikler: ${str(ctx.answers.applicableRegulations) || TBC} üzerinden iletilir.`
      : `QMS-related communication occurs via meetings, email and documented information. Regulatory changes communicated per ${str(ctx.answers.applicableRegulations) || TBC}.`,
  },
  {
    clauseNo: "5.6",
    titleTr: "Yönetim Gözden Geçirmesi",
    titleEn: "Management Review",
    body: (ctx, tr, TBC) => tr
      ? `Yönetim gözden geçirmesi sahibi: ${str(ctx.answers.managementReviewOwner) || TBC}. Girdi: denetim sonuçları, geri bildirim, süreç performansı, CAPA durumu, önceki gözden geçirme aksiyonları. ${refProc(sop(ctx.answers, "managementReviewProcedureCode", "SOP-MR"), tr)}`
      : `Management review owner: ${str(ctx.answers.managementReviewOwner) || TBC}. Inputs: audit results, feedback, process performance, CAPA status, prior review actions. ${refProc(sop(ctx.answers, "managementReviewProcedureCode", "SOP-MR"), tr)}`,
  },
  {
    clauseNo: "6.1",
    titleTr: "Kaynakların Sağlanması",
    titleEn: "Provision of Resources",
    body: (ctx, tr) => tr
      ? `Üst yönetim KYS uygulaması ve müşteri memnuniyeti için gerekli insan kaynakları, altyapı ve çalışma ortamını sağlar. Sahalar: ${ctx.sites}.`
      : `Top management provides human resources, infrastructure and work environment needed to implement the QMS and meet customer satisfaction. Sites: ${ctx.sites}.`,
  },
  {
    clauseNo: "6.2",
    titleTr: "İnsan Kaynakları — Yetkinlik",
    titleEn: "Human Resources — Competence",
    body: (ctx, tr) => refProc(sop(ctx.answers, "trainingProcedureCode", "SOP-HR"), tr) + (tr
      ? "\nPersonel yetkinlik matrisi, eğitim kayıtları ve farkındalık (kalite, güvenlik, düzenleyici) bu prosedürle yönetilir."
      : "\nCompetence matrix, training records and awareness (quality, safety, regulatory) are managed per this procedure."),
  },
  {
    clauseNo: "6.3",
    titleTr: "Altyapı",
    titleEn: "Infrastructure",
    body: (_ctx, tr) => refProc("SOP-INF", tr) + (tr
      ? "\nBinalar, iş ekipmanları, IT ve destek hizmetleri bakım planları ile sürdürülür."
      : "\nBuildings, equipment, IT and support services are maintained via maintenance plans."),
  },
  {
    clauseNo: "6.4",
    titleTr: "Çalışma Ortamı ve Kontaminasyon Kontrolü",
    titleEn: "Work Environment and Contamination Control",
    body: (ctx, tr, TBC) => tr
      ? `Temiz oda kullanımı: ${boolLabel(ctx.answers.cleanroomUsed, ctx.locale)}. ${refProc("SOP-ENV", tr)}\nSteril/aktif biyolojik ürünler için kontaminasyon kontrolü ${sop(ctx.answers, "sterilizationProcedureCode", "SOP-ST")} ve SOP-CLN ile uyumludur.`
      : `Cleanroom used: ${boolLabel(ctx.answers.cleanroomUsed, ctx.locale)}. ${refProc("SOP-ENV", tr)}\nContamination control for sterile/biological products aligns with ${sop(ctx.answers, "sterilizationProcedureCode", "SOP-ST")} and SOP-CLN.`,
  },
  {
    clauseNo: "7.1",
    titleTr: "Ürün Gerçekleştirme Planlaması",
    titleEn: "Planning of Product Realization",
    body: (ctx, tr, TBC) => tr
      ? `Ürün gerçekleştirme risk yönetimi (${sop(ctx.answers, "riskManagementProcedureCode", "SOP-RM")}) ve kalite hedefleri ile planlanır. Kritik süreçler: ${slice(ctx.answers.criticalProcesses, 600) || TBC}.`
      : `Product realization is planned with risk management (${sop(ctx.answers, "riskManagementProcedureCode", "SOP-RM")}) and quality objectives. Critical processes: ${slice(ctx.answers.criticalProcesses, 600) || TBC}.`,
  },
  {
    clauseNo: "7.2.1",
    titleTr: "Ürünle İlgili Gerekliliklerin Belirlenmesi",
    titleEn: "Determination of Requirements Related to the Product",
    body: (_ctx, tr) => refProc("SOP-CRP", tr) + (tr
      ? "\nMüşteri, yasal ve düzenleyici gereklilikler ile şirket içi gereklilikler belirlenir ve kayıt altına alınır."
      : "\nCustomer, legal and regulatory requirements and internal requirements are determined and recorded."),
  },
  {
    clauseNo: "7.2.2",
    titleTr: "Ürünle İlgili Gerekliliklerin Gözden Geçirilmesi",
    titleEn: "Review of Requirements Related to the Product",
    body: (_ctx, tr) => refProc("SOP-CRP", tr) + (tr
      ? "\nSipariş ve sözleşme öncesi gereklilikler yetkili personel tarafından gözden geçirilir."
      : "\nRequirements are reviewed by authorized personnel before order acceptance and contracts."),
  },
  {
    clauseNo: "7.2.3",
    titleTr: "İletişim",
    titleEn: "Communication",
    body: (_ctx, tr) => tr
      ? `Ürün bilgisi, sorgular, siparişler, değişiklikler ve geri bildirim müşteri iletişim kanalları üzerinden yürütülür. ${refProc("SOP-CRP", tr)}`
      : `Product information, inquiries, orders, changes and feedback are managed through customer communication channels. ${refProc("SOP-CRP", tr)}`,
  },
  {
    clauseNo: "7.3",
    titleTr: "Tasarım ve Geliştirme",
    titleEn: "Design and Development",
    skip: (ctx) => !isBooleanTrue(ctx.answers.designAndDevelopmentIncluded),
    body: (_ctx, tr) => refProc("SOP-DD", tr) + (tr
      ? "\nPlanlama, girdi/çıktı, doğrulama/doğrulama, transfer, değişiklikler ve dosya kayıtları ISO 13485 7.3 alt maddelerine uygun yürütülür."
      : "\nPlanning, inputs/outputs, verification/validation, transfer, changes and design file records follow ISO 13485 clause 7.3 subclauses."),
  },
  {
    clauseNo: "7.4",
    titleTr: "Satın Alma",
    titleEn: "Purchasing",
    body: (ctx, tr, TBC) => tr
      ? `Satın alma sorumlusu: ${str(ctx.answers.purchasingResponsible) || TBC}. ${refProc("SOP-PU", tr)} Tedarikçi değerlendirme: ${sop(ctx.answers, "supplierProcedureCode", "SOP-SE")}. Tedarikçi riskleri: ${slice(ctx.answers.supplierRisks, 400) || TBC}.`
      : `Purchasing responsible: ${str(ctx.answers.purchasingResponsible) || TBC}. ${refProc("SOP-PU", tr)} Supplier evaluation: ${sop(ctx.answers, "supplierProcedureCode", "SOP-SE")}. Supplier risks: ${slice(ctx.answers.supplierRisks, 400) || TBC}.`,
  },
  {
    clauseNo: "7.5.1",
    titleTr: "Üretim ve Hizmet Sunumu — Genel",
    titleEn: "Production and Service Provision — General",
    body: (ctx, tr, TBC) => tr
      ? `Üretim sorumlusu: ${str(ctx.answers.productionResponsible) || TBC}. ${refProc(sop(ctx.answers, "productionProcedureCode", "SOP-PC"), tr)}\nÜretim yöntemleri: ${slice(ctx.answers.manufacturingMethods, 1000) || TBC}.`
      : `Production responsible: ${str(ctx.answers.productionResponsible) || TBC}. ${refProc(sop(ctx.answers, "productionProcedureCode", "SOP-PC"), tr)}\nManufacturing methods: ${slice(ctx.answers.manufacturingMethods, 1000) || TBC}.`,
  },
  {
    clauseNo: "7.5.2",
    titleTr: "Ürün Temizliği",
    titleEn: "Cleanliness of Product",
    body: (_ctx, tr) => refProc("SOP-CLN", tr),
  },
  {
    clauseNo: "7.5.3",
    titleTr: "Kurulum Faaliyetleri",
    titleEn: "Installation Activities",
    skip: (ctx) => !isBooleanTrue(ctx.answers.installationServicingIncluded),
    body: (_ctx, tr) => refProc("SOP-INST", tr),
  },
  {
    clauseNo: "7.5.4",
    titleTr: "Servis Hizmetleri",
    titleEn: "Servicing",
    skip: (ctx) => !isBooleanTrue(ctx.answers.installationServicingIncluded),
    body: (_ctx, tr) => refProc("SOP-SRV", tr),
  },
  {
    clauseNo: "7.5.5",
    titleTr: "Steril Tıbbi Cihazlara Özel Gereklilikler",
    titleEn: "Particular Requirements for Sterile Medical Devices",
    skip: (ctx) => !isBooleanTrue(ctx.answers.sterileProductsIncluded),
    body: (ctx, tr, TBC) => tr
      ? `Sterilizasyon yöntemi: ${str(ctx.answers.sterilizationMethod) || TBC}. ${refProc(sop(ctx.answers, "sterilizationProcedureCode", "SOP-ST"), tr)} Kontaminasyon ve aseptik işlem kayıtları tutulur.`
      : `Sterilization method: ${str(ctx.answers.sterilizationMethod) || TBC}. ${refProc(sop(ctx.answers, "sterilizationProcedureCode", "SOP-ST"), tr)} Contamination and aseptic processing records are maintained.`,
  },
  {
    clauseNo: "7.5.6",
    titleTr: "Süreç Validasyonu",
    titleEn: "Validation of Processes",
    body: (_ctx, tr) => refProc("SOP-PV", tr) + (tr
      ? "\nÖzel süreçler validasyon planı, IQ/OQ/PQ ve yeniden validasyon kriterleri ile doğrulanır."
      : "\nSpecial processes are validated via validation plans, IQ/OQ/PQ and revalidation criteria."),
  },
  {
    clauseNo: "7.5.7",
    titleTr: "Sterilizasyon ve Steril Bariyer Sistemleri",
    titleEn: "Sterilization and Sterile Barrier Systems",
    skip: (ctx) => !isBooleanTrue(ctx.answers.sterileProductsIncluded),
    body: (ctx, tr) => refProc(sop(ctx.answers, "sterilizationProcedureCode", "SOP-ST"), tr),
  },
  {
    clauseNo: "7.5.8",
    titleTr: "Tanımlama",
    titleEn: "Identification",
    body: (_ctx, tr) => refProc("SOP-ID", tr),
  },
  {
    clauseNo: "7.5.9",
    titleTr: "İzlenebilirlik",
    titleEn: "Traceability",
    body: (ctx, tr, TBC) => tr
      ? `İzlenebilirlik: ${slice(ctx.answers.traceabilityMethod, 800) || TBC}. ${refProc("SOP-TR", tr)}`
      : `Traceability: ${slice(ctx.answers.traceabilityMethod, 800) || TBC}. ${refProc("SOP-TR", tr)}`,
  },
  {
    clauseNo: "7.5.10",
    titleTr: "Müşteri Mülkiyeti",
    titleEn: "Customer Property",
    body: (_ctx, tr, TBC) => tr
      ? `Müşteriye ait malzeme, kalıp veya veri varsa tanımlama, koruma ve kayıp/hasar bildirimi: ${TBC}. ${refProc(sop(_ctx.answers, "productionProcedureCode", "SOP-PC"), tr)}`
      : `Identification, protection and reporting of loss/damage for customer property: ${TBC}. ${refProc(sop(_ctx.answers, "productionProcedureCode", "SOP-PC"), tr)}`,
    requiresConfirmation: true,
  },
  {
    clauseNo: "7.5.11",
    titleTr: "Ürün Koruma",
    titleEn: "Preservation of Product",
    body: (ctx, tr, TBC) => tr
      ? `Ambalaj validasyonu: ${slice(ctx.answers.packagingValidation, 400) || TBC}. Raf ömrü: ${slice(ctx.answers.shelfLifeValidation, 400) || TBC}. ${refProc("SOP-PP", tr)}`
      : `Packaging validation: ${slice(ctx.answers.packagingValidation, 400) || TBC}. Shelf life: ${slice(ctx.answers.shelfLifeValidation, 400) || TBC}. ${refProc("SOP-PP", tr)}`,
  },
  {
    clauseNo: "7.6",
    titleTr: "İzleme ve Ölçme Cihazlarının Kontrolü",
    titleEn: "Control of Monitoring and Measuring Equipment",
    body: (ctx, tr, TBC) => tr
      ? `Test ve muayene: ${slice(ctx.answers.testAndInspectionActivities, 600) || TBC}. ${refProc("SOP-ME", tr)}`
      : `Test and inspection: ${slice(ctx.answers.testAndInspectionActivities, 600) || TBC}. ${refProc("SOP-ME", tr)}`,
  },
  {
    clauseNo: "8.1",
    titleTr: "Genel — İzleme, Ölçme ve İyileştirme",
    titleEn: "General — Monitoring, Measurement and Improvement",
    body: (_ctx, tr) => tr
      ? `İzleme ve ölçme planları süreç KPI'ları, ürün muayenesi ve veri analizi ile sürekli iyileştirmeyi destekler.`
      : `Monitoring and measurement plans support continual improvement via process KPIs, product inspection and data analysis.`,
  },
  {
    clauseNo: "8.2.1",
    titleTr: "Geri Bildirim",
    titleEn: "Feedback",
    body: (ctx, tr, TBC) => tr
      ? `Geri bildirim ve PMS: ${slice(ctx.answers.pmsMethod, 600) || slice(ctx.answers.customerFeedbackMethod, 600) || TBC}. ${refProc("SOP-FB", tr)}`
      : `Feedback and PMS: ${slice(ctx.answers.pmsMethod, 600) || slice(ctx.answers.customerFeedbackMethod, 600) || TBC}. ${refProc("SOP-FB", tr)}`,
  },
  {
    clauseNo: "8.2.2",
    titleTr: "Şikâyet İşleme",
    titleEn: "Complaint Handling",
    body: (ctx, tr, TBC) => tr
      ? `Şikâyet sorumlusu: ${str(ctx.answers.complaintHandlingResponsible) || TBC}. Yöntem: ${slice(ctx.answers.complaintHandlingMethod, 800) || TBC}. ${refProc(sop(ctx.answers, "complaintProcedureCode", "SOP-CH"), tr)}`
      : `Complaint responsible: ${str(ctx.answers.complaintHandlingResponsible) || TBC}. Method: ${slice(ctx.answers.complaintHandlingMethod, 800) || TBC}. ${refProc(sop(ctx.answers, "complaintProcedureCode", "SOP-CH"), tr)}`,
  },
  {
    clauseNo: "8.2.3",
    titleTr: "Düzenleyici Bildirim",
    titleEn: "Reporting to Regulatory Authorities",
    body: (ctx, tr, TBC) => tr
      ? `Vijilans: ${slice(ctx.answers.vigilanceReportingMethod, 600) || TBC}. ${refProc(sop(ctx.answers, "vigilanceProcedureCode", "SOP-VG"), tr)}`
      : `Vigilance: ${slice(ctx.answers.vigilanceReportingMethod, 600) || TBC}. ${refProc(sop(ctx.answers, "vigilanceProcedureCode", "SOP-VG"), tr)}`,
  },
  {
    clauseNo: "8.2.4",
    titleTr: "İç Tetkik",
    titleEn: "Internal Audit",
    body: (ctx, tr, TBC) => tr
      ? `İç tetkik sorumlusu: ${str(ctx.answers.internalAuditResponsible) || TBC}. ${refProc(sop(ctx.answers, "internalAuditProcedureCode", "SOP-IA"), tr)}`
      : `Internal audit responsible: ${str(ctx.answers.internalAuditResponsible) || TBC}. ${refProc(sop(ctx.answers, "internalAuditProcedureCode", "SOP-IA"), tr)}`,
  },
  {
    clauseNo: "8.2.5",
    titleTr: "Süreçlerin İzlenmesi ve Ölçülmesi",
    titleEn: "Monitoring and Measurement of Processes",
    body: (ctx, tr, TBC) => tr
      ? `Süreç KPI'ları: ${slice(ctx.answers.keyProcessKPIs, 600) || TBC}. ${refProc("SOP-MON", tr)}`
      : `Process KPIs: ${slice(ctx.answers.keyProcessKPIs, 600) || TBC}. ${refProc("SOP-MON", tr)}`,
  },
  {
    clauseNo: "8.2.6",
    titleTr: "Ürünün İzlenmesi ve Ölçülmesi",
    titleEn: "Monitoring and Measurement of Product",
    body: (ctx, tr, TBC) => tr
      ? `Ürün muayenesi: ${slice(ctx.answers.testAndInspectionActivities, 600) || TBC}. ${refProc("SOP-MON", tr)}`
      : `Product inspection: ${slice(ctx.answers.testAndInspectionActivities, 600) || TBC}. ${refProc("SOP-MON", tr)}`,
  },
  {
    clauseNo: "8.3.1",
    titleTr: "Uygunsuz Ürünün Kontrolü — Genel",
    titleEn: "Control of Nonconforming Product — General",
    body: (ctx, tr, TBC) => tr
      ? `Uygunsuzluklar tanımlanır, ayırılır ve değerlendirilir. ${refProc("SOP-NCP", tr)}\nYöntem: ${slice(ctx.answers.nonconformingProductControl, 600) || TBC}.`
      : `Nonconformities are identified, segregated and evaluated. ${refProc("SOP-NCP", tr)}\nMethod: ${slice(ctx.answers.nonconformingProductControl, 600) || TBC}.`,
  },
  {
    clauseNo: "8.3.2",
    titleTr: "Teslimattan Önce Tespit Edilen Uygunsuzluk",
    titleEn: "Actions for Nonconforming Product Detected Before Delivery",
    body: (_ctx, tr) => refProc("SOP-NCP", tr) + (tr
      ? "\nDüzeltme, yeniden işleme veya imha kararları yetkili onay ile verilir; müşteri bilgilendirmesi gerektiğinde yapılır."
      : "\nRework, repair or scrap decisions are approved by authorized personnel; customers are informed when required."),
  },
  {
    clauseNo: "8.3.3",
    titleTr: "Danışma Bildirimleri ve FSCA",
    titleEn: "Advisory Notices and FSCA",
    body: (ctx, tr, TBC) => tr
      ? `Saha güvenlik düzeltici faaliyetleri: ${slice(ctx.answers.recallMethod, 400) || TBC}. ${refProc("SOP-AN", tr)}`
      : `Field safety corrective actions: ${slice(ctx.answers.recallMethod, 400) || TBC}. ${refProc("SOP-AN", tr)}`,
  },
  {
    clauseNo: "8.3.4",
    titleTr: "Yeniden İşleme",
    titleEn: "Rework",
    body: (_ctx, tr) => refProc("SOP-NCP", tr) + (tr
      ? "\nYeniden işleme planı onaylanır, doğrulanır ve kayıt altına alınır; yeniden işleme sonrası kabul kriterleri uygulanır."
      : "\nRework is planned, approved, verified and recorded; acceptance criteria apply after rework."),
  },
  {
    clauseNo: "8.4",
    titleTr: "Veri Analizi",
    titleEn: "Analysis of Data",
    body: (ctx, tr, TBC) => tr
      ? `Trend analizi: ${slice(ctx.answers.trendAnalysisMethod, 400) || TBC}. ${refProc("SOP-DA", tr)}`
      : `Trend analysis: ${slice(ctx.answers.trendAnalysisMethod, 400) || TBC}. ${refProc("SOP-DA", tr)}`,
  },
  {
    clauseNo: "8.5.1",
    titleTr: "Genel İyileştirme",
    titleEn: "General Improvement",
    body: (_ctx, tr) => tr
      ? `Sürekli iyileştirme veri analizi, iç tetkik, yönetim gözden geçirmesi ve CAPA yoluyla gerçekleştirilir.`
      : `Continual improvement is achieved through data analysis, internal audit, management review and CAPA.`,
  },
  {
    clauseNo: "8.5.2",
    titleTr: "Düzeltici Faaliyet",
    titleEn: "Corrective Action",
    body: (ctx, tr, TBC) => tr
      ? `Firmamız uygunsuzlukları (şikâyetler dahil) incelemek, kök nedenleri belirlemek, tekrarını önlemek için faaliyet planlamak ve etkinliği doğrulamak amacıyla DÖF prosedürünü dokümante etmiş ve uygular.\n\nSüreç özeti: ${slice(ctx.answers.capaMethod, 800) || TBC}.\nKayıtlar ilgili formlar ve ${sop(ctx.answers, "recordControlProcedureCode", "SOP-RC")} kapsamında saklanır. Sonuçlar yönetim gözden geçirmesinde değerlendirilir. ${refProc(sop(ctx.answers, "capaProcedureCode", "SOP-CAPA"), tr)}`
      : `Our company has documented and implements a corrective action procedure to review nonconformities (including complaints), determine root causes, plan actions to prevent recurrence and verify effectiveness.\n\nProcess summary: ${slice(ctx.answers.capaMethod, 800) || TBC}.\nRecords are retained per applicable forms and ${sop(ctx.answers, "recordControlProcedureCode", "SOP-RC")}. Results are reviewed in management review. ${refProc(sop(ctx.answers, "capaProcedureCode", "SOP-CAPA"), tr)}`,
  },
  {
    clauseNo: "8.5.3",
    titleTr: "Önleyici Faaliyet",
    titleEn: "Preventive Action",
    body: (ctx, tr) => refProc(sop(ctx.answers, "capaProcedureCode", "SOP-CAPA"), tr) + (tr
      ? "\nRisk analizi ve trend verilerinden önleyici aksiyonlar planlanır."
      : "\nPreventive actions are planned from risk analysis and trend data."),
  },
];

const CHAPTER_INTROS: Record<string, { titleTr: string; titleEn: string; introTr: string; introEn: string }> = {
  "4": {
    titleTr: "KALİTE YÖNETİM SİSTEMİ",
    titleEn: "QUALITY MANAGEMENT SYSTEM",
    introTr: "Bu bölüm ISO 13485 Madde 4 gerekliliklerini el kitabı düzeyinde açıklar. Uygulama detayı ilgili prosedür ve kayıtlarda tanımlıdır.",
    introEn: "This chapter explains ISO 13485 clause 4 requirements at quality manual level. Implementation detail is defined in linked procedures and records.",
  },
  "5": {
    titleTr: "YÖNETİM SORUMLULUĞU",
    titleEn: "MANAGEMENT RESPONSIBILITY",
    introTr: "Üst yönetim taahhüdü, politika, hedefler, organizasyon ve yönetim gözden geçirmesi bu bölümde özetlenir.",
    introEn: "Top management commitment, policy, objectives, organization and management review are summarized in this chapter.",
  },
  "6": {
    titleTr: "KAYNAK YÖNETİMİ",
    titleEn: "RESOURCE MANAGEMENT",
    introTr: "İnsan kaynakları, altyapı ve çalışma ortamı gereklilikleri bu bölümde açıklanır.",
    introEn: "Human resources, infrastructure and work environment requirements are described in this chapter.",
  },
  "7": {
    titleTr: "ÜRÜN GERÇEKLEŞTİRME",
    titleEn: "PRODUCT REALIZATION",
    introTr: "Ürün gerçekleştirme planlamasından satın alma, üretim ve izlenebilirliğe kadar süreçler bu bölümde özetlenir.",
    introEn: "Processes from product realization planning through purchasing, production and traceability are summarized in this chapter.",
  },
  "8": {
    titleTr: "ÖLÇÜM, ANALİZ VE İYİLEŞTİRME",
    titleEn: "MEASUREMENT, ANALYSIS AND IMPROVEMENT",
    introTr: "İzleme, şikâyet, iç tetkik, uygunsuz ürün kontrolü, veri analizi ve CAPA bu bölümde açıklanır.",
    introEn: "Monitoring, complaints, internal audit, nonconforming product control, data analysis and CAPA are described in this chapter.",
  },
};

export function buildIso13485DetailedClauseSections(
  answers: Record<string, unknown>,
  locale: "tr" | "en",
  companyName: string,
  qmsDocCount: number,
  options: { bilingual?: boolean } = {},
): QmManualSection[] {
  const bilingual = options.bilingual ?? true;
  const tr = locale === "tr";
  const TBC = "[TO BE CONFIRMED]";
  const ctx: ClauseCtx = {
    answers,
    locale,
    legal: str(answers.companyLegalName) || companyName,
    scope: str(answers.scopeStatement) || str(answers.qmsScope),
    sites: str(answers.sites) || str(answers.address),
    qmsDocCount,
  };

  const sections: QmManualSection[] = [];
  let currentChapter = "";

  for (const def of CLAUSES) {
    if (def.skip?.(ctx)) continue;

    const chapter = def.clauseNo.split(".")[0];
    if (chapter !== currentChapter && CHAPTER_INTROS[chapter]) {
      currentChapter = chapter;
      const ch = CHAPTER_INTROS[chapter];
      sections.push({
        heading: chapterHeading(chapter, ch.titleTr, ch.titleEn),
        content: bilingual ? bi(ch.introTr, ch.introEn) : (tr ? ch.introTr : ch.introEn),
      });
    }

    let needsConfirm: boolean | undefined;
    if (typeof def.requiresConfirmation === "function") {
      needsConfirm = def.requiresConfirmation(ctx);
    } else {
      needsConfirm = def.requiresConfirmation;
    }

    const trBody = def.body(ctx, true, TBC);
    const enBody = def.body(ctx, false, TBC);
    let content = bilingual ? bi(trBody, enBody) : (tr ? trBody : enBody);
    content = appendClauseProcedureReferences(def.clauseNo, content, answers, bilingual);

    sections.push({
      heading: heading(tr, def.clauseNo, def.titleTr, def.titleEn),
      content,
      requiresConfirmation: needsConfirm,
    });
  }

  return sections;
}
