import "server-only";
import { DISCLAIMER } from "@/lib/domain/constants";
import {
  POST_MARKET_REGULATORY_REFS,
  postMarketOutlineFor,
  type PostMarketSectionKey,
} from "@/lib/domain/post-market-mdcg-outlines";
import {
  parseClinicalGapMatrix,
  type ClinicalGapMatrix,
} from "@/lib/domain/clinical-gap-matrix";

const L = (locale: string, en: string, tr: string) => (locale === "tr" ? tr : en);
const tbc = (locale: string) => L(locale, "[TO BE CONFIRMED]", "[TEYİT EDİLECEK]");

function isHighClass(deviceClass: string): boolean {
  return ["CLASS_IIA", "CLASS_IIB", "CLASS_III"].includes(deviceClass);
}

function psurFrequency(deviceClass: string, locale: string): string {
  switch (deviceClass) {
    case "CLASS_III":
    case "CLASS_IIB":
      return L(locale, "PSUR at least annually (MDR Art. 86(1))", "PSUR en az yıllık (MDR Md. 86(1))");
    case "CLASS_IIA":
      return L(
        locale,
        "PSUR at least every 2 years (MDR Art. 86(1)); confirm NB agreement",
        "PSUR en az 2 yılda bir (MDR Md. 86(1)); OK mutabakatı teyit edilecek",
      );
    default:
      return L(
        locale,
        "PMS report (not PSUR) per MDR Art. 85 for Class I",
        "Sınıf I için MDR Md. 85 kapsamında PMS raporu (PSUR değil)",
      );
  }
}

function reportTypeLabel(deviceClass: string, locale: string): string {
  return isHighClass(deviceClass)
    ? L(locale, "Periodic Safety Update Report (PSUR)", "Periyodik Güvenlik Güncelleme Raporu (PSUR)")
    : L(locale, "Post-market surveillance report (PMS report)", "Pazar sonrası gözetim raporu (PMS raporu)");
}

export interface PostMarketProductContext {
  name: string;
  brand?: string | null;
  model?: string | null;
  deviceClass: string;
  basicUdiDi?: string | null;
  udiDi?: string | null;
  intendedPurpose?: string | null;
  userProfile?: string | null;
  patientPopulation?: string | null;
  isSterile?: boolean;
  company?: {
    name?: string;
    legalName?: string | null;
    srnNumber?: string | null;
    notifiedBody?: string | null;
    notifiedBodyNumber?: string | null;
  } | null;
}

function deviceIdBlock(p: PostMarketProductContext, locale: string): string {
  return [
    `${L(locale, "Device name", "Cihaz adı")}: ${p.name}`,
    p.brand ? `${L(locale, "Brand", "Marka")}: ${p.brand}` : "",
    p.model ? `${L(locale, "Model/reference", "Model/referans")}: ${p.model}` : "",
    p.basicUdiDi ? `Basic UDI-DI: ${p.basicUdiDi}` : "",
    p.udiDi ? `UDI-DI: ${p.udiDi}` : "",
    p.intendedPurpose
      ? `${L(locale, "Intended purpose", "Kullanım amacı")}: ${p.intendedPurpose}`
      : "",
    p.userProfile ? `${L(locale, "Intended user", "Hedef kullanıcı")}: ${p.userProfile}` : "",
    p.patientPopulation
      ? `${L(locale, "Patient population", "Hasta popülasyonu")}: ${p.patientPopulation}`
      : "",
    p.company?.name
      ? `${L(locale, "Manufacturer", "Üretici")}: ${p.company.name}`
      : "",
    p.company?.srnNumber ? `SRN: ${p.company.srnNumber}` : "",
  ]
    .filter(Boolean)
    .map((l) => `- ${l}`)
    .join("\n");
}

