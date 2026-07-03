import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getMeteredAiProvider, extractJson } from "@/lib/ai/provider-factory";
import { AiTokenLimitError } from "@/lib/auth/errors";
import { REGULATORY_GUARDRAILS } from "@/lib/ai/prompts/shared";
import { ORGANIZATION_WIZARD_ROLE_KEYS, type OrganizationWizardRoleKey } from "./organization-from-word";

export interface OrganizationRoleInput {
  key: OrganizationWizardRoleKey;
  label: string;
  holder: string;
}

const ROLE_RESPONSIBILITIES_TR: Record<OrganizationWizardRoleKey, string[]> = {
  generalManager: [
    "Kalite politikasını onaylamak ve üst yönetim taahhüdünü göstermek",
    "KYS için gerekli insan, altyapı ve mali kaynakları tahsis etmek",
    "Yönetimin gözden geçirmesi çıktılarını değerlendirmek ve iyileştirme kararları almak",
    "Düzenleyici uygunluk ve ürün güvenliği risklerini üst yönetim düzeyinde yönetmek",
    "Organizasyon yapısını ve sorumluluk atamalarını onaylamak",
  ],
  managementRepresentative: [
    "KYS'nin MDR/ISO 13485 gerekliliklerine uygun kurulması ve sürdürülmesini koordine etmek",
    "Üst yönetime KYS performansı, denetim sonuçları ve düzenleyici durum hakkında raporlama",
    "Bildirilen kuruluş, yetkili temsilci ve düzenleyici otorite ile iletişim",
    "KYS değişiklikleri ve dokümantasyon güncellemelerinin yayılımını izlemek",
    "Yönetim gözden geçirmesi için girdi verilerini toplamak",
  ],
  qualityManager: [
    "Kalite yönetim sisteminin dokümantasyonunu, uygulanmasını ve sürekli iyileştirmesini yönetmek",
    "Doküman ve kayıt kontrolü, iç denetim, CAPA ve değişiklik kontrol süreçlerini koordine etmek",
    "ISO 14971 risk yönetimi ve teknik dosya / uygunluk faaliyetleri ile uyumu sağlamak",
    "Tedarikçi, üretim ve PMS çıktılarına dayalı KYS performans göstergelerini izlemek",
    "Personel yetkinliği, eğitim ve farkındalık programlarını planlamak",
  ],
  regulatoryResponsible: [
    "MDR/IVDR uygunluk dosyaları, teknik dosya ve beyan edilen uygunluk takibi",
    "EUDAMED kayıtları, UDI ve düzenleyici bildirimler (vijilans) koordinasyonu",
    "PRRC görevleri ve düzenleyici iletişim kayıtlarının tutulması",
    "Piyasa sonrası verilerin düzenleyici değerlendirmeye entegrasyonu",
    "Standart ve mevzuat değişikliklerinin KYS'e yansıtılmasını desteklemek",
  ],
  productionResponsible: [
    "Üretim planlama, süreç kontrolü ve serbest bırakma prosedürlerinin uygulanması",
    "Üretim kayıtları, lot/seri izlenebilirliği ve kalite kontrol sonuçları",
    "Proses validasyonu, temizlik ve çevre koşullarının izlenmesi",
    "Uygunsuz ürün kontrolü ve ayırma faaliyetlerinin yönetimi",
    "Üretim değişikliklerinin değişiklik kontrol sürecine bildirimi",
  ],
  purchasingResponsible: [
    "Tedarikçi değerlendirme, onaylı tedarikçi listesi ve yeniden değerlendirme",
    "Satın alma şartlarının ve kritik girdi spesifikasyonlarının tanımı",
    "Girdi muayenesi ve tedarikçi performans izleme",
    "Tedarikçi uygunsuzlukları ve CAPA bağlantısı",
    "Dış kaynaklı süreçlerin kontrolü ve sözleşme gereklilikleri",
  ],
  complaintHandlingResponsible: [
    "Müşteri şikâyetlerinin kaydı, sınıflandırılması ve zamanında değerlendirilmesi",
    "Şikâyetlerin risk dosyası, CAPA ve PMS planına bağlanması",
    "Trend analizi ve düzenleyici bildirim gerekliliği değerlendirmesi",
    "Müşteriye geri bildirim ve kayıtların saklanması",
    "Şikâyet verilerinin yönetim gözden geçirmesine raporlanması",
  ],
  internalAuditResponsible: [
    "Risk tabanlı iç denetim planının hazırlanması ve yürütülmesi",
    "Denetim bulgularının raporlanması ve düzeltici faaliyet takibi",
    "Denetçi yetkinliği ve bağımsızlık kurallarının uygulanması",
    "Önceki denetim bulgularının kapanış doğrulaması",
    "İç denetim sonuçlarının yönetim gözden geçirmesine sunulması",
  ],
  managementReviewOwner: [
    "Yönetimin gözden geçirme toplantılarının planlanması ve tutanakların hazırlanması",
    "KYS hedefleri, KPI'lar ve önceki toplantı aksiyonlarının takibi",
    "PMS, denetim, CAPA ve müşteri geri bildirimi özetlerinin toplanması",
    "İyileştirme ve kaynak ihtiyacı kararlarının kaydı",
    "Gözden geçirme çıktılarının dokümantasyon ve yayılımı",
  ],
};

