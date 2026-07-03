import "server-only";
import { prisma } from "@/lib/db";
import { bulkGenerateQmsDocuments } from "@/lib/qms/bulk-generate";
import { generateProcedureChild } from "@/lib/qms/procedure-document-service";
import type { QmsDocumentLayer } from "@/lib/qms/kys-structure";

export interface OperationalSampleRecord {
  code: string;
  titleTr: string;
  titleEn: string;
  parentProcedureCode: string;
  clauseRefs: string;
  buildContent: (companyName: string, locale: "tr" | "en") => string;
}

export const OPERATIONAL_SAMPLE_RECORDS: OperationalSampleRecord[] = [
  {
    code: "REC-HR-01",
    titleTr: "Örnek Eğitim Kaydı",
    titleEn: "Sample Training Record",
    parentProcedureCode: "SOP-HR",
    clauseRefs: "6.2",
    buildContent: (company, locale) =>
      locale === "tr"
        ? `## Eğitim Kaydı — Örnek (${company})

| Alan | Değer |
|------|-------|
| Kayıt no | TRN-2026-001 |
| Tarih | 15.03.2026 |
| Konu | ISO 13485:2016 KYS farkındalık ve prosedür güncellemeleri |
| Katılımcılar | Üretim ve kalite personeli (12 kişi) |
| Eğitmen | Kalite Müdürü |
| Süre | 4 saat |
| Yöntem | Yüz yüze sunum + SOP-DC ve SOP-CH özeti |
| Değerlendirme | Kısa quiz — geçme oranı %100 |

**Amaç:** Doküman kontrolü, şikâyet ve CAPA akışı farkındalığının artırılması.

**Sonuç:** Eğitim tamamlandı; bireysel imza listesi HR dosyasında saklanır.

**Onay:** Kalite Müdürü — 15.03.2026`
        : `## Training Record — Sample (${company})

| Field | Value |
|-------|-------|
| Record no | TRN-2026-001 |
| Date | 15 Mar 2026 |
| Topic | ISO 13485:2016 QMS awareness and procedure updates |
| Participants | Production and quality staff (12) |
| Trainer | Quality Manager |
| Duration | 4 hours |
| Method | Face-to-face + SOP-DC and SOP-CH overview |
| Assessment | Short quiz — 100% pass rate |

**Purpose:** Raise awareness of document control, complaint and CAPA flows.

**Outcome:** Training completed; individual sign-off sheet filed in HR records.

**Approval:** Quality Manager — 15 Mar 2026`,
  },
  {
    code: "REC-IA-01",
    titleTr: "Örnek İç Tetkik Raporu",
    titleEn: "Sample Internal Audit Report",
    parentProcedureCode: "SOP-IA",
    clauseRefs: "8.2.4",
    buildContent: (company, locale) =>
      locale === "tr"
        ? `## İç Tetkik Raporu — Örnek (${company})

| Alan | Değer |
|------|-------|
| Rapor no | IA-2026-001 |
| Tarih | 20.03.2026 |
| Tetkik kapsamı | Madde 7.5 üretim kontrolü, 8.2.2 şikâyet işleme |
| Tetkikçiler | Kalite Müdürü (baş tetkikçi), Üretim Sorumlusu |
| Tetkik edilen | Üretim hattı, şikâyet kayıtları |
| Referans plan | PLAN-IA-01 |

**Bulgular:**
1. **Minör — IA-F-001:** Bir üretim talimatı revizyon tarihi güncellenmemiş (SOP-PC / WI alt doküman).
2. **Gözlem:** Şikâyet kayıtları FORM-CH-01 ile uyumlu; CAPA bağlantısı mevcut.

**Sonuç:** KYS genel olarak uygulanıyor; minör bulgu için düzeltici aksiyon CAPA-2026-003 açıldı.

**Dağıtım:** Genel Müdür, Kalite Müdürü — 22.03.2026`
        : `## Internal Audit Report — Sample (${company})

| Field | Value |
|-------|-------|
| Report no | IA-2026-001 |
| Date | 20 Mar 2026 |
| Scope | Clause 7.5 production control, 8.2.2 complaint handling |
| Auditors | Quality Manager (lead), Production Manager |
| Areas audited | Production line, complaint records |
| Plan ref | PLAN-IA-01 |

**Findings:**
1. **Minor — IA-F-001:** One work instruction revision date not updated (SOP-PC / WI child doc).
2. **Observation:** Complaint records align with FORM-CH-01; CAPA linkage present.

**Conclusion:** QMS generally implemented; minor finding opened CAPA-2026-003.

**Distribution:** General Manager, Quality Manager — 22 Mar 2026`,
  },
  {
    code: "REC-MR-01",
    titleTr: "Örnek Yönetim Gözden Geçirme Tutanağı",
    titleEn: "Sample Management Review Minutes",
    parentProcedureCode: "SOP-MR",
    clauseRefs: "5.6",
    buildContent: (company, locale) =>
      locale === "tr"
        ? `## Yönetim Gözden Geçirme Tutanağı — Örnek (${company})

| Alan | Değer |
|------|-------|
| Toplantı no | MR-2026-Q1 |
| Tarih | 28.03.2026 |
| Katılımcılar | Genel Müdür, Kalite Müdürü, Üretim Sorumlusu, Yönetim Temsilcisi |
| Referans form | FORM-MR-01, PLAN-MR-01 |

**Gözden geçirilen girdiler:** İç tetkik sonuçları (REC-IA-01), müşteri geri bildirimi, CAPA durumu, kalite hedefleri.

**Kararlar:**
1. KYS doküman revizyonları tamamlanacak (LIST-DC-01 güncel tutulacak).
2. Üretim talimatı revizyon tarihi düzeltmesi — CAPA-2026-003 ile takip.
3. 2026 Q2 iç tetkik planı onaylandı.

**Onay:** Genel Müdür — 28.03.2026`
        : `## Management Review Minutes — Sample (${company})

| Field | Value |
|-------|-------|
| Meeting no | MR-2026-Q1 |
| Date | 28 Mar 2026 |
| Attendees | General Manager, Quality Manager, Production Manager, Management Rep |
| Forms | FORM-MR-01, PLAN-MR-01 |

**Inputs reviewed:** Internal audit (REC-IA-01), customer feedback, CAPA status, quality objectives.

**Decisions:**
1. Complete QMS document revisions; keep LIST-DC-01 current.
2. WI revision date fix tracked via CAPA-2026-003.
3. Q2 2026 internal audit plan approved.

**Approval:** General Manager — 28 Mar 2026`,
  },
  {
    code: "REC-CH-01",
    titleTr: "Örnek Şikâyet Kaydı",
    titleEn: "Sample Complaint Record",
    parentProcedureCode: "SOP-CH",
    clauseRefs: "8.2.2",
    buildContent: (company, locale) =>
      locale === "tr"
        ? `## Şikâyet Kaydı — Örnek (${company}) — CAPA gerekmedi

| Alan | Değer |
|------|-------|
| Şikâyet no | CH-2026-011 |
| Alım tarihi | 08.03.2026 |
| Kaynak | Müşteri telefon |
| Ürün / lot | Steril set ST-100 / L20260228 |
| Açıklama | Kullanım talimatı okunmamış |
| CAPA gerekli | Hayır |
| Müşteri yanıtı | 09.03.2026 |
| Durum | Kapatıldı |

**Referans form:** FORM-CH-01`
        : `## Complaint Record — Sample (${company}) — no CAPA

| Field | Value |
|-------|-------|
| Complaint no | CH-2026-011 |
| Received | 8 Mar 2026 |
| Source | Customer phone |
| Product / lot | Sterile set ST-100 / L20260228 |
| Description | IFU not read |
| CAPA needed | No |
| Customer response | 9 Mar 2026 |
| Status | Closed |

**Form ref:** FORM-CH-01`,
  },
  {
    code: "REC-CH-02",
    titleTr: "Örnek Şikâyet–CAPA Bağlantı Kaydı",
    titleEn: "Sample Complaint–CAPA Linkage Record",
    parentProcedureCode: "SOP-CH",
    clauseRefs: "8.2.2 / 8.5.2",
    buildContent: (company, locale) =>
      locale === "tr"
        ? `## Şikâyet–CAPA Bağlantı Kaydı — Örnek (${company})

| Alan | Değer |
|------|-------|
| Şikâyet no | CH-2026-012 |
| CAPA no | CAPA-2026-002 |
| CAPA durumu | Açık — paketleme WI revizyonu |
| Şikâyet durumu | İzlemede |

**Referans:** FORM-CH-01 + FORM-CH-02 + FORM-CAPA-01`
        : `## Complaint–CAPA Linkage Record — Sample (${company})

| Field | Value |
|-------|-------|
| Complaint no | CH-2026-012 |
| CAPA no | CAPA-2026-002 |
| CAPA status | Open — packaging WI revision |
| Complaint status | Monitoring |

**Refs:** FORM-CH-01 + FORM-CH-02 + FORM-CAPA-01`,
  },
  {
    code: "REC-CAPA-01",
    titleTr: "Örnek CAPA Kaydı",
    titleEn: "Sample CAPA Record",
    parentProcedureCode: "SOP-CAPA",
    clauseRefs: "8.5.2",
    buildContent: (company, locale) =>
      locale === "tr"
        ? `## CAPA Kaydı — Örnek (${company})

| Alan | Değer |
|------|-------|
| CAPA no | CAPA-2026-003 |
| Açılış tarihi | 22.03.2026 |
| Kaynak | İç tetkik bulgusu IA-F-001 (REC-IA-01) |
| Problem | Üretim talimatı revizyon tarihi güncellenmemiş |
| Kök neden | Doküman revizyon bildirimi süreci atlandı |
| Düzeltici faaliyet | WI revizyonu ve eğitim (TRN-2026-001) |
| Sorumlu | Üretim Sorumlusu |
| Hedef tarih | 15.04.2026 |
| Etkinlik doğrulama | 30.04.2026 — revizyon tarihleri kontrol listesi |
| Durum | Açık — izlemede |

**Referans form:** FORM-CAPA-01`
        : `## CAPA Record — Sample (${company})

| Field | Value |
|-------|-------|
| CAPA no | CAPA-2026-003 |
| Opened | 22 Mar 2026 |
| Source | Internal audit finding IA-F-001 (REC-IA-01) |
| Problem | Work instruction revision date not updated |
| Root cause | Document revision notification step skipped |
| Corrective action | WI revision and training (TRN-2026-001) |
| Owner | Production Manager |
| Target date | 15 Apr 2026 |
| Effectiveness check | 30 Apr 2026 — revision date checklist |
| Status | Open — monitoring |

**Form ref:** FORM-CAPA-01`,
  },
];

