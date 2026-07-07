import type { AssessmentType, AuditStandardScope } from "./types";
import { ASSESSMENT_COUNT } from "./types";

export interface QuestionTemplate {
  standardCode: string;
  clauseNo: string;
  /** English — stored in DB and used by the scoring engine */
  question: string;
  expectedEvidence: string;
  /** Turkish display text */
  questionTr: string;
  expectedEvidenceTr: string;
  scopes: AuditStandardScope[];
  weight: number;
}

// Paraphrased auditor questions — no copyrighted standard text.
const BANK: QuestionTemplate[] = [
  // ISO 13485 — QMS
  {
    standardCode: "ISO 13485", clauseNo: "4.2.4",
    question: "Is a Document Control Procedure available and applied? Please show evidence.",
    expectedEvidence: "Document Control Procedure (controlled copy, approval, revision history)",
    questionTr: "Doküman kontrol prosedürü mevcut mu ve uygulanıyor mu? Kanıt gösteriniz.",
    expectedEvidenceTr: "Doküman Kontrol Prosedürü (kontrollü kopya, onay, revizyon geçmişi)",
    scopes: ["ISO_13485", "ISO_9001", "COMBINED"], weight: 10,
  },
  {
    standardCode: "ISO 13485", clauseNo: "4.2.5",
    question: "How are quality records controlled, retained and protected?",
    expectedEvidence: "Record Control Procedure and retention schedule",
    questionTr: "Kalite kayıtları nasıl kontrol edilir, saklanır ve korunur?",
    expectedEvidenceTr: "Kayıt Kontrol Prosedürü ve saklama süresi tablosu",
    scopes: ["ISO_13485", "ISO_9001", "COMBINED"], weight: 8,
  },
  {
    standardCode: "ISO 13485", clauseNo: "4.2.3",
    question: "Is a Medical Device File maintained for each device or device family?",
    expectedEvidence: "Medical Device File / technical documentation index",
    questionTr: "Her cihaz veya cihaz ailesi için tıbbi cihaz dosyası (Medical Device File) tutuluyor mu?",
    expectedEvidenceTr: "Tıbbi cihaz dosyası / teknik dokümantasyon indeksi",
    scopes: ["ISO_13485", "MDR", "COMBINED"], weight: 9,
  },
  {
    standardCode: "ISO 13485", clauseNo: "4.2.1",
    question: "How are documents approved before issue and how is the current revision identified?",
    expectedEvidence: "Approved document register with revision status and approval signatures",
    questionTr: "Dokümanlar yayınlanmadan önce nasıl onaylanır ve güncel revizyon nasıl tanımlanır?",
    expectedEvidenceTr: "Onaylı doküman listesi, revizyon durumu ve onay imzaları",
    scopes: ["ISO_13485", "ISO_9001", "COMBINED"], weight: 8,
  },
  {
    standardCode: "ISO 13485", clauseNo: "4.1",
    question: "Is a quality manual available that defines the scope of the QMS and references procedures?",
    expectedEvidence: "Quality Manual with scope, exclusions and procedure references",
    questionTr: "KYS kapsamını tanımlayan ve prosedürlere atıf yapan bir kalite el kitabı mevcut mu?",
    expectedEvidenceTr: "Kapsam, istisnalar ve prosedür referanslarını içeren Kalite El Kitabı",
    scopes: ["ISO_13485", "ISO_9001", "COMBINED"], weight: 9,
  },
  {
    standardCode: "ISO 13485", clauseNo: "7.1",
    question: "On which standard is your Risk Management Procedure based, and how is it applied across the lifecycle?",
    expectedEvidence: "Risk Management Procedure referencing ISO 14971",
    questionTr: "Risk yönetim prosedürünüz hangi standarda dayanıyor ve yaşam döngüsü boyunca nasıl uygulanıyor?",
    expectedEvidenceTr: "ISO 14971'e atıf yapan Risk Yönetim Prosedürü",
    scopes: ["ISO_13485", "ISO_14971", "COMBINED"], weight: 9,
  },
  {
    standardCode: "ISO 13485", clauseNo: "7.3",
    question: "How is design and development planned, reviewed, verified and validated?",
    expectedEvidence: "Design & Development Procedure, design plan and review records",
    questionTr: "Tasarım ve geliştirme nasıl planlanır, gözden geçirilir, doğrulanır ve valide edilir?",
    expectedEvidenceTr: "Tasarım & Geliştirme Prosedürü, tasarım planı ve gözden geçirme kayıtları",
    scopes: ["ISO_13485", "MDR", "COMBINED"], weight: 8,
  },
  {
    standardCode: "ISO 13485", clauseNo: "7.4",
    question: "How are suppliers evaluated, selected and re-evaluated?",
    expectedEvidence: "Supplier Evaluation Procedure and approved supplier list",
    questionTr: "Tedarikçiler nasıl değerlendirilir, seçilir ve yeniden değerlendirilir?",
    expectedEvidenceTr: "Tedarikçi Değerlendirme Prosedürü ve onaylı tedarikçi listesi",
    scopes: ["ISO_13485", "ISO_9001", "COMBINED"], weight: 6,
  },
  {
    standardCode: "ISO 13485", clauseNo: "7.5.1",
    question: "How is production and service provision controlled to ensure conformity?",
    expectedEvidence: "Production control procedure, work instructions and batch records",
    questionTr: "Üretim ve hizmet sunumu, uygunluğu sağlamak için nasıl kontrol edilir?",
    expectedEvidenceTr: "Üretim kontrol prosedürü, iş talimatları ve parti kayıtları",
    scopes: ["ISO_13485", "MDR", "COMBINED"], weight: 7,
  },
  {
    standardCode: "ISO 13485", clauseNo: "7.5.6",
    question: "How are special processes (e.g. sterilization) validated and monitored?",
    expectedEvidence: "Process validation reports",
    questionTr: "Özel prosesler (ör. sterilizasyon) nasıl valide edilir ve izlenir?",
    expectedEvidenceTr: "Proses validasyon raporları",
    scopes: ["ISO_13485", "MDR", "COMBINED"], weight: 7,
  },
  {
    standardCode: "ISO 13485", clauseNo: "7.5.5",
    question: "Where applicable, how is sterilization validated and how are sterilization records maintained?",
    expectedEvidence: "Sterilization validation protocol/report and sterilization log",
    questionTr: "Uygulanabilir olduğunda sterilizasyon nasıl valide edilir ve kayıtlar nasıl tutulur?",
    expectedEvidenceTr: "Sterilizasyon validasyon protokolü/raporu ve sterilizasyon kayıtları",
    scopes: ["ISO_13485", "MDR", "COMBINED"], weight: 7,
  },
  {
    standardCode: "ISO 13485", clauseNo: "8.2.2",
    question: "Describe your complaint handling process and how complaints feed vigilance and CAPA.",
    expectedEvidence: "Complaint Handling Procedure and complaint records",
    questionTr: "Şikâyet yönetim sürecinizi açıklayınız; şikâyetler vigilans ve DÖF'e nasıl aktarılır?",
    expectedEvidenceTr: "Şikâyet Yönetimi Prosedürü ve şikâyet kayıtları",
    scopes: ["ISO_13485", "MDR", "COMBINED"], weight: 8,
  },
  {
    standardCode: "ISO 13485", clauseNo: "8.5.2",
    question: "How are corrective and preventive actions (CAPA) initiated, tracked and verified for effectiveness?",
    expectedEvidence: "CAPA Procedure and CAPA log with effectiveness checks",
    questionTr: "Düzeltici ve önleyici faaliyetler (DÖF/CAPA) nasıl başlatılır, izlenir ve etkinliği doğrulanır?",
    expectedEvidenceTr: "DÖF Prosedürü ve etkinlik kontrolü içeren DÖF kayıtları",
    scopes: ["ISO_13485", "ISO_9001", "COMBINED"], weight: 9,
  },
  {
    standardCode: "ISO 13485", clauseNo: "8.2.4",
    question: "Is there an internal audit programme, and are audits performed to schedule?",
    expectedEvidence: "Internal Audit Procedure, audit plan and reports",
    questionTr: "İç denetim programı var mı ve denetimler plana uygun yapılıyor mu?",
    expectedEvidenceTr: "İç Denetim Prosedürü, denetim planı ve raporları",
    scopes: ["ISO_13485", "ISO_9001", "COMBINED"], weight: 7,
  },
  {
    standardCode: "ISO 13485", clauseNo: "5.6",
    question: "How often is management review performed and what inputs/outputs are recorded?",
    expectedEvidence: "Management Review Procedure and meeting minutes",
    questionTr: "Yönetimin gözden geçirmesi ne sıklıkla yapılır; girdiler ve çıktılar nasıl kaydedilir?",
    expectedEvidenceTr: "YGG Prosedürü ve toplantı tutanakları",
    scopes: ["ISO_13485", "ISO_9001", "COMBINED"], weight: 7,
  },
  {
    standardCode: "ISO 13485", clauseNo: "6.2",
    question: "How is personnel competence and training managed and recorded?",
    expectedEvidence: "Training Procedure and training records",
    questionTr: "Personel yeterliliği ve eğitimleri nasıl yönetilir ve kayıt altına alınır?",
    expectedEvidenceTr: "Eğitim Prosedürü ve eğitim kayıtları",
    scopes: ["ISO_13485", "ISO_9001", "COMBINED"], weight: 5,
  },
  {
    standardCode: "ISO 13485", clauseNo: "8.3",
    question: "How is nonconforming product identified, segregated and dispositioned?",
    expectedEvidence: "Nonconforming Product Procedure and NCR records",
    questionTr: "Uygunsuz ürün nasıl tanımlanır, ayrılır ve disposition uygulanır?",
    expectedEvidenceTr: "Uygunsuz Ürün Prosedürü ve uygunsuzluk kayıtları",
    scopes: ["ISO_13485", "ISO_9001", "COMBINED"], weight: 6,
  },
  {
    standardCode: "ISO 13485", clauseNo: "8.2.1",
    question: "How is feedback from production and post-production collected and reviewed?",
    expectedEvidence: "Feedback/PMS procedure and review records",
    questionTr: "Üretim sonrası geri bildirimler nasıl toplanır ve gözden geçirilir?",
    expectedEvidenceTr: "Geri bildirim/PMS prosedürü ve gözden geçirme kayıtları",
    scopes: ["ISO_13485", "MDR", "COMBINED"], weight: 6,
  },

  // MDR
  {
    standardCode: "MDR 2017/745", clauseNo: "Annex II",
    question: "Is the technical documentation complete and structured per Annex II?",
    expectedEvidence: "Technical file index covering Annex II sections",
    questionTr: "Teknik dokümantasyon Ek II'ye uygun şekilde tam ve yapılandırılmış mı?",
    expectedEvidenceTr: "Ek II bölümlerini kapsayan teknik dosya indeksi",
    scopes: ["MDR", "COMBINED"], weight: 9,
  },
  {
    standardCode: "MDR 2017/745", clauseNo: "Annex I",
    question: "How do you demonstrate conformity with the General Safety and Performance Requirements (GSPR)?",
    expectedEvidence: "GSPR checklist with evidence per applicable requirement",
    questionTr: "Genel Güvenlik ve Performans Gereklilikleri (GSPR) uygunluğunu nasıl gösteriyorsunuz?",
    expectedEvidenceTr: "Uygulanabilir her madde için kanıt içeren GSPR kontrol listesi",
    scopes: ["MDR", "COMBINED"], weight: 9,
  },
  {
    standardCode: "MDR 2017/745", clauseNo: "Annex XIV",
    question: "How is clinical evaluation conducted and kept up to date?",
    expectedEvidence: "Clinical Evaluation Plan and Report (CER)",
    questionTr: "Klinik değerlendirme nasıl yapılır ve güncel tutulur?",
    expectedEvidenceTr: "Klinik Değerlendirme Planı ve Raporu (CER)",
    scopes: ["MDR", "COMBINED"], weight: 8,
  },
  {
    standardCode: "MDR 2017/745", clauseNo: "Annex III",
    question: "Describe your post-market surveillance system and how data is collected and reviewed.",
    expectedEvidence: "PMS plan and PMS/PSUR reports",
    questionTr: "Piyasa sonrası gözetim sisteminizi açıklayınız; veriler nasıl toplanır ve gözden geçirilir?",
    expectedEvidenceTr: "PMS planı ve PMS/PSUR raporları",
    scopes: ["MDR", "COMBINED"], weight: 8,
  },
  {
    standardCode: "MDR 2017/745", clauseNo: "Art. 10(9)",
    question: "How do you ensure UDI assignment and labeling compliance?",
    expectedEvidence: "UDI records and label control",
    questionTr: "UDI ataması ve etiketleme uygunluğunu nasıl sağlıyorsunuz?",
    expectedEvidenceTr: "UDI kayıtları ve etiket kontrolü",
    scopes: ["MDR", "COMBINED"], weight: 6,
  },
  {
    standardCode: "MDR 2017/745", clauseNo: "Art. 10",
    question: "How do you ensure general obligations of the manufacturer are met (technical documentation, PMS, vigilance)?",
    expectedEvidence: "Technical file, PMS and vigilance procedure references",
    questionTr: "Üretici genel yükümlülükleri (teknik dosya, PMS, vigilans) nasıl karşılanır?",
    expectedEvidenceTr: "Teknik dosya, PMS ve vigilans prosedür referansları",
    scopes: ["MDR", "COMBINED"], weight: 7,
  },

  // ISO 14971
  {
    standardCode: "ISO 14971", clauseNo: "Clause 4",
    question: "How is the risk management plan established for each device?",
    expectedEvidence: "Risk Management Plan",
    questionTr: "Her cihaz için risk yönetim planı nasıl oluşturulur?",
    expectedEvidenceTr: "Risk Yönetim Planı",
    scopes: ["ISO_14971", "MDR", "COMBINED"], weight: 8,
  },
  {
    standardCode: "ISO 14971", clauseNo: "Clause 7",
    question: "How are risk control measures defined and their effectiveness verified?",
    expectedEvidence: "Risk analysis with controls and verification",
    questionTr: "Risk kontrol önlemleri nasıl tanımlanır ve etkinlikleri nasıl doğrulanır?",
    expectedEvidenceTr: "Kontroller ve doğrulama içeren risk analizi",
    scopes: ["ISO_14971", "MDR", "COMBINED"], weight: 9,
  },
  {
    standardCode: "ISO 14971", clauseNo: "Clause 8",
    question: "How is overall residual risk evaluated and justified against benefits?",
    expectedEvidence: "Benefit-risk analysis",
    questionTr: "Genel artık risk nasıl değerlendirilir ve fayda-risk analizi ile gerekçelendirilir?",
    expectedEvidenceTr: "Fayda-risk analizi",
    scopes: ["ISO_14971", "MDR", "COMBINED"], weight: 7,
  },
  {
    standardCode: "ISO 14971", clauseNo: "Clause 5",
    question: "How is risk analysis performed and documented for identified hazards?",
    expectedEvidence: "Risk analysis file with hazard identification and estimation",
    questionTr: "Tanımlanan tehlikeler için risk analizi nasıl yapılır ve dokümante edilir?",
    expectedEvidenceTr: "Tehlike tanımlama ve değerlendirme içeren risk analiz dosyası",
    scopes: ["ISO_14971", "MDR", "COMBINED"], weight: 8,
  },

  // ISO 9001
  {
    standardCode: "ISO 9001", clauseNo: "4.1",
    question: "How have you determined the context of the organization and interested parties?",
    expectedEvidence: "Context analysis and interested parties register",
    questionTr: "Kuruluş bağlamı ve ilgili taraflar nasıl belirlenmiştir?",
    expectedEvidenceTr: "Bağlam analizi ve ilgili taraflar kaydı",
    scopes: ["ISO_9001", "COMBINED"], weight: 6,
  },
  {
    standardCode: "ISO 9001", clauseNo: "6.1",
    question: "How are risks and opportunities addressed in your QMS?",
    expectedEvidence: "Risk and opportunity register",
    questionTr: "KYS içinde riskler ve fırsatlar nasıl ele alınır?",
    expectedEvidenceTr: "Risk ve fırsat kaydı",
    scopes: ["ISO_9001", "COMBINED"], weight: 6,
  },
  {
    standardCode: "ISO 9001", clauseNo: "9.1.2",
    question: "How do you monitor customer satisfaction?",
    expectedEvidence: "Customer satisfaction data and analysis",
    questionTr: "Müşteri memnuniyeti nasıl izlenir?",
    expectedEvidenceTr: "Müşteri memnuniyeti verileri ve analizi",
    scopes: ["ISO_9001", "COMBINED"], weight: 5,
  },
];