const ROLE_RESPONSIBILITIES_EN: Record<OrganizationWizardRoleKey, string[]> = {
  generalManager: [
    "Approve the quality policy and demonstrate management commitment",
    "Allocate human, infrastructure and financial resources for the QMS",
    "Review management review outputs and improvement decisions",
    "Oversee regulatory conformity and product safety risks at top management level",
    "Approve organization structure and role assignments",
  ],
  managementRepresentative: [
    "Coordinate QMS establishment and maintenance per MDR/ISO 13485",
    "Report QMS performance, audit results and regulatory status to top management",
    "Liaison with notified body, authorised representative and authorities",
    "Monitor communication of QMS changes and documentation updates",
    "Collect inputs for management review",
  ],
  qualityManager: [
    "Manage QMS documentation, implementation and continual improvement",
    "Coordinate document control, internal audit, CAPA and change control",
    "Ensure alignment with ISO 14971 risk management and technical file activities",
    "Monitor QMS KPIs from suppliers, production and PMS outputs",
    "Plan personnel competence, training and awareness programmes",
  ],
  regulatoryResponsible: [
    "Track MDR/IVDR conformity files, technical documentation and DoC",
    "Coordinate EUDAMED, UDI and regulatory reporting (vigilance)",
    "PRRC duties and regulatory communication records",
    "Integrate post-market data into regulatory assessment",
    "Support impact of standard and legislation changes on the QMS",
  ],
  productionResponsible: [
    "Implement production planning, process control and release procedures",
    "Production records, lot/serial traceability and QC results",
    "Monitor process validation, cleanliness and environmental conditions",
    "Manage nonconforming product control and segregation",
    "Notify production changes through change control",
  ],
  purchasingResponsible: [
    "Supplier evaluation, approved supplier list and re-evaluation",
    "Define purchasing specifications and critical incoming requirements",
    "Incoming inspection and supplier performance monitoring",
    "Supplier nonconformities and CAPA linkage",
    "Control of outsourced processes and contractual requirements",
  ],
  complaintHandlingResponsible: [
    "Record, classify and assess customer complaints in a timely manner",
    "Link complaints to risk file, CAPA and PMS plan",
    "Trend analysis and regulatory reporting need assessment",
    "Customer feedback and retention of records",
    "Report complaint data to management review",
  ],
  internalAuditResponsible: [
    "Prepare and execute risk-based internal audit plan",
    "Report findings and follow up corrective actions",
    "Ensure auditor competence and independence rules",
    "Verify closure of previous audit findings",
    "Present internal audit results to management review",
  ],
  managementReviewOwner: [
    "Plan management review meetings and prepare minutes",
    "Track QMS objectives, KPIs and prior action items",
    "Collect summaries from PMS, audits, CAPA and customer feedback",
    "Record improvement and resource decisions",
    "Document and communicate management review outputs",
  ],
};