function gapMatrixPmcfObjectives(matrix: ClinicalGapMatrix | null, locale: string): string {
  if (!matrix?.rows.length) {
    return `- ${tbc(locale)}`;
  }
  const tr = locale === "tr";
  const lines: string[] = [];
  for (const r of matrix.rows) {
    const pmcf = tr ? r.pmcfActionTr : r.pmcfActionEn;
    const gap = tr ? r.gapTr : r.gapEn;
    if (!pmcf || pmcf === "—") continue;
    const claim = tr ? r.claimTr : r.claimEn;
    lines.push(`- **${claim}**: ${gap !== "—" ? gap + " → " : ""}${pmcf}`);
  }
  return lines.length ? lines.join("\n") : `- ${tbc(locale)}`;
}

/** MDCG 2020-7 aligned draft questionnaire for PMCF user feedback. */
export function buildPmcfSurveyTemplate(p: PostMarketProductContext, locale: string): string {
  const tr = locale === "tr";
  const intro = tr
    ? `Aşağıdaki soru formu, MDCG 2020-7 kapsamında PMCF anket yöntemi için taslaktır. Hedef kullanıcı: ${p.userProfile ?? tbc(locale)}.`
    : `The questionnaire below is a draft PMCF survey method per MDCG 2020-7. Target user: ${p.userProfile ?? tbc(locale)}.`;

  const questions = tr
    ? [
        "1. Cihazı hangi sıklıkla kullanıyorsunuz? (günlük / haftalık / aylık / diğer)",
        "2. Son 12 ayda cihazla ilgili beklenmeyen performans veya güvenlik sorunu yaşadınız mı? (evet/hayır — açıklayın)",
        "3. Kullanım talimatları (KT) anlaşılır ve uygulanabilir miydi? (1–5 Likert + yorum)",
        "4. Cihazın klinik performansı beklentilerinizi karşıladı mı? (1–5 Likert + yorum)",
        "5. Steril ambalaj / açılış / kullanım adımlarında sorun gözlemlediniz mi? (evet/hayır — açıklayın)",
        "6. Alternatif cihazlara kıyasla avantaj/dezavantajlar nelerdir? (açık uçlu)",
        "7. Ciddi olay veya yakın kaçınma (near-miss) bildirdiniz mi / bildirmeyi düşündünüz mü? (evet/hayır)",
        "8. Ek eğitim veya KT güncellemesi gerekir mi? (evet/hayır — öneri)",
      ]
    : [
        "1. How often do you use the device? (daily / weekly / monthly / other)",
        "2. In the last 12 months, did you experience unexpected performance or safety issues? (yes/no — describe)",
        "3. Were the instructions for use clear and applicable? (1–5 Likert + comment)",
        "4. Did clinical performance meet your expectations? (1–5 Likert + comment)",
        "5. Any issues with sterile packaging / opening / use steps? (yes/no — describe)",
        "6. Advantages/disadvantages vs. alternative devices? (open text)",
        "7. Did you report or consider reporting a serious incident or near-miss? (yes/no)",
        "8. Is additional training or IFU update needed? (yes/no — suggestion)",
      ];

  return [intro, "", ...questions.map((q) => `- ${q}`)].join("\n");
}

