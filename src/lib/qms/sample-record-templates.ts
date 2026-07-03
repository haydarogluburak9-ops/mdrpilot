/**
 * Sample operational record content (client-safe — no server-only).
 * Used by scripts and rule-based child content for REC-* templates.
 */
export const SAMPLE_RECORD_BUILDERS: Record<string, (company: string, locale: "tr" | "en") => string> = {
  "REC-HR-01": (company, locale) =>
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

**Outcome:** Training completed; individual sign-off sheet filed in HR records.

**Approval:** Quality Manager — 15 Mar 2026`,

  "REC-IA-01": (company, locale) =>
    locale === "tr"
      ? `## İç Tetkik Raporu — Örnek (${company})

| Alan | Değer |
|------|-------|
| Rapor no | IA-2026-001 |
| Tarih | 20.03.2026 |
| Tetkik kapsamı | Madde 7.5 üretim kontrolü, 8.2.2 şikâyet işleme |
| Tetkikçiler | Kalite Müdürü (baş tetkikçi), Üretim Sorumlusu |
| Referans plan | PLAN-IA-01 |

**Bulgular:**
1. **Minör — IA-F-001:** Bir üretim talimatı revizyon tarihi güncellenmemiş.
2. **Gözlem:** Şikâyet kayıtları FORM-CH-01 ile uyumlu.

**Sonuç:** Minör bulgu için CAPA-2026-003 açıldı.`
      : `## Internal Audit Report — Sample (${company})

| Field | Value |
|-------|-------|
| Report no | IA-2026-001 |
| Date | 20 Mar 2026 |
| Scope | Clause 7.5 production control, 8.2.2 complaint handling |
| Auditors | Quality Manager (lead), Production Manager |
| Plan ref | PLAN-IA-01 |

**Findings:**
1. **Minor — IA-F-001:** One work instruction revision date not updated.
2. **Observation:** Complaint records align with FORM-CH-01.

**Outcome:** CAPA-2026-003 opened for minor finding.`,

  "REC-MR-01": (company, locale) =>
    locale === "tr"
      ? `## Yönetim Gözden Geçirme Tutanağı — Örnek (${company})

| Alan | Değer |
|------|-------|
| Toplantı no | MR-2026-001 |
| Tarih | 25.03.2026 |
| Katılımcılar | Genel Müdür, Kalite Müdürü, Üretim Müdürü, PRRC |
| Referans form | FORM-MR-01, PLAN-MR-01 |

**Girdiler:** REC-IA-01, müşteri geri bildirimi, CAPA durumu.

**Kararlar:**
1. KYS doküman revizyonları tamamlanacak (LIST-DC-01 güncel tutulacak).
2. İç tetkik planı 2026 için onaylandı.`
      : `## Management Review Minutes — Sample (${company})

| Field | Value |
|-------|-------|
| Meeting no | MR-2026-001 |
| Date | 25 Mar 2026 |
| Participants | GM, Quality Manager, Production Manager, PRRC |
| Forms | FORM-MR-01, PLAN-MR-01 |

**Inputs:** REC-IA-01, customer feedback, CAPA status.

**Decisions:**
1. Complete QMS document revisions; keep LIST-DC-01 current.
2. 2026 internal audit plan approved.`,

  "REC-CH-01": (company, locale) =>
    locale === "tr"
      ? `## Şikâyet Kaydı — Örnek (${company}) — CAPA gerekmedi

| Alan | Değer |
|------|-------|
| Kayıt no | CH-2026-011 |
| Alım tarihi | 08.03.2026 |
| Kaynak | Müşteri telefon |
| Ürün / lot | Steril set ST-100 / L20260228 |
| Şikâyet | Kullanım talimatı okunmamış — ürün hasarı |
| Emniyet riski | Yok |
| CAPA gerekli | Hayır — tek seferlik kullanım hatası |
| Müşteri yanıtı | 09.03.2026 — kullanım talimatı tekrar iletildi |
| Durum | Kapatıldı |

**Referans form:** FORM-CH-01 (FORM-CH-02 açılmadı)`
      : `## Complaint Record — Sample (${company}) — no CAPA

| Field | Value |
|-------|-------|
| Record no | CH-2026-011 |
| Received | 8 Mar 2026 |
| Source | Customer phone |
| Product / lot | Sterile set ST-100 / L20260228 |
| Complaint | IFU not read — product damage |
| Safety risk | None |
| CAPA needed | No — single-use handling error |
| Customer response | 9 Mar 2026 — IFU re-sent |
| Status | Closed |

**Form ref:** FORM-CH-01 (FORM-CH-02 not opened)`,

  "REC-CH-02": (company, locale) =>
    locale === "tr"
      ? `## Şikâyet–CAPA Bağlantı Kaydı — Örnek (${company})

| Alan | Değer |
|------|-------|
| Şikâyet no | CH-2026-012 |
| Ürün / lot | Steril set ST-100 / L20260301 |
| Şikâyet | Paket açılımında zorluk |
| CAPA no | CAPA-2026-002 |
| CAPA açılış | 12.03.2026 |
| CAPA durumu | Açık — izlemede |
| CAPA sorumlusu | Üretim Sorumlusu |
| Kök neden | Paketleme WI toleransı net değil |
| Düzeltici aksiyon | WI revizyonu + eğitim |
| Şikâyet durumu | İzlemede (CAPA açık) |

**Referans:** FORM-CH-01 + FORM-CH-02 + FORM-CAPA-01`
      : `## Complaint–CAPA Linkage Record — Sample (${company})

| Field | Value |
|-------|-------|
| Complaint no | CH-2026-012 |
| Product / lot | Sterile set ST-100 / L20260301 |
| Complaint | Difficulty opening package |
| CAPA no | CAPA-2026-002 |
| CAPA opened | 12 Mar 2026 |
| CAPA status | Open — monitoring |
| CAPA owner | Production Manager |
| Root cause | Packaging WI tolerance unclear |
| Corrective action | WI revision + training |
| Complaint status | Monitoring (CAPA open) |

**Refs:** FORM-CH-01 + FORM-CH-02 + FORM-CAPA-01`,

  "REC-CAPA-01": (company, locale) =>
    locale === "tr"
      ? `## CAPA Kaydı — Örnek (${company})

| Alan | Değer |
|------|-------|
| CAPA no | CAPA-2026-003 |
| Kaynak | İç tetkik bulgusu IA-F-001 (REC-IA-01) |
| Açıklama | Üretim talimatı revizyon tarihi güncellenmemiş |
| Düzeltici faaliyet | WI revizyonu ve eğitim |
| Etkinlik doğrulama | Tamamlandı — 05.04.2026 |
| Referans form | FORM-CAPA-01`
      : `## CAPA Record — Sample (${company})

| Field | Value |
|-------|-------|
| CAPA no | CAPA-2026-003 |
| Source | Internal audit finding IA-F-001 (REC-IA-01) |
| Description | Work instruction revision date not updated |
| Corrective action | WI revision and training |
| Effectiveness check | Completed — 5 Apr 2026 |
| Form ref | FORM-CAPA-01`,
};

export function getSampleRecordContent(
  code: string,
  companyName: string,
  locale: "tr" | "en",
): string | null {
  const builder = SAMPLE_RECORD_BUILDERS[code.trim().toUpperCase()];
  return builder ? builder(companyName, locale) : null;
}