const ROLE_LABELS_TR: Record<OrganizationWizardRoleKey, string> = {
  generalManager: "Genel Müdür",
  managementRepresentative: "Yönetim Temsilcisi",
  qualityManager: "Kalite Müdürü",
  regulatoryResponsible: "Düzenleyici Sorumlu (PRRC)",
  productionResponsible: "Üretim Sorumlusu",
  purchasingResponsible: "Satın Alma Sorumlusu",
  complaintHandlingResponsible: "Şikâyet Yönetimi Sorumlusu",
  internalAuditResponsible: "İç Denetim Sorumlusu",
  managementReviewOwner: "Yönetimin Gözden Geçirme Sorumlusu",
};

const ROLE_LABELS_EN: Record<OrganizationWizardRoleKey, string> = {
  generalManager: "General Manager",
  managementRepresentative: "Management Representative",
  qualityManager: "Quality Manager",
  regulatoryResponsible: "Regulatory Responsible (PRRC)",
  productionResponsible: "Production Responsible",
  purchasingResponsible: "Purchasing Responsible",
  complaintHandlingResponsible: "Complaint Handling Responsible",
  internalAuditResponsible: "Internal Audit Responsible",
  managementReviewOwner: "Management Review Owner",
};

const aiResultSchema = z.object({
  organizationStructureText: z.string(),
  organizationChartText: z.string(),
  organizationRolesMatrixText: z.string(),
});

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function collectOrganizationRoleInputs(
  answers: Record<string, unknown>,
  locale: "tr" | "en",
): OrganizationRoleInput[] {
  const labels = locale === "tr" ? ROLE_LABELS_TR : ROLE_LABELS_EN;
  const out: OrganizationRoleInput[] = [];
  for (const key of ORGANIZATION_WIZARD_ROLE_KEYS) {
    const holder = str(answers[key]);
    if (!holder) continue;
    out.push({ key, label: labels[key], holder });
  }
  return out;
}

export function buildAsciiChart(roles: OrganizationRoleInput[], locale: "tr" | "en"): string {
  const gmRole = roles.find((r) => r.key === "generalManager");
  const topLabel = locale === "tr" ? "Genel Müdür" : "General Manager";
  const lines: string[] = [];

  lines.push(gmRole ? `${topLabel}: ${gmRole.holder}` : topLabel);

  const roleMap = new Map(roles.map((r) => [r.key, r]));
  const underGm: OrganizationWizardRoleKey[] = [
    "managementRepresentative",
    "qualityManager",
    "regulatoryResponsible",
    "productionResponsible",
    "purchasingResponsible",
  ];
  const underQm: OrganizationWizardRoleKey[] = [
    "internalAuditResponsible",
    "complaintHandlingResponsible",
    "managementReviewOwner",
  ];

  for (const key of underGm) {
    const r = roleMap.get(key);
    if (!r) continue;
    lines.push(`├── ${r.label}: ${r.holder}`);
    if (key === "qualityManager") {
      for (const subKey of underQm) {
        const sub = roleMap.get(subKey);
        if (sub) lines.push(`│   ├── ${sub.label}: ${sub.holder}`);
      }
    }
  }

  const listed = new Set<OrganizationWizardRoleKey>([
    "generalManager",
    ...underGm,
    ...underQm,
  ]);
  for (const r of roles) {
    if (listed.has(r.key)) continue;
    lines.push(`├── ${r.label}: ${r.holder}`);
  }

  return lines.join("\n");
}

