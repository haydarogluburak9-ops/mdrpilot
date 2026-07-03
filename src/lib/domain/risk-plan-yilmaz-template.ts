/**
 * Risk Yönetim Planı yapısı — MD-RM-01 (ISO 14971 tam bölüm başlıkları).
 * Başlıklar referans Word şablonu ile aynı sıra ve numaralandırma.
 */

export const RISK_PLAN_HEADINGS_TR: string[] = [
  "1. Risk Yönetim Planı Kapsamı",
  "2. Özet ve Amaç",
  "3. Risk Yönetim Planının Kapsamı",
  "3.1 Ürün Tanımı ve Açıklaması",
  "3.1.1 Ürün Tanımı",
  "3.1.2 Kullanım Amacı",
  "3.1.3 Uygunluk Değerlendirme Rotası",
  "3.1.4 Endikasyonlar, Kontrendikasyonlar",
  "3.1.4.1 Endikasyonlar",
  "3.1.4.2 Kontrendikasyonlar",
  "3.1.5 Biouyumluluk Sınıfı",
  "3.1.6 Ambalaj Malzeme Bilgisi",
  "3.1.7 Ürün Listesi",
  "3.1.8 EMDN Kodu ve Açıklaması",
  "3.1.9 Sterilizasyon Metodu",
  "3.1.10 Ürün Sınıflandırması",
  "3.1.11 Risk Yönetimi Yaşam Döngüsü Uygulaması",
  "3.1.11.1 Tasarım Geliştirme Planlaması",
  "3.1.11.2 Tasarım Geliştirme",
  "3.1.11.3 Tasarım Geliştirme Doğrulanması",
  "3.1.11.4 Tasarım Geliştirme Geçerliliği",
  "3.1.11.5 Satın Alma",
  "3.1.11.6 Üretim",
  "3.1.11.7 Kalite Kontrol",
  "3.1.11.8 Depolama",
  "3.1.11.9 Satış",
  "3.1.11.10 Satış Sonrası Aşama",
  "3.1.11.11 İzleme",
  "4. Yetki ve Sorumluluk Atamaları",
  "5. Risk Yönetim Gözden Geçirme Gereksinimleri",
  "6. Tablo E.1 — Tehlike Örnekleri",
  "7. Tablo E.2 — Tetikleyen Olay ve Durum Örnekleri",
  "8. Zarar Meydana Gelme Olasılığı Tahmin Edilemediğinde Risklerin Kabul Edilme Kriterlerini de İçeren Risk Kabul Edilebilirlik Kriterleri",
  "8.1 Değerlendirme Kriterleri",
  "8.1.1 Değerlendirme Kriterleri AFAP (Mümkün Olduğunca)",
  "8.1.2 Risk Seviyeleri",
  "8.2 Doğrulama Faaliyetleri",
  "8.3 Üretim Sonrası Bilgilerin Nasıl Elde Edileceği",
  "8.3.1 Satış Sonrası Geri Besleme",
  "8.3.2 Müşteri Şikayetleri",
  "8.3.3 Satış Sonrası Gözetim",
  "8.4 Risk Yönetimi Gözden Geçirme Raporu",
  "9. Sonuç",
];

export const RISK_PLAN_HEADINGS_EN: string[] = [
  "1. Risk Management Plan Scope",
  "2. Summary and Purpose",
  "3. Scope of the Risk Management Plan",
  "3.1 Product Description",
  "3.1.1 Product Definition",
  "3.1.2 Intended Purpose",
  "3.1.3 Conformity Assessment Route",
  "3.1.4 Indications and Contraindications",
  "3.1.4.1 Indications",
  "3.1.4.2 Contraindications",
  "3.1.5 Biocompatibility Class",
  "3.1.6 Packaging Material Information",
  "3.1.7 Product List",
  "3.1.8 EMDN Code and Description",
  "3.1.9 Sterilization Method",
  "3.1.10 Product Classification",
  "3.1.11 Risk Management Lifecycle Application",
  "3.1.11.1 Design and Development Planning",
  "3.1.11.2 Design and Development",
  "3.1.11.3 Design and Development Verification",
  "3.1.11.4 Design and Development Validation",
  "3.1.11.5 Purchasing",
  "3.1.11.6 Production",
  "3.1.11.7 Quality Control",
  "3.1.11.8 Storage",
  "3.1.11.9 Sales",
  "3.1.11.10 Post-Market Phase",
  "3.1.11.11 Monitoring",
  "4. Authority and Responsibility Assignments",
  "5. Risk Management Review Requirements",
  "6. Table E.1 — Hazard Examples",
  "7. Table E.2 — Initiating Event and Circumstance Examples",
  "8. Risk Acceptability Criteria Including Acceptance Criteria When Probability of Harm Cannot Be Estimated",
  "8.1 Evaluation Criteria",
  "8.1.1 Evaluation Criteria AFAP (As Far As Possible)",
  "8.1.2 Risk Levels",
  "8.2 Verification Activities",
  "8.3 How Post-Production Information Will Be Obtained",
  "8.3.1 Post-Market Feedback",
  "8.3.2 Customer Complaints",
  "8.3.3 Post-Market Surveillance",
  "8.4 Risk Management Review Report",
  "9. Conclusion",
];