/** Looks up the importance weight for a stored question (by exact question text). */
export function weightForQuestion(question: string): number {
  return BANK.find((q) => q.question === question)?.weight ?? 6;
}

function findTemplate(row: { question: string; clauseNo: string; standardCode: string }): QuestionTemplate | undefined {
  return (
    BANK.find((b) => b.clauseNo === row.clauseNo && b.standardCode === row.standardCode) ??
    BANK.find((b) => b.question === row.question)
  );
}

/** Localize stored session questions for UI display (engine keeps English in DB). */
export function localizeAuditQuestion(
  row: { question: string; expectedEvidence: string | null; clauseNo: string; standardCode: string },
  lang: "tr" | "en",
): { question: string; expectedEvidence: string | null } {
  if (lang !== "tr") {
    return { question: row.question, expectedEvidence: row.expectedEvidence };
  }
  const tpl = findTemplate(row);
  if (!tpl) return { question: row.question, expectedEvidence: row.expectedEvidence };
  return { question: tpl.questionTr, expectedEvidence: tpl.expectedEvidenceTr };
}

/** Deterministically selects questions for a session based on standard scope and assessment depth. */
export function selectQuestions(standard: AuditStandardScope, assessment: AssessmentType): QuestionTemplate[] {
  const count = ASSESSMENT_COUNT[assessment];
  const pool = BANK.filter((q) => standard === "COMBINED" || q.scopes.includes(standard));
  const sorted = [...pool].sort((a, b) => b.weight - a.weight);
  return sorted.slice(0, count);
}