type ScaffoldStaticFill = {
  code: string;
  buildContent: (companyName: string, locale: "tr" | "en") => string;
};

const SCAFFOLD_STATIC_FILLS: ScaffoldStaticFill[] = [
  {
    code: "FORM-MR-01",
    buildContent: (company, locale) =>
      locale === "tr"
        ? `## Yönetim Gözden Geçirme Formu — ${company}

| Alan | Değer |
|------|-------|
| Toplantı tarihi | |
| Toplantı no | MR-____ |
| Katılımcılar | |
| Gözden geçirilen girdiler | İç tetkik, müşteri geri bildirimi, CAPA, hedefler |
| Kalite hedefleri durumu | |
| Risk ve fırsatlar | |
| Kaynak ihtiyaçları | |
| İyileştirme kararları | |
| Sonraki gözden geçirme tarihi | |
| Onay (Genel Müdür) | |

**Referans:** SOP-MR, PLAN-MR-01`
        : `## Management Review Form — ${company}

| Field | Value |
|-------|-------|
| Meeting date | |
| Meeting no | MR-____ |
| Attendees | |
| Inputs reviewed | Internal audit, feedback, CAPA, objectives |
| Quality objectives status | |
| Risks and opportunities | |
| Resource needs | |
| Improvement decisions | |
| Next review date | |
| Approval (GM) | |

**Ref:** SOP-MR, PLAN-MR-01`,
  },
  {
    code: "FORM-NCP-01",
    buildContent: (company, locale) =>
      locale === "tr"
        ? `## Uygunsuz Ürün Formu — ${company}

| Alan | Değer |
|------|-------|
| Kayıt no | NCP-____ |
| Tarih | |
| Ürün / lot | |
| Uygunsuzluk tanımı | |
| Tespit yeri | |
| Miktar | |
| Ayırma / işaretleme | |
| Değerlendirme (kullanım/yeniden işleme/imanet/imha) | |
| Yetkili onay | |
| CAPA no | |

**Referans:** SOP-NCP`
        : `## Nonconforming Product Form — ${company}

| Field | Value |
|-------|-------|
| Record no | NCP-____ |
| Date | |
| Product / lot | |
| Nonconformity | |
| Detection point | |
| Quantity | |
| Segregation / labeling | |
| Disposition | |
| Authorized approval | |
| CAPA no | |

**Ref:** SOP-NCP`,
  },
  {
    code: "LIST-EQ-01",
    buildContent: (company, locale) =>
      locale === "tr"
        ? `## Ekipman ve Kalibrasyon Listesi — ${company}

| Kod | Ekipman | Konum | Kalibrasyon aralığı | Son kalibrasyon | Sonraki | Durum |
|-----|---------|-------|---------------------|-----------------|---------|-------|
| EQ-001 | Dijital terazi | Üretim | 12 ay | 01.01.2026 | 01.01.2027 | Uygun |
| EQ-002 | Sıcaklık data logger | Depo | 12 ay | 15.02.2026 | 15.02.2027 | Uygun |

**Referans:** SOP-ME — yeni ekipman eklendiğinde liste güncellenir.`
        : `## Equipment and Calibration List — ${company}

| Code | Equipment | Location | Interval | Last cal | Next | Status |
|------|-----------|----------|----------|----------|------|--------|
| EQ-001 | Digital scale | Production | 12 mo | 01 Jan 2026 | 01 Jan 2027 | OK |
| EQ-002 | Temperature logger | Warehouse | 12 mo | 15 Feb 2026 | 15 Feb 2027 | OK |

**Ref:** SOP-ME — update when equipment changes.`,
  },
  {
    code: "LIST-RC-01",
    buildContent: (company, locale) =>
      locale === "tr"
        ? `## Kayıt Listesi (Master Record List) — ${company}

| Kayıt kodu | Kayıt adı | İlgili prosedür | Saklama süresi | Sorumlu |
|------------|-----------|-----------------|----------------|---------|
| REC-HR-01 | Eğitim kaydı | SOP-HR | 10 yıl | Kalite |
| REC-IA-01 | İç tetkik raporu | SOP-IA | 10 yıl | Kalite |
| REC-MR-01 | YG tutanağı | SOP-MR | 10 yıl | Kalite |
| REC-CH-01 | Şikâyet kaydı | SOP-CH | Ürün ömrü +2 yıl | Kalite |
| REC-CAPA-01 | CAPA kaydı | SOP-CAPA | 10 yıl | Kalite |

**Referans:** SOP-RC, REC-GUIDE-01`
        : `## Master Record List — ${company}

| Record code | Title | Procedure | Retention | Owner |
|-------------|-------|-----------|-----------|-------|
| REC-HR-01 | Training record | SOP-HR | 10 years | Quality |
| REC-IA-01 | Audit report | SOP-IA | 10 years | Quality |
| REC-MR-01 | MR minutes | SOP-MR | 10 years | Quality |
| REC-CH-01 | Complaint record | SOP-CH | Product life +2 | Quality |
| REC-CAPA-01 | CAPA record | SOP-CAPA | 10 years | Quality |

**Ref:** SOP-RC, REC-GUIDE-01`,
  },
  {
    code: "PLAN-MR-01",
    buildContent: (company, locale) =>
      locale === "tr"
        ? `## Yönetim Gözden Geçirme Planı — ${company} (2026)

| Çeyrek | Tarih (plan) | Girdiler | Sorumlu |
|--------|--------------|----------|---------|
| Q1 | Mart 2026 | İç tetkik, hedefler, CAPA | Genel Müdür |
| Q2 | Haziran 2026 | PMS özeti, tedarikçi performansı | Genel Müdür |
| Q3 | Eylül 2026 | İç tetkik, risk güncellemesi | Genel Müdür |
| Q4 | Aralık 2026 | Yıllık değerlendirme, bütçe | Genel Müdür |

**Referans:** SOP-MR, FORM-MR-01`
        : `## Management Review Plan — ${company} (2026)

| Quarter | Planned date | Inputs | Owner |
|---------|--------------|--------|-------|
| Q1 | Mar 2026 | Internal audit, objectives, CAPA | GM |
| Q2 | Jun 2026 | PMS summary, supplier performance | GM |
| Q3 | Sep 2026 | Internal audit, risk update | GM |
| Q4 | Dec 2026 | Annual review, budget | GM |

**Ref:** SOP-MR, FORM-MR-01`,
  },
  {
    code: "PLAN-QA-01",
    buildContent: (company, locale) =>
      locale === "tr"
        ? `## Yıllık Kalite Planı — ${company} (2026)

| Hedef | KPI | Hedef değer | Sorumlu | Durum |
|-------|-----|-------------|---------|-------|
| Şikâyet çözüm süresi | Ortalama gün | ≤ 15 gün | Kalite | İzleniyor |
| İç tetkik kapanışı | Bulgu kapanış % | ≥ 95% | Kalite | İzleniyor |
| Eğitim tamamlama | Planlı eğitim % | 100% | İK / Kalite | İzleniyor |
| CAPA etkinliği | Zamanında kapanış % | ≥ 90% | Kalite | İzleniyor |

**Referans:** SOP-MR, madde 5.4.1 kalite hedefleri`
        : `## Annual Quality Plan — ${company} (2026)

| Objective | KPI | Target | Owner | Status |
|-----------|-----|--------|-------|--------|
| Complaint resolution | Average days | ≤ 15 days | Quality | Monitoring |
| Audit closure | Finding closure % | ≥ 95% | Quality | Monitoring |
| Training completion | Planned training % | 100% | HR / Quality | Monitoring |
| CAPA effectiveness | On-time closure % | ≥ 90% | Quality | Monitoring |

**Ref:** SOP-MR, clause 5.4.1`,
  },
  {
    code: "REC-GUIDE-01",
    buildContent: (company, locale) =>
      locale === "tr"
        ? `## Kayıt Dosyalama Rehberi — ${company}

1. Onaylı formlar **REC-*** veya prosedür altı kayıt kodlarıyla saklanır.
2. Saklama süreleri LIST-RC-01 ile tanımlanır; ürün ömrü +2 yıl minimum.
3. Kayıtlar erişilebilir, okunabilir ve geri alılamaz şekilde (gerektiğinde) korunur.
4. Elektronik kayıtlar yedekleme ve erişim kontrolü altındadır (SOP-RC).
5. Örnek operasyonel kayıtlar: REC-HR-01, REC-IA-01, REC-MR-01, REC-CH-01, REC-CAPA-01.

**Referans:** ISO 13485:2016 madde 4.2.5, SOP-RC`
        : `## Records Filing Guide — ${company}

1. Approved forms stored under **REC-*** or procedure-linked record codes.
2. Retention per LIST-RC-01; minimum product life + 2 years.
3. Records legible, identifiable, retrievable; protected from loss.
4. Electronic records under backup and access control (SOP-RC).
5. Sample operational records: REC-HR-01, REC-IA-01, REC-MR-01, REC-CH-01, REC-CAPA-01.

**Ref:** ISO 13485:2016 clause 4.2.5, SOP-RC`,
  },
  {
    code: "SPEC-PRD-01",
    buildContent: (company, locale) =>
      locale === "tr"
        ? `## Ürün Şartnamesi Şablonu — ${company}

| Bölüm | İçerik |
|-------|--------|
| Ürün adı | |
| Model / referans | |
| Amaçlanan kullanım | |
| Kullanıcı profili | |
| Temel performans / GSPR özeti | |
| Malzeme ve bileşenler | |
| Sterilizasyon (varsa) | |
| Ambalaj ve etiketleme | |
| Revizyon | 1.0 |

**Referans:** SOP-DD, teknik dosya`
        : `## Product Specification Template — ${company}

| Section | Content |
|---------|---------|
| Product name | |
| Model / reference | |
| Intended use | |
| User profile | |
| Essential performance / GSPR summary | |
| Materials and components | |
| Sterilization (if applicable) | |
| Packaging and labeling | |
| Revision | 1.0 |

**Ref:** SOP-DD, technical file`,
  },
  {
    code: "QM-01",
    buildContent: (company, locale) =>
      locale === "tr"
        ? `## Kalite El Kitabı Kaydı — ${company}

Bu kayıt, **Kalite El Kitabı**nın KYS doküman kontrol kaydını temsil eder.

- **Üretim yolu:** El Kitabı Sihirbazı + Composer (ISO 13485 kalite el kitabı)
- **Durum:** Üretildi — Composer’dan DOCX/PDF dışa aktarım
- **KYS prosedür referansları:** SOP-DC, SOP-ORG ve scaffold prosedür listesi
- **Revizyon:** El kitabı revizyonu Composer ve LIST-DC-01 üzerinden yönetilir

Detaylı metin Composer dokümanında; bu kod kontrol listesi ve doküman listesi bağlantısı için kullanılır.`
        : `## Quality Manual Register Entry — ${company}

This record represents the **Quality Manual** document control entry.

- **Source:** Quality Manual Wizard + Composer (ISO 13485 manual)
- **Status:** Generated — export DOCX/PDF from Composer
- **Procedure refs:** SOP-DC, SOP-ORG and scaffold procedure list
- **Revision:** Managed via Composer and LIST-DC-01

Full narrative lives in Composer; this code links the document list.`,
  },
  {
    code: "9001-9.1.2",
    buildContent: (company, locale) =>
      locale === "tr"
        ? `## ISO 9001:2015 — 9.1.2 Müşteri memnuniyeti

${company} müşteri memnuniyeti; şikâyet kayıtları (SOP-CH), geri bildirim kanalları ve yönetim gözden geçirmesi girdileri ile izlenir. Örnek kayıt: REC-CH-01.`
        : `## ISO 9001:2015 — 9.1.2 Customer satisfaction

${company} monitors customer satisfaction via complaint records (SOP-CH), feedback channels and management review inputs. Sample: REC-CH-01.`,
  },
  {
    code: "9001-9.2",
    buildContent: (company, locale) =>
      locale === "tr"
        ? `## ISO 9001:2015 — 9.2 İç tetkik

İç tetkik SOP-IA, PLAN-IA-01 ve FORM-IA-01 ile yönetilir. Örnek rapor: REC-IA-01.`
        : `## ISO 9001:2015 — 9.2 Internal audit

Internal audit managed via SOP-IA, PLAN-IA-01 and FORM-IA-01. Sample report: REC-IA-01.`,
  },
];