function sectionBody(
  key: PostMarketSectionKey,
  heading: string,
  p: PostMarketProductContext,
  locale: string,
  gapMatrix: ClinicalGapMatrix | null,
): string {
  const tr = locale === "tr";

  if (/identification|kimliği/i.test(heading)) {
    return deviceIdBlock(p, locale);
  }

  if (key === "pms-plan") {
    if (/overview|genel bakış/i.test(heading)) {
      return [
        `- ${L(locale, "Proactive and systematic PMS per MDR Art. 83–84", "MDR Md. 83–84 kapsamında proaktif ve sistematik PMS")}`,
        `- ${L(locale, "PMS owner / responsible person", "PMS sorumlusu")}: ${tbc(locale)}`,
        `- ${L(locale, "Review frequency", "Gözden geçirme sıklığı")}: ${L(locale, "at least annually", "en az yıllık")}`,
      ].join("\n");
    }
    if (/data to be collected|toplanacak veriler/i.test(heading)) {
      return [
        `- ${L(locale, "Customer feedback and user experience", "Müşteri geri bildirimi ve kullanıcı deneyimi")}`,
        `- ${L(locale, "Complaints and non-conformities", "Şikâyetler ve uygunsuzluklar")}`,
        `- ${L(locale, "Vigilance / serious incidents (EUDAMED where applicable)", "Vijilans / ciddi olaylar (uygulanabilir ise EUDAMED)")}`,
        `- ${L(locale, "Literature and state of the art monitoring", "Literatür ve güncel teknik durum izleme")}`,
        `- ${L(locale, "Trend data per MDR Art. 88", "MDR Md. 88 kapsamında trend verileri")}`,
        `- ${L(locale, "PMCF outputs", "PMCF çıktıları")}`,
      ].join("\n");
    }
    if (/collection methods|toplama yöntemleri/i.test(heading)) {
      return [
        `- ${L(locale, "Complaint handling procedure", "Şikâyet yönetimi prosedürü")}: ${tbc(locale)}`,
        `- ${L(locale, "Feedback channels (sales, clinical users, distributors)", "Geri bildirim kanalları (satış, klinik kullanıcılar, distribütörler)")}`,
        `- ${L(locale, "Vigilance reporting workflow", "Vijilans bildirim iş akışı")}: ${tbc(locale)}`,
        `- ${L(locale, "Periodic literature search (aligned with CER)", "Periyodik literatür taraması (CER ile uyumlu)")}`,
      ].join("\n");
    }
    if (/analysis|analiz/i.test(heading)) {
      return [
        `- ${L(locale, "Quantitative complaint rates vs. sales volume", "Satış hacmine göre nicel şikâyet oranları")}`,
        `- ${L(locale, "Severity categorisation and root-cause analysis", "Şiddet sınıflandırması ve kök neden analizi")}`,
        `- ${L(locale, "Comparison with risk management file and benefit-risk", "Risk yönetim dosyası ve yarar-risk ile karşılaştırma")}`,
      ].join("\n");
    }
    if (/indicators|göstergeler/i.test(heading)) {
      return [
        `- ${L(locale, "Complaint rate threshold", "Şikâyet oranı eşiği")}: ${tbc(locale)}`,
        `- ${L(locale, "Serious incident trigger", "Ciddi olay tetikleyicisi")}: ${L(locale, "any confirmed serious incident", "doğrulanmış her ciddi olay")}`,
        `- ${L(locale, "Trend signal criteria per Art. 88", "Md. 88 trend sinyal kriterleri")}: ${tbc(locale)}`,
      ].join("\n");
    }
    if (/risk management|capa/i.test(heading)) {
      return `- ${L(locale, "PMS findings feed ISO 14971 risk review and ISO 13485 CAPA; reference procedure", "PMS bulguları ISO 14971 risk gözden geçirmesi ve ISO 13485 CAPA'ya beslenir; prosedür referansı")}: ${tbc(locale)}`;
    }
    if (/clinical evaluation|klinik değerlendirme/i.test(heading)) {
      return [
        `- ${L(locale, "PMS data inputs to CER update (MDCG 2020-6)", "PMS verileri CER güncellemesine girdi (MDCG 2020-6)")}`,
        `- ${L(locale, "PMCF plan cross-reference", "PMCF planı çapraz referans")}: ${tbc(locale)}`,
        `- ${L(locale, "Clinical gap matrix reviewed", "Klinik boşluk matrisi gözden geçirildi")}: ${gapMatrix?.rows.length ? L(locale, "yes — see PMCF plan", "evet — PMCF planına bakınız") : tbc(locale)}`,
      ].join("\n");
    }
    if (/frequency|sıklığı/i.test(heading)) {
      return [
        `- ${L(locale, "Report type", "Rapor türü")}: ${reportTypeLabel(p.deviceClass, locale)}`,
        `- ${L(locale, "Frequency", "Sıklık")}: ${psurFrequency(p.deviceClass, locale)}`,
        `- ${L(locale, "Distribution (NB, EUDAMED if applicable)", "Dağıtım (OK, uygulanabilir ise EUDAMED)")}: ${tbc(locale)}`,
      ].join("\n");
    }
  }

  if (key === "pmcf-plan") {
    if (/clinical evaluation|cer belirsizlik/i.test(heading)) {
      return [
        `- ${L(locale, "CER reference and version", "CER referansı ve sürümü")}: ${tbc(locale)}`,
        `- ${L(locale, "Residual clinical uncertainties from CER", "CER'den kalan klinik belirsizlikler")}: ${tbc(locale)}`,
        gapMatrix?.rows.length
          ? `- ${L(locale, "Gap matrix date", "Boşluk matrisi tarihi")}: ${gapMatrix.generatedAt.slice(0, 10)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
    if (/objectives|amaçları/i.test(heading)) {
      return gapMatrixPmcfObjectives(gapMatrix, locale);
    }
    if (/questionnaire|anket/i.test(heading)) {
      return buildPmcfSurveyTemplate(p, locale);
    }
    if (/literature|literatür/i.test(heading)) {
      return [
        `- ${L(locale, "Periodic PubMed search aligned with CER PICO", "CER PICO ile uyumlu periyodik PubMed taraması")}`,
        `- ${L(locale, "Frequency", "Sıklık")}: ${L(locale, "at least annually", "en az yıllık")}`,
        `- ${L(locale, "Output: PMCF evaluation report section (MDCG 2020-8)", "Çıktı: PMCF değerlendirme raporu bölümü (MDCG 2020-8)")}`,
      ].join("\n");
    }
    if (/clinical investigation|klinik araştırma/i.test(heading)) {
      return `- ${L(locale, "Not planned unless gap matrix or NB requires; justify if waived", "Boşluk matrisi veya OK gerektirmedikçe planlanmaz; feragat gerekçelendirilir")}: ${tbc(locale)}`;
    }
    if (/retrospective|geriye dönük/i.test(heading)) {
      return `- ${L(locale, "Review of complaint / vigilance / registry data where available", "Mevcut şikâyet / vijilans / kayıt verilerinin incelenmesi")}: ${tbc(locale)}`;
    }
    if (/justification|gerekçe/i.test(heading)) {
      return `- ${L(locale, "Methods proportionate to device class and residual risks (Annex XIV B)", "Yöntemler cihaz sınıfı ve artık risklere orantılı (Ek XIV B)")}: ${tbc(locale)}`;
    }
    if (/statistical|istatistik/i.test(heading)) {
      return `- ${L(locale, "Survey sample size and acceptance criteria", "Anket örneklem büyüklüğü ve kabul kriterleri")}: ${tbc(locale)}`;
    }
    if (/milestones|kilometre/i.test(heading)) {
      return [
        `- ${L(locale, "PMCF plan approval", "PMCF plan onayı")}: ${tbc(locale)}`,
        `- ${L(locale, "First survey wave", "İlk anket dalgası")}: ${tbc(locale)}`,
        `- ${L(locale, "PMCF evaluation report (MDCG 2020-8)", "PMCF değerlendirme raporu (MDCG 2020-8)")}: ${tbc(locale)}`,
      ].join("\n");
    }
    if (/evaluation report|değerlendirme raporu/i.test(heading)) {
      return `- ${L(locale, "PMCF results documented per MDCG 2020-8; triggers CER update when needed", "PMCF sonuçları MDCG 2020-8'e göre belgelenir; gerektiğinde CER güncellemesi tetiklenir")}`;
    }
    if (/general pmcf|genel pmcf/i.test(heading)) {
      return [
        `- ${L(locale, "Routine PMS data review", "Rutin PMS veri gözden geçirmesi")}`,
        `- ${L(locale, "User feedback questionnaire", "Kullanıcı geri bildirim anketi")}`,
        `- ${L(locale, "Literature monitoring", "Literatür izleme")}`,
      ].join("\n");
    }
  }

  if (key === "pmcf-report") {
    if (/identification|kimliği/i.test(heading)) {
      return deviceIdBlock(p, locale);
    }
    if (/reference to pmcf|pmcf planına/i.test(heading)) {
      return [
        `- ${L(locale, "PMCF plan document reference and version", "PMCF planı belge referansı ve sürümü")}: ${tbc(locale)}`,
        `- ${L(locale, "PMCF plan approval date", "PMCF plan onay tarihi")}: ${tbc(locale)}`,
        `- ${L(locale, "Cross-reference to PMCF plan section keys (objectives, methods)", "PMCF planı bölümlerine çapraz referans (amaçlar, yöntemler)")}: ${tbc(locale)}`,
      ].join("\n");
    }
    if (/reporting period|raporlama dönemi/i.test(heading)) {
      return [
        `- ${L(locale, "Reporting period covered", "Kapsanan raporlama dönemi")}: ${tbc(locale)}`,
        `- ${L(locale, "PMCF activities completed vs. planned", "Tamamlanan / planlanan PMCF faaliyetleri")}: ${tbc(locale)}`,
        `- ${L(locale, "Deviations from PMCF plan and justification", "PMCF planından sapmalar ve gerekçesi")}: ${L(locale, "none identified", "belirlenmedi")}`,
      ].join("\n");
    }
    if (/clinical investigation|klinik araştırma/i.test(heading)) {
      return `- ${L(locale, "Not applicable / not conducted — or summarise investigation results", "Uygulanamaz / yürütülmedi — veya araştırma sonuçlarını özetleyin")}: ${tbc(locale)}`;
    }
    if (/questionnaire|anket/i.test(heading)) {
      return [
        `- ${L(locale, "Survey method and target population", "Anket yöntemi ve hedef popülasyon")}: ${p.userProfile ?? tbc(locale)}`,
        `- ${L(locale, "Response rate (n/N)", "Yanıt oranı (n/N)")}: ${tbc(locale)}`,
        `- ${L(locale, "Key findings vs. acceptance criteria", "Kabul kriterlerine göre temel bulgular")}: ${tbc(locale)}`,
        `- ${L(locale, "Link to raw survey data / records", "Ham anket verisi / kayıtlarına bağlantı")}: ${tbc(locale)}`,
      ].join("\n");
    }
    if (/retrospective|geriye dönük/i.test(heading)) {
      return `- ${L(locale, "Complaint / vigilance / registry data reviewed", "İncelenen şikâyet / vijilans / kayıt verileri")}: ${tbc(locale)}`;
    }
    if (/literature|literatür/i.test(heading)) {
      return [
        `- ${L(locale, "Search date and databases", "Arama tarihi ve veri tabanları")}: ${tbc(locale)}`,
        `- ${L(locale, "New relevant publications vs. previous CER", "Önceki CER'e göre yeni ilgili yayınlar")}: ${tbc(locale)}`,
        `- ${L(locale, "Impact on clinical performance or safety", "Klinik performans veya güvenlik üzerindeki etki")}: ${tbc(locale)}`,
      ].join("\n");
    }
    if (/other pmcf|diğer pmcf/i.test(heading)) {
      return `- ${tbc(locale)}`;
    }
    if (/evaluation and analysis|değerlendirilmesi ve analizi/i.test(heading)) {
      return [
        `- ${L(locale, "Integrated analysis across PMCF data sources", "PMCF veri kaynakları arası bütünleşik analiz")}: ${tbc(locale)}`,
        `- ${L(locale, "Comparison with PMCF plan acceptance criteria", "PMCF plan kabul kriterleriyle karşılaştırma")}: ${tbc(locale)}`,
        gapMatrixPmcfObjectives(gapMatrix, locale) !== `- ${tbc(locale)}`
          ? `- ${L(locale, "Gap matrix PMCF actions — status", "Boşluk matrisi PMCF aksiyonları — durum")}:\n${gapMatrixPmcfObjectives(gapMatrix, locale)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
    if (/conclusions on safety|güvenlik ve klinik/i.test(heading)) {
      return `- ${L(locale, "Overall conclusion on safety and clinical performance in real-world use", "Gerçek kullanımda güvenlik ve klinik performans genel sonucu")}: ${tbc(locale)}`;
    }
    if (/benefit-risk|yarar-risk/i.test(heading)) {
      return [
        `- ${L(locale, "Impact on benefit-risk profile vs. current CER", "Güncel CER'e göre yarar-risk profiline etki")}: ${tbc(locale)}`,
        `- ${L(locale, "CER update required?", "CER güncellemesi gerekli mi?")}: ${tbc(locale)}`,
        `- ${L(locale, "Reference to clinical evaluation report version", "Klinik değerlendirme raporu sürüm referansı")}: ${tbc(locale)}`,
      ].join("\n");
    }
    if (/actions taken|alınan aksiyon/i.test(heading)) {
      return `- ${L(locale, "CAPA, IFU update, design change, training — or none", "CAPA, KT güncellemesi, tasarım değişikliği, eğitim — veya yok")}: ${tbc(locale)}`;
    }
    if (/pmcf plan update|pmcf planı güncelleme/i.test(heading)) {
      return `- ${L(locale, "PMCF plan revision needed? Triggers and proposed changes", "PMCF plan revizyonu gerekli mi? Tetikleyiciler ve önerilen değişiklikler")}: ${tbc(locale)}`;
    }
  }

  if (key === "psur-report") {
    if (/administrative|idari/i.test(heading)) {
      return [
        deviceIdBlock(p, locale),
        `- ${L(locale, "Reporting period", "Raporlama dönemi")}: ${tbc(locale)}`,
        `- ${L(locale, "Report type", "Rapor türü")}: ${reportTypeLabel(p.deviceClass, locale)}`,
        p.company?.notifiedBody
          ? `- ${L(locale, "Notified Body", "Onaylanmış Kuruluş")}: ${p.company.notifiedBody}${p.company.notifiedBodyNumber ? ` (${p.company.notifiedBodyNumber})` : ""}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
    if (/executive|yönetici/i.test(heading)) {
      return `- ${L(locale, "High-level summary of PMS findings and benefit-risk conclusion for the period", "Dönem PMS bulguları ve yarar-risk sonucunun üst düzey özeti")}: ${tbc(locale)}`;
    }
    if (/sales|satış/i.test(heading)) {
      return [
        `- ${L(locale, "Units placed on the market / distributed", "Pazara sunulan / dağıtılan adet")}: ${tbc(locale)}`,
        `- ${L(locale, "Geographic distribution", "Coğrafi dağılım")}: ${tbc(locale)}`,
        `- ${L(locale, "Estimated patient exposure", "Tahmini hasta maruziyeti")}: ${tbc(locale)}`,
      ].join("\n");
    }
    if (/serious incident|ciddi olay/i.test(heading)) {
      return `- ${L(locale, "Summary per MDCG 2022-21 Section D; FSCA list", "MDCG 2022-21 Bölüm D özeti; FSCA listesi")}: ${tbc(locale)}`;
    }
    if (/complaint|şikâyet/i.test(heading)) {
      return `- ${L(locale, "Complaint statistics, categories, investigation outcomes", "Şikâyet istatistikleri, kategoriler, inceleme sonuçları")}: ${tbc(locale)}`;
    }
    if (/trend/i.test(heading)) {
      return `- ${L(locale, "Art. 88 trend reporting status and NB notifications", "Md. 88 trend raporlama durumu ve OK bildirimleri")}: ${tbc(locale)}`;
    }
    if (/literature|literatür/i.test(heading)) {
      return `- ${L(locale, "Literature search results relevant to safety/performance", "Güvenlik/performansla ilgili literatür tarama sonuçları")}: ${tbc(locale)}`;
    }
    if (/pmcf activities|pmcf faaliyet/i.test(heading)) {
      return [
        `- ${L(locale, "PMCF methods executed in period", "Dönemde yürütülen PMCF yöntemleri")}: ${tbc(locale)}`,
        `- ${L(locale, "Survey response rate and key findings", "Anket yanıt oranı ve temel bulgular")}: ${tbc(locale)}`,
        `- ${L(locale, "Reference PMCF evaluation report (MDCG 2020-8)", "PMCF değerlendirme raporu referansı (MDCG 2020-8)")}: ${tbc(locale)}`,
      ].join("\n");
    }
    if (/pms data analysis|pms veri/i.test(heading)) {
      return `- ${L(locale, "Integrated analysis of all PMS data sources", "Tüm PMS veri kaynaklarının bütünleşik analizi")}: ${tbc(locale)}`;
    }
    if (/benefit-risk|yarar-risk/i.test(heading)) {
      return `- ${L(locale, "Update to benefit-risk determination vs. previous CER/PSUR", "Önceki CER/PSUR'a göre yarar-risk belirlemesi güncellemesi")}: ${tbc(locale)}`;
    }
    if (/actions taken|alınan aksiyon/i.test(heading)) {
      return `- ${L(locale, "CAPA, design change, IFU update, FSCA summary", "CAPA, tasarım değişikliği, KT güncellemesi, FSCA özeti")}: ${tbc(locale)}`;
    }
    if (/conclusions|sonuçlar/i.test(heading)) {
      return [
        `- ${L(locale, "Overall conclusion on safety and performance", "Güvenlik ve performans genel sonucu")}: ${tbc(locale)}`,
        `- ${L(locale, "CER update required?", "CER güncellemesi gerekli mi?")}: ${tbc(locale)}`,
        `- ${L(locale, "Next PSUR due", "Sonraki PSUR tarihi")}: ${tbc(locale)}`,
      ].join("\n");
    }
  }

  return `- ${tbc(locale)}`;
}

export function buildPostMarketSectionMarkdown(
  key: PostMarketSectionKey,
  title: string,
  p: PostMarketProductContext,
  locale: string,
  gapMatrixJson?: unknown,
): string {
  const refs = POST_MARKET_REGULATORY_REFS[key];
  const annexRef = locale === "tr" ? refs.tr : refs.en;
  const gapMatrix = parseClinicalGapMatrix(gapMatrixJson ?? null);
  const outline = postMarketOutlineFor(key, locale);

  const intro = L(
    locale,
    `This document ("${title}") is structured per ${annexRef}. It is a draft for qualified person review.`,
    `Bu belge ("${title}") ${annexRef} yapısına göre düzenlenmiştir. Nitelikli kişi incelemesi için taslaktır.`,
  );

  const bodyBlocks = outline.map((h) => `## ${h}\n\n${sectionBody(key, h, p, locale, gapMatrix)}`);

  const guidanceNote =
    key === "pmcf-plan"
      ? L(
          locale,
          "*Survey questions in the questionnaire section should be validated with clinical users before field use (MDCG 2020-7).*",
          "*Anket bölümündeki sorular saha kullanımından önce klinik kullanıcılarla doğrulanmalıdır (MDCG 2020-7).*",
        )
      : key === "pmcf-report"
        ? L(
            locale,
            "*Document actual PMCF results for the reporting period; reference the approved PMCF plan (MDCG 2020-8).*",
            "*Raporlama dönemine ait gerçek PMCF sonuçlarını belgeleyin; onaylı PMCF planına referans verin (MDCG 2020-8).*",
          )
        : key === "psur-report"
        ? L(
            locale,
            "*Populate with actual PMS data for the reporting period; empty tables are not acceptable for NB submission (MDCG 2022-21).*",
            "*Raporlama dönemine ait gerçek PMS verileri ile doldurulmalıdır; boş tablolar OK sunumu için kabul edilemez (MDCG 2022-21).*",
          )
        : "";

  return [
    `# ${title}`,
    "",
    `*${annexRef}*`,
    "",
    intro,
    "",
    bodyBlocks.join("\n\n"),
    guidanceNote ? ["", guidanceNote].join("\n") : "",
    "",
    "---",
    "",
    `*${DISCLAIMER}*`,
  ]
    .filter(Boolean)
    .join("\n");
}