export function buildRolesMatrixMarkdown(roles: OrganizationRoleInput[], locale: "tr" | "en"): string {
  const resp = locale === "tr" ? ROLE_RESPONSIBILITIES_TR : ROLE_RESPONSIBILITIES_EN;
  const blocks: string[] = [];
  for (const r of roles) {
    blocks.push(`### ${r.label}`, "");
    const items = resp[r.key] ?? [];
    for (let i = 0; i < items.length; i++) {
      blocks.push(`${i + 1}. ${items[i]}`);
    }
    blocks.push("");
  }
  return blocks.join("\n").trim();
}

function ruleBasedOrganization(
  roles: OrganizationRoleInput[],
  locale: "tr" | "en",
  companyName: string,
  scope: string,
): z.infer<typeof aiResultSchema> {
  const chart = buildAsciiChart(roles, locale);
  const matrix = buildRolesMatrixMarkdown(roles, locale);
  const structure =
    locale === "tr"
      ? [
          `${companyName} bünyesinde kalite yönetim sistemi organizasyonu, tıbbi cihaz güvenliği, hasta güvenliği ve MDR/ISO 13485 düzenleyici uygunluk gerekliliklerini karşılamak üzere yapılandırılmıştır.`,
          scope ? `KYS kapsamı: ${scope}` : "",
          "Organizasyon yapısı; üst yönetim, yönetim temsilcisi, kalite yönetimi ve fonksiyonel sorumlular arasında tanımlı yetki, sorumluluk ve raporlama ilişkileri ile işler. Üst yönetim nihai onay otoritesidir; günlük KYS koordinasyonu Kalite Müdürü ve Yönetim Temsilcisi üzerinden yürütülür.",
          "Üretim, satın alma, düzenleyici işler, şikâyet yönetimi ve iç denetim gibi kritik süreçler için atanmış sorumlular, ilgili prosedürler ve kayıtlar üzerinden faaliyetlerini yürütür. Organizasyon şeması raporlama hattını; rol matrisi ise her görevin detaylı sorumluluklarını tanımlar.",
          "Bu doküman ISO 13485 madde 5.5 (sorumluluk, yetki ve iletişim) ve kalite el kitabı organizasyon bölümü ile uyumludur.",
        ]
          .filter(Boolean)
          .join("\n\n")
      : [
          `The quality management organization of ${companyName} is structured to meet medical device safety, patient safety and MDR/ISO 13485 regulatory conformity requirements.`,
          scope ? `QMS scope: ${scope}` : "",
          "The organization defines authority, responsibility and reporting between top management, the management representative, quality management and functional owners. Top management is the ultimate approval authority; day-to-day QMS coordination is led by the Quality Manager and Management Representative.",
          "Assigned owners for production, purchasing, regulatory affairs, complaint handling and internal audit execute their processes through documented procedures and records. The organization chart shows reporting lines; the role matrix defines detailed responsibilities.",
          "This documentation aligns with ISO 13485 clause 5.5 (responsibility, authority and communication) and the quality manual organization section.",
        ]
          .filter(Boolean)
          .join("\n\n");

  return {
    organizationStructureText: structure,
    organizationChartText: chart,
    organizationRolesMatrixText: matrix,
  };
}

function combineOrganizationMarkdown(
  parts: z.infer<typeof aiResultSchema>,
  locale: "tr" | "en",
): string {
  const hStructure = locale === "tr" ? "## Organizasyon Yapısı" : "## Organization Structure";
  const hChart = locale === "tr" ? "## Organizasyon Şeması" : "## Organization Chart";
  const hRoles = locale === "tr" ? "## Roller ve Sorumluluklar" : "## Roles and Responsibilities";
  return [
    hStructure,
    "",
    parts.organizationStructureText.trim(),
    "",
    hChart,
    "",
    "```",
    parts.organizationChartText.trim(),
    "```",
    "",
    hRoles,
    "",
    parts.organizationRolesMatrixText.trim(),
  ].join("\n");
}