export interface OperationalKysPackResult {
  bulkGenerate: Awaited<ReturnType<typeof bulkGenerateQmsDocuments>>;
  sampleRecordsCreated: string[];
  sampleRecordsUpdated: string[];
  scaffoldTemplatesFilled: string[];
  documentListUpdated: boolean;
  inReviewCount: number;
  kysWithContent: number;
  kysTotal: number;
  emptyRemaining: number;
}

async function upsertSampleRecord(params: {
  companyId: string;
  sample: OperationalSampleRecord;
  companyName: string;
  locale: "tr" | "en";
  generatedBy: string;
}): Promise<"created" | "updated" | "skipped"> {
  const content = params.sample.buildContent(params.companyName, params.locale);

  const existing = await prisma.qMSDocument.findFirst({
    where: { companyId: params.companyId, code: params.sample.code, deletedAt: null },
  });

  if (existing) {
    if ((existing.content?.trim() ?? "").length > 80) return "skipped";
    await prisma.qMSDocument.update({
      where: { id: existing.id },
      data: {
        content,
        title: params.sample.titleTr,
        status: "IN_REVIEW",
        layer: "RECORD",
        parentProcedureCode: params.sample.parentProcedureCode,
        clauseRefs: params.sample.clauseRefs,
      },
    });
    return "updated";
  }

  const parent = await prisma.qMSDocument.findFirst({
    where: {
      companyId: params.companyId,
      code: params.sample.parentProcedureCode,
      deletedAt: null,
    },
    select: { standard: true },
  });
  if (!parent) return "skipped";

  await prisma.qMSDocument.create({
    data: {
      companyId: params.companyId,
      code: params.sample.code,
      title: params.sample.titleTr,
      standard: parent.standard,
      layer: "RECORD" as QmsDocumentLayer,
      parentProcedureCode: params.sample.parentProcedureCode,
      clauseRefs: params.sample.clauseRefs,
      content,
      status: "IN_REVIEW",
      version: "1.0",
      revisionNo: 0,
    },
  });
  return "created";
}