/** Markdown gövde — {{placeholder}} alanları buildRiskTemplateContext ile doldurulur. */
export const RISK_PLAN_MARKDOWN_TEMPLATE_TR = `
## 1. Risk Yönetim Planı Kapsamı

{{productName}} ({{brand}} / {{model}}).

## 2. Özet ve Amaç

Bu risk yönetimi planının amacı {{productName}} kullanımı ile ilgili kullanıcı, operatörler ve hastalara herhangi bir zarar meydana gelmesi veya ürün kullanımının gerçekleşememesi olasılığının önlenmesi için tehlikelerin tanımlanması, tüm ürün ile ilgili proseslerin (tasarım ve geliştirme [TG], üretim) yaşam döngülerinden kaynaklanabilecek potansiyel risklerin veya zararların önlenmesi veya minimize edilmesidir.

Bu plan ISO 14971:2019 standardında tanımlanmış risk yönetimi proseslerinin tüm unsurlarının ve hasta ile kullanıcılara düşük riskli ürün sunulması için risk yönetiminin etkili şekilde yürütüldüğünden emin olmak için oluşturulmuştur.

## 3. Risk Yönetim Planının Kapsamı

Bu bölümde tıbbi cihaz ve plan için geçerli olan her öğe için yaşam döngüsü aşamaları tanımlanmakta ve açıklanmaktadır.

## 3.1 Ürün Tanımı ve Açıklaması

## 3.1.1 Ürün Tanımı

{{productName}} — {{intendedPurpose}}. Materyal: {{materials}}. Sterilizasyon: {{sterilization}}.

## 3.1.2 Kullanım Amacı

{{intendedPurpose}}

## 3.1.3 Uygunluk Değerlendirme Rotası

2017/745 MDR, Sınıf {{deviceClass}} tıbbi cihaz için uygunluk değerlendirme prosedürleri izlenmektedir. Bildirilen kuruluş: {{notifiedBody}}.

## 3.1.4 Endikasyonlar, Kontrendikasyonlar

## 3.1.4.1 Endikasyonlar

{{indications}}

## 3.1.4.2 Kontrendikasyonlar

{{contraindications}}

## 3.1.5 Biouyumluluk Sınıfı

{{biocompatibilityDetail}}

## 3.1.6 Ambalaj Malzeme Bilgisi

{{packagingDetail}}

## 3.1.7 Ürün Listesi

Detaylı ürün listesi için teknik dosya ürün modeli bölümüne bakınız. Marka: {{brand}}, Model: {{model}}.

## 3.1.8 EMDN Kodu ve Açıklaması

{{emdnDetail}}

## 3.1.9 Sterilizasyon Metodu

{{sterilization}}

## 3.1.10 Ürün Sınıflandırması

MDR Ek IX kurallarına göre Sınıf {{deviceClass}}. UDI-DI: {{udiDi}} | Basic UDI-DI: {{basicUdiDi}}.

## 3.1.11 Risk Yönetimi Yaşam Döngüsü Uygulaması

Ürünün yaşam döngüsünün her aşamasında uygulanması gereken faaliyetler aşağıda tanımlanmıştır.

## 3.1.11.1 Tasarım Geliştirme Planlaması

TG planlamasında şikâyetler ve satış sonrası bilgiler risk faktörlerini analiz etmek için incelenecektir. Belirlenen risk faktörleri normal ve anormal kullanım koşullarında değerlendirilecektir.

## 3.1.11.2 Tasarım Geliştirme

TG hasta gereksinimleri, kullanıcı gereksinimleri, kullanım amacı, güvenlik gereksinimleri ve yasal gereklilikleri kapsar. Tahmin edilebilir risk faktörleri ilgili standartlar ve benzer ürün güvenlik bilgilerinin analizi ile oluşturulur.

## 3.1.11.3 Tasarım Geliştirme Doğrulanması

Tanımlanmış risklere uygun risk yönetimi metotlarının uygulandığı ve sonuçların kabul kriterlerini karşıladığı nesnel kayıtlarla doğrulanacaktır.

## 3.1.11.4 Tasarım Geliştirme Geçerliliği

Kullanıcı gereksinimleri, kullanım amacı şartları ve arta kalan tüm risklerin kabul kriterlerini karşılayıp karşılamadığı belirlenecektir.

## 3.1.11.5 Satın Alma

Ham maddelerin uygunluğu ve kritik tedarikçi kontrolleri satın alma prosedürleri ile yönetilir.

## 3.1.11.6 Üretim

Üretim süreci, bakım/kalibrasyon ve ölçme cihazları ile ilgili riskler FMEA ({{fmeaRef}}) ile değerlendirilir.

## 3.1.11.7 Kalite Kontrol

Hammadde ve bitmiş ürün kontrolleri kalite planı ve teknik dokümanlara göre gerçekleştirilir.

## 3.1.11.8 Depolama

Depolama aşamasında karışmayı engelleyici risk önlemleri kalite dokümantasyonuna yansıtılır.

## 3.1.11.9 Satış

Doğru ürünün doğru evraklarla doğru müşteriye ulaşması için satış süreci riskleri değerlendirilir.

## 3.1.11.10 Satış Sonrası Aşama

Müşteri şikâyetleri ve satış sonrası bilgiler toplanır; risk analizi gerektiğinde tekrarlanır ve risk yönetim raporu ({{reportRef}}) gözden geçirilir.

## 3.1.11.11 İzleme

Ürün yaşam döngüsü aşamalarında riskler izlenir ve elde edilen bilgilerle değerlendirme yapılır.

## 4. Yetki ve Sorumluluk Atamaları

Risk yönetimi çalışmasını gerçekleştirecek kişilerin ünvanları risk analizi prosedüründe belirlenmiştir. Risk yönetim ekibi ve rolleri aşağıdaki tabloda özetlenmiştir.

| Görev | Birim | Sorumluluklar |
| --- | --- | --- |
| Üst Yönetim | Genel Müdür | Kaynak tahsisi, risk azaltma kararları |
| Üretim / Kalite | Üretim Sorumlusu | Üretim ve kullanım risklerinin tespiti |
| Pazarlama / Satış Sonrası | Pazarlama | PMS verileri, şikâyet toplama |
| Kalite Yönetim | Yönetim Temsilcisi | Risk belirleme, dokümantasyon, gözden geçirme |
| Bağımsız Klinisyen | Klinik uzman | Klinik değerlendirme, fayda-risk |

*Tablo 2 — Risk Yönetimi Çalışma Ekibi ve Rolleri*

## 5. Risk Yönetim Gözden Geçirme Gereksinimleri

Ürün yaşam döngüsü basamakları için risk yönetim gözden geçirme gereksinimleri:

| No | Aşama | Gözden Geçirme Gereksinimleri |
| --- | --- | --- |
| 1 | TG Planlaması | Benzer ürün verileri, saha ve klinik veriler değerlendirilir |
| 2 | TG | Uyumluluk standartları çerçevesinde riskler düşürülür |
| 3 | TG Doğrulama | Kontrol sonrası risklerin kabul kriterlerini karşılaması doğrulanır |
| 4 | TG Geçerliliği | Gerçek kullanım durumları ve klinik veriler değerlendirilir |
| 5 | Satın Alma | Tedarik edilen hammaddenin uygunluğu doğrulanır |
| 6 | Üretim | Üretim riskleri tanımlanır ve azaltılır |
| 7 | Kalite Kontrol | Ürün hasarı doğrulanır |
| 8 | Depolama | Depolama riskleri değerlendirilir |
| 9 | Satış | Satış süreci riskleri değerlendirilir |
| 10 | Üretim Sonrası | Öngörülmeyen riskler için tedbirler alınır |
| 11 | İzleme | Müşteri geri beslemeleri ile risk oluşumu azaltılır |

*Tablo 3 — Risk Yönetim Gözden Geçirme Gereksinimleri*

Güvenlikle ilgili tehlike ve karakteristikler ISO/TR 24971 Ek A'sına göre tanımlanır. Tablo E.1 ve Tablo E.2 bilgileri doğrultusunda yürütülür.

## 6. Tablo E.1 — Tehlike Örnekleri

{{tableE1Detail}}

## 7. Tablo E.2 — Tetikleyen Olay ve Durum Örnekleri

{{tableE2Detail}}

## 8. Zarar Meydana Gelme Olasılığı Tahmin Edilemediğinde Risklerin Kabul Edilme Kriterlerini de İçeren Risk Kabul Edilebilirlik Kriterleri

ISO 14971:2019'a göre olasılık tahmininin güvenilir olmadığı durumlarda geniş aralık veya «en kötü durumdan daha iyi olmadığı» belirlenir. {{legalName}} bünyesinde risk yönetimi ürün yaşam döngüsü boyunca sistematik olarak uygulanır.

## 8.1 Değerlendirme Kriterleri

Uygulama detayları için risk analizi prosedürü referans alınmalıdır. Müşteri geri besleme prosedürü ile gelen bilgiler değerlendirilir.

## 8.1.1 Değerlendirme Kriterleri AFAP (Mümkün Olduğunca)

Tespit edilen tüm risklere risk azaltım faaliyeti uygulanacaktır. Ekonomiklik bir kriter olarak alınmayacaktır. Risk azaltım faaliyetleri {{fmeaRef}} formunda kayıtlandırılacaktır.

## 8.1.2 Risk Seviyeleri

{{riskMatrixDetail}}

## 8.2 Doğrulama Faaliyetleri

Risk kontrol tedbirlerinin uygulanması ve etkinliği periyodik olarak doğrulanır (risk analizi geçerliliği, üretim kayıtları, müşteri şikâyetleri, müşteri memnuniyeti, standart/mevzuat takibi).

## 8.3 Üretim Sonrası Bilgilerin Nasıl Elde Edileceği

ISO 14971:2019 Madde 10 kapsamında üretim ve üretim sonrası bilgiler toplanır ve gözden geçirilir.

## 8.3.1 Satış Sonrası Geri Besleme

Kritik müşteri görüşmeleri müşteri geri besleme prosedürüne göre kayıt altına alınır.

## 8.3.2 Müşteri Şikayetleri

Her şikâyet kayıtlandırılır; gerekirse düzeltici/önleyici faaliyetler başlatılır.

## 8.3.3 Satış Sonrası Gözetim

Yıllık dönemde satış sonrası geri besleme, şikâyetler, geri çağırmalar, olumsuz olay verileri ve eşdeğer ürün literatürü takip edilir.

## 8.4 Risk Yönetimi Gözden Geçirme Raporu

Risk analiz, değerlendirme, kontrol ve artık risk değerlendirmesi (fayda-risk analizi) çalışmalarının özeti {{reportRef}} içinde yıllık olarak değerlendirilir.

## 9. Sonuç

Aşağıdaki durumlarda risk yönetimi dosyası revize edilecektir:

- Daha önce değerlendirilmemiş risklerin ortaya çıkması
- Artık risklerle ilgili olumsuz bilgilerin alınması
- Ürün üzerinde yapılan revizyonlar
- Standartlar veya yönetmeliklerde oluşan değişiklikler

Yukarıdaki maddelerin risk yönetimini etkilememesi halinde dosyada revizyon yapılması gerekmez.

---

## Onay

| Görev | Ad / Ünvan | İmza | Tarih |
| --- | --- | --- | --- |
| Hazırlayan | Risk Yönetim Ekibi | | {{date}} |
| Onaylayan | Kalite Müdürü | | {{date}} |

**Risk yönetim dosyası bileşenleri:** {{planRef}}, {{annexARef}}, {{fmeaRef}}, {{reportRef}}, {{policyRef}}
`;