export async function generateOrganizationFromRoles(params: {
  companyId: string;
  locale: "tr" | "en";
  answers: Record<string, unknown>;
}): Promise<{ patch: Record<string, unknown>; source: "ai" | "rules" }> {
  const locale = params.locale;
  const roles = collectOrganizationRoleInputs(params.answers, locale);
  if (roles.length < 2) {
    throw new Error(locale === "tr" ? "En az iki rol için ad/ünvan girin." : "Enter at least two role holders.");
  }

  const company = await prisma.company.findFirst({
    where: { id: params.companyId },
    select: { name: true, legalName: true },
  });
  const companyName =
    str(params.answers.companyLegalName) ||
    str(params.answers.tradeName) ||
    company?.legalName ||
    company?.name ||
    (locale === "tr" ? "Üretici" : "Manufacturer");
  const scope = str(params.answers.scopeStatement) || str(params.answers.qmsScope);

  let parts = ruleBasedOrganization(roles, locale, companyName, scope);
  let source: "ai" | "rules" = "rules";

  let provider: Awaited<ReturnType<typeof getMeteredAiProvider>> = null;
  try {
    provider = await getMeteredAiProvider({ companyId: params.companyId, feature: "qm-organization" });
  } catch (err) {
    if (err instanceof AiTokenLimitError) throw err;
  }
  if (provider) {
    const roleBlock = roles.map((r) => `- ${r.label}: ${r.holder}`).join("\n");
    const langName = locale === "tr" ? "Turkish" : "English";
    try {
      const raw = await provider.complete(
        [
          {
            role: "system",
            content: [
              REGULATORY_GUARDRAILS,
              "",
              "You draft ISO 13485 / ISO 9001 organization documentation for a medical device manufacturer.",
              `Write ALL text in ${langName}.`,
              "Respond ONLY with JSON:",
              '{"organizationStructureText": string, "organizationChartText": string, "organizationRolesMatrixText": string}',
              "",
              "organizationStructureText: 3-5 paragraphs — QMS organization purpose, reporting to top management, link to scope and ISO 13485 clause 5.5.",
              "organizationChartText: hierarchical ASCII tree (CEO/Genel Müdür at top, ├── branches, │ for sub-levels under Quality Manager). No markdown fences.",
              "organizationRolesMatrixText: NOT a table. For each role use ### Role title then numbered list (5-6 items) of detailed responsibility sentences covering all tasks for that role. No assignee names — only duties.",
              "Do not invent people not listed. Use generic responsibilities appropriate for medical device QMS.",
            ].join("\n"),
          },
          {
            role: "user",
            content: [
              `Company: ${companyName}`,
              scope ? `QMS scope: ${scope}` : "",
              "",
              "Assigned roles (use exactly these names):",
              roleBlock,
            ].join("\n"),
          },
        ],
        { json: true },
      );
      const parsed = aiResultSchema.safeParse(extractJson(raw));
      if (parsed.success && parsed.data.organizationStructureText.trim().length > 80) {
        parts = parsed.data;
        source = "ai";
      }
    } catch (err) {
      console.error("[organization-ai-generate] AI failed, using rules", err);
    }
  }

  const combined = combineOrganizationMarkdown(parts, locale);
  const patch: Record<string, unknown> = {
    organizationStructureText: parts.organizationStructureText.trim(),
    organizationChartText: parts.organizationChartText.trim(),
    organizationRolesMatrixText: parts.organizationRolesMatrixText.trim(),
    organizationDocumentMarkdown: combined,
    organizationGeneratedByAi: true,
    organizationGeneratedAt: new Date().toISOString(),
    organizationRolesUploadedFileId: null,
    organizationRolesFileName: null,
  };
  for (const r of roles) {
    patch[r.key] = r.holder;
  }
  return { patch, source };
}