async function fillEmptyScaffoldDoc(params: {
  companyId: string;
  code: string;
  content: string;
}): Promise<boolean> {
  const doc = await prisma.qMSDocument.findFirst({
    where: { companyId: params.companyId, code: params.code, deletedAt: null },
  });
  if (!doc || (doc.content?.trim() ?? "").length > 80) return false;
  await prisma.qMSDocument.update({
    where: { id: doc.id },
    data: { content: params.content, status: "IN_REVIEW" },
  });
  return true;
}

async function appendDocumentListEntries(companyId: string, codes: string[]): Promise<boolean> {
  const list = await prisma.qMSDocument.findFirst({
    where: { companyId, code: "LIST-DC-01", deletedAt: null },
    select: { id: true, content: true },
  });
  if (!list?.content?.trim()) return false;

  const missing = codes.filter((c) => !list.content!.includes(c));
  if (!missing.length) return false;

  const appendix =
    "\n\n## Operasyonel örnek kayıtlar (otomatik güncelleme — " +
    new Date().toISOString().slice(0, 10) +
    ")\n\n" +
    missing.map((c) => `- ${c}`).join("\n");

  await prisma.qMSDocument.update({
    where: { id: list.id },
    data: { content: list.content!.trimEnd() + appendix },
  });
  return true;
}

/** Fill empty scaffold docs + seed operational sample records for live QMS use. */
export async function runOperationalKysPack(params: {
  companyId: string;
  generatedBy: string;
  locale?: "tr" | "en";
  generateAi?: boolean;
}): Promise<OperationalKysPackResult> {
  const locale = params.locale ?? "tr";
  const generateAi = params.generateAi !== false;

  const company = await prisma.company.findUnique({
    where: { id: params.companyId },
    select: { name: true },
  });
  const companyName = company?.name ?? "Company";

  const sampleRecordsCreated: string[] = [];
  const sampleRecordsUpdated: string[] = [];
  const scaffoldTemplatesFilled: string[] = [];

  for (const sample of OPERATIONAL_SAMPLE_RECORDS) {
    const result = await upsertSampleRecord({
      companyId: params.companyId,
      sample,
      companyName,
      locale,
      generatedBy: params.generatedBy,
    });
    if (result === "created") sampleRecordsCreated.push(sample.code);
    if (result === "updated") sampleRecordsUpdated.push(sample.code);
  }

  for (const fill of SCAFFOLD_STATIC_FILLS) {
    const filled = await fillEmptyScaffoldDoc({
      companyId: params.companyId,
      code: fill.code,
      content: fill.buildContent(companyName, locale),
    });
    if (filled) scaffoldTemplatesFilled.push(fill.code);
  }

  const allSampleCodes = OPERATIONAL_SAMPLE_RECORDS.map((s) => s.code);
  const documentListUpdated = await appendDocumentListEntries(params.companyId, allSampleCodes);

  let bulkGenerate = { total: 0, ok: 0, failed: 0, skipped: 0, items: [] as Awaited<
    ReturnType<typeof bulkGenerateQmsDocuments>
  >["items"] };

  if (generateAi) {
    const emptyShort = await prisma.qMSDocument.findMany({
      where: { companyId: params.companyId, deletedAt: null },
      select: { content: true },
    });
    const emptyCount = emptyShort.filter((d) => (d.content?.trim() ?? "").length <= 80).length;

    if (emptyCount > 0) {
      bulkGenerate = await bulkGenerateQmsDocuments({
        companyId: params.companyId,
        locale,
        generatedBy: params.generatedBy,
        onlyEmpty: true,
        maxDocs: Math.min(emptyCount, 8),
      });

      const generatedIds = bulkGenerate.items
        .filter((i) => i.status === "ok")
        .map((i) => i.documentId);
      if (generatedIds.length > 0) {
        await prisma.qMSDocument.updateMany({
          where: { id: { in: generatedIds }, status: { in: ["DRAFT", "MISSING"] } },
          data: { status: "IN_REVIEW" },
        });
      }
    }
  }

  const kysDocs = await prisma.qMSDocument.findMany({
    where: { companyId: params.companyId, deletedAt: null },
    select: { content: true },
  });
  const kysWithContent = kysDocs.filter((d) => (d.content?.trim() ?? "").length > 80).length;
  const emptyRemaining = kysDocs.filter((d) => (d.content?.trim() ?? "").length <= 80).length;

  const inReviewCount = await prisma.qMSDocument.count({
    where: { companyId: params.companyId, deletedAt: null, status: "IN_REVIEW" },
  });

  return {
    bulkGenerate,
    sampleRecordsCreated,
    sampleRecordsUpdated,
    scaffoldTemplatesFilled,
    documentListUpdated,
    inReviewCount,
    kysWithContent,
    kysTotal: kysDocs.length,
    emptyRemaining,
  };
}

/** AI-fill a single empty scaffold child (forms/plans) when bulk SOP path is insufficient. */
export async function fillEmptyChildIfNeeded(params: {
  companyId: string;
  code: string;
  locale: "tr" | "en";
  generatedBy: string;
}): Promise<boolean> {
  const doc = await prisma.qMSDocument.findFirst({
    where: { companyId: params.companyId, code: params.code, deletedAt: null },
  });
  if (!doc || (doc.content?.trim() ?? "").length > 80) return false;
  await generateProcedureChild({
    companyId: params.companyId,
    documentId: doc.id,
    locale: params.locale,
    generatedBy: params.generatedBy,
  });
  await prisma.qMSDocument.update({
    where: { id: doc.id },
    data: { status: "IN_REVIEW" },
  });
  return true;
}
