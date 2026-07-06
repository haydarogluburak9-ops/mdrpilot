import "server-only";

export type SiteGuideLocale = "tr" | "en";

interface SiteGuideSection {
  id: string;
  keywords: RegExp;
  tr: string;
  en: string;
}

const OVERVIEW: Record<SiteGuideLocale, string> = {
  tr: `MDRpilot menü yapısı (sol kenar çubuğu):
- Genel Bakış: Panel (/dashboard), Demo turu (/demo/tour), Ürünler (/products)
- Regülasyon: Teknik dosya, GSPR, Risk, Klinik, PMS, Kullanım talimatı (IFU)
- Zeka: Danışman, Denetim simülatörü, Yönetici özeti, Belge çevirici
- Kalite: Belge oluşturucu (/composer), Kalite el kitabı sihirbazı (/wizards/quality-manual), Standartlar, KYS (/qms), Operasyonel kayıtlar (/operational), Eğitim matrisi, Analitik, Belge kaydı, Belge kontrolü, Denetim hazırlığı, Dosyalar, Dışa aktarma
- Hesap: Yardım (/help), Aktivite günlüğü, Ayarlar (/settings), Faturalandırma (/billing)
Üst çubuktaki "AI Asistan" düğmesi her sayfadan açılır.`,
  en: `MDRpilot menu (left sidebar):
- Overview: Dashboard (/dashboard), Demo tour (/demo/tour), Products (/products)
- Regulatory: Technical file, GSPR, Risk, Clinical, PMS, IFU
- Intelligence: Consultant, Audit simulator, Executive, Document translator
- Quality: Composer (/composer), Quality manual wizard (/wizards/quality-manual), Standards, QMS (/qms), Operational records (/operational), Training matrix, Analytics, Document register, Document control, Audit readiness, Files, Exports
- Account: Help (/help), Activity log, Settings (/settings), Billing (/billing)
The "AI Assistant" button in the top bar is available on every page.`,
};

const SECTIONS: SiteGuideSection[] = [
  {
    id: "security-privacy",
    keywords:
      /güvenlik|security|korunuyor|korunur|güvende|gizli|private|başkası|başka.*gör|another.*see|other.*company|verilerim|veri güven|data safe|data protect|hack|şifreleme|encrypt|gizlilik politikası/i,
    tr: `**Veri güvenliği — özet (müşteri soruları)**
- **Firma izolasyonu:** Her müşterinin verisi ayrı çalışma alanında tutulur. Başka firmaların ürün, KYS, dosya veya dokümanlarına erişemezsiniz; sistem her istekte firma kimliğini doğrular.
- **Kimler görebilir?** Yalnızca kendi firmanızdaki davetli kullanıcılar (Owner, Kalite müdürü, Danışman, İzleyici vb.) ortak çalışma alanını görür. Rol bazlı yetkiler uygulanır.
- **Yüklenen dosyalar:** Kanıt dosyaları herkese açık linkle sunulmaz; giriş yapmış ve aynı firmada olan kullanıcılar indirebilir.
- **Parola:** Parolalar düz metin saklanmaz; güvenli özet (hash) ile tutulur. İsteğe bağlı iki adımlı doğrulama (2FA) Ayarlar'dan açılabilir.
- **İletişim:** Site trafiği HTTPS ile şifrelenir. Oturum çerezleri httpOnly'dir.
- **AI kullanımı:** Canlı AI açıksa, talep ettiğiniz çıktı için ilgili metin parçaları yapılandırılmış AI sağlayıcılarına (ör. OpenAI, Anthropic) iletilir; veriler reklam veya satış amacıyla kullanılmaz. Kurumsal gizlilik politikalarınıza göre değerlendirin.
- **Silme hakları:** Ayarlar → Gizlilik ve veri ile hesap veya firma verilerini silebilirsiniz. Ayrıntılar: /privacy (Gizlilik Politikası).
- **Destek:** privacy@mdrpilot.com · support@mdrpilot.com`,
    en: `**Data security — summary (customer FAQ)**
- **Company isolation:** Each customer has a separate workspace. Other companies cannot access your products, QMS, files or documents; every API request is scoped to your company.
- **Who can see my data?** Only invited users in your company (Owner, Quality manager, Consultant, Viewer, etc.) share the workspace. Role-based permissions apply.
- **Uploaded files:** Evidence files are not public URLs; only authenticated users in the same company can download them.
- **Passwords:** Stored as secure hashes, never plain text. Optional 2FA is available in Settings.
- **In transit:** HTTPS encryption. Session cookies are httpOnly.
- **AI:** When live AI is enabled, relevant excerpts are sent to configured providers (e.g. OpenAI, Anthropic) only to generate your requested output; data is not sold or used for advertising.
- **Deletion:** Settings → Privacy & data to delete account or company workspace. Details: /privacy
- **Contact:** privacy@mdrpilot.com · support@mdrpilot.com`,
  },
  {
    id: "account-delete",
    keywords:
      /hesab[\wığüşöçİĞÜŞÖÇ]*|hesap\s*sil|delete\s*(my\s*)?account|remove\s*(my\s*)?account|kvkk|gdpr|veri\s*sil|firma\s*veri|privacy|gizlilik|silebilirim|silerim/i,
    tr: `**Hesabımı silme (KVKK / GDPR)**
1. Sol menü → **Ayarlar** (/settings)
2. **Gizlilik ve veri (KVKK / GDPR)** kartına inin
3. Parolanızı girin, onay kutusuna \`HESABIMI SIL\` yazın → **Hesabımı sil**
4. Firma sahibiyseniz ayrıca **Firma verilerini sil** bölümünde \`FIRMA VERILERINI SIL\` ile tüm çalışma alanı silinebilir (geri alınamaz)`,
    en: `**Delete my account (GDPR / privacy)**
1. Left menu → **Settings** (/settings)
2. Open **Privacy & data (GDPR / KVKK)**
3. Enter your password, type \`HESABIMI SIL\` in the confirmation field → **Delete my account**
4. As company owner you can also delete all workspace data with \`FIRMA VERILERINI SIL\` (irreversible)`,
  },
  {
    id: "password-2fa",
    keywords: /parola|şifre|password|two.?factor|2fa|iki adımlı|doğrulama uygulaması|authenticator/i,
    tr: `**Parola ve iki adımlı doğrulama**
1. **Ayarlar** (/settings) → **Parola ve güvenlik**: mevcut + yeni parola ile güncelleyin
2. Parolayı unuttuysanız giriş sayfasında **Parolamı unuttum** (/forgot-password)
3. **İki adımlı doğrulama** aynı Ayarlar sayfasında: QR kodu tarayın (Google/Microsoft Authenticator), 6 haneli kodu onaylayın
4. Girişte 2FA açıksa paroladan sonra doğrulama kodu istenir`,
    en: `**Password and two-factor authentication**
1. **Settings** (/settings) → **Password & security**: update with current + new password
2. Forgot password: **Forgot password** on the login page (/forgot-password)
3. **Two-factor authentication** on the same Settings page: scan QR with an authenticator app, confirm with a 6-digit code
4. When 2FA is on, login asks for the code after your password`,
  },
  {
    id: "settings-team",
    keywords: /ayar|settings|ekip|takım|team|davet|invite|üye|rol|owner|kullanıcı ekle/i,
    tr: `**Ayarlar ve ekip**
1. **Ayarlar** (/settings): firma profili, logo, bildirilmiş kuruluş bilgileri
2. **Ekip** paneli: üye listesi; yetkili roller davet gönderebilir
3. Yeni üye: e-posta + rol ile davet → karşı taraf e-postadaki linkle katılır
4. Plan koltuk limiti Faturalandırma (/billing) sayfasında görülür`,
    en: `**Settings and team**
1. **Settings** (/settings): company profile, logo, notified body details
2. **Team** panel: member list; authorized roles can send invites
3. New member: invite by email + role → they join via the email link
4. Seat limits are shown on **Billing** (/billing)`,
  },
  {
    id: "products",
    keywords: /ürün ekle|yeni ürün|product|ürün oluştur|cihaz ekle/i,
    tr: `**Ürün oluşturma**
1. Sol menü → **Ürünler** (/products)
2. **Yeni ürün** (/products/new): ad, sınıf, sterilizasyon, hedef pazarlar
3. Ürün detayından teknik dosya, GSPR, risk, klinik, PMS ve IFU modüllerine geçilir
4. Ürün seçicisi üst çubukta veya modül sayfalarında değiştirilebilir`,
    en: `**Create a product**
1. Left menu → **Products** (/products)
2. **New product** (/products/new): name, class, sterilization, target markets
3. From the product detail, open technical file, GSPR, risk, clinical, PMS and IFU modules
4. Switch the active product from the top bar or module pages`,
  },
  {
    id: "technical-file",
    keywords: /teknik dosya|technical file|dossier|mdr dosya/i,
    tr: `**Teknik dosya**
1. Ürün seçin → **Teknik dosya** (/technical-file)
2. Bölüm listesinden eksik/taslak/onaylı durumları görün
3. Her bölümde AI taslak, manuel düzenleme ve kanıt dosyası ekleme
4. **Dışa aktarma** (/exports) ile DOCX/PDF paketleri indirin`,
    en: `**Technical file**
1. Select a product → **Technical file** (/technical-file)
2. Review section statuses (missing / draft / approved)
3. Per section: AI draft, manual edit, attach evidence files
4. Download DOCX/PDF bundles from **Exports** (/exports)`,
  },
  {
    id: "composer",
    keywords: /belge oluştur|composer|oluşturucu|docx|word|taslak belge/i,
    tr: `**Belge oluşturucu (Composer)**
1. **Belge oluşturucu** (/composer) → yeni belge veya şablon
2. Bağlam girin (ürün, prosedür, form); AI taslak üretir
3. Düzenleyip kaydedin; KYS veya teknik dosyaya bağlayabilirsiniz
4. Dışa aktarma merkezinden DOCX indirin`,
    en: `**Document composer**
1. **Composer** (/composer) → new document or template
2. Provide context (product, procedure, form); AI generates a draft
3. Edit and save; link to QMS or technical file if needed
4. Download DOCX from the exports center`,
  },
  {
    id: "qms",
    keywords: /kys|qms|kalite el kitabı|quality manual|prosedür|procedure|sop|el kitabı/i,
    tr: `**KYS (ISO 13485)**
1. **Kalite el kitabı sihirbazı** (/wizards/quality-manual): şirket profili → kapsam → AI ile el kitabı
2. **KYS** (/qms): prosedürler, formlar, talimatlar katmanlı klasör yapısında
3. Prosedür detayında içerik düzenleme, AI ile bölüm üretimi, operasyonel forma bağlama
4. **Belge kontrolü** (/document-control): revizyon ve onay akışı
5. **Belge kaydı** (/document-register): tüm kontrollü doküman listesi`,
    en: `**QMS (ISO 13485)**
1. **Quality manual wizard** (/wizards/quality-manual): company profile → scope → AI-generated manual
2. **QMS** (/qms): procedures, forms, instructions in layered folders
3. In a procedure: edit content, AI section generation, link operational forms
4. **Document control** (/document-control): revision and approval workflow
5. **Document register** (/document-register): controlled document list`,
  },
  {
    id: "operational",
    keywords: /operasyonel|operational|iç denetim|internal audit|ncp|capa|fsca|vigilance|şikayet|complaint|tedarikçi|supplier|kalibrasyon|eğitim kaydı/i,
    tr: `**Operasyonel kayıtlar (KYS işlemleri)**
1. **Operasyonel** (/operational): CAPA, şikayet, iç denetim, FSCA, vigilance, değişiklik kontrolü, yönetim gözden geçirme, tedarikçi değerlendirme, izlenebilirlik, kalibrasyon, eğitim
2. Modül seçin → yeni kayıt veya mevcut kaydı açın
3. İlgili KYS formu/prosedürüne bağlanabilir; AI ile form içeriği önerisi
4. **Eğitim matrisi** (/operational/training-matrix): yetkinlik ve eğitim takibi`,
    en: `**Operational records (QMS operations)**
1. **Operational** (/operational): CAPA, complaints, internal audit, FSCA, vigilance, change control, management review, supplier evaluation, traceability, calibration, training
2. Pick a module → create or open a record
3. Link to related QMS forms/procedures; AI can suggest form content
4. **Training matrix** (/operational/training-matrix): competency and training tracking`,
  },
  {
    id: "risk-gspr-clinical",
    keywords: /gspr|risk|klinik|clinical|cer|literatür|pms|pmcf|ifu|kullanım talimatı/i,
    tr: `**Regülasyon modülleri (ürün bazlı)**
- **GSPR** (/gspr): genel güvenlik ve performans gereklilikleri, kanıt matrisi
- **Risk** (/risk): ISO 14971 risk dosyası, FMEA, politika yüklemesi
- **Klinik** (/clinical): CER, literatür taraması, eşdeğer cihaz
- **PMS** (/pms): PMS planı, PMCF, PSUR
- **IFU** (/ifu): kullanım talimatı taslağı
Önce ürün seçin; her modül ürün verisini kullanır.`,
    en: `**Regulatory modules (per product)**
- **GSPR** (/gspr): general safety and performance requirements, evidence matrix
- **Risk** (/risk): ISO 14971 risk file, FMEA, policy uploads
- **Clinical** (/clinical): CER, literature search, equivalent devices
- **PMS** (/pms): PMS plan, PMCF, PSUR
- **IFU** (/ifu): instructions for use draft
Select a product first; each module uses that product's data.`,
  },
  {
    id: "exports-files",
    keywords: /dışa aktar|export|indir|download|dosya yükle|upload|kanıt|evidence/i,
    tr: `**Dosyalar ve dışa aktarma**
1. **Dosyalar** (/files): PDF, DOCX, görsel kanıtları yükleyin; modüllere bağlayın
2. **Dışa aktarma** (/exports): teknik dosya, KYS, risk vb. paketleri oluşturup indirin
3. İşlem tamamlanınca listeden indirme linki aktif olur`,
    en: `**Files and exports**
1. **Files** (/files): upload PDF, DOCX, images as evidence; link to modules
2. **Exports** (/exports): build and download technical file, QMS, risk bundles
3. Download link becomes active when the job completes`,
  },
  {
    id: "billing-plan",
    keywords: /plan|fatura|billing|ödeme|abonelik|subscription|token|kota|demo/i,
    tr: `**Plan ve faturalandırma**
1. **Faturalandırma** (/billing): mevcut plan, koltuk/ürün limiti, AI token kotası
2. Kart ödemesi yakında; şimdilik yönetici manuel plan/demo atayabilir
3. Süreli deneme için destek ile iletişim veya admin panelinden demo
4. Token paketi satın alma (uygun planlarda) aynı sayfada`,
    en: `**Billing and plans**
1. **Billing** (/billing): current plan, seat/product limits, AI token quota
2. Card payments coming soon; admins can assign plans or demo access manually for now
3. Contact support or use admin demo grant for time-limited trials
4. Token pack purchases (on eligible plans) are on the same page`,
  },
  {
    id: "audit-help",
    keywords: /denetim|audit|simülatör|simulator|hazırlık|readiness|yardım|help|nasıl kullanırım|how (do|to)|nerede|where/i,
    tr: `**Denetim ve yardım**
1. **Denetim hazırlığı** (/audit): skor ve eksik aksiyonlar
2. **Denetim simülatörü** (/audit-simulator): soru-cevap provası
3. **Yardım** (/help): destek formu ve support@mdrpilot.com
4. Platform kullanımı için bu asistana "X işlemini nasıl yaparım?" diye sorabilirsiniz`,
    en: `**Audit and help**
1. **Audit readiness** (/audit): score and missing actions
2. **Audit simulator** (/audit-simulator): Q&A practice
3. **Help** (/help): contact form and support@mdrpilot.com
4. Ask this assistant "How do I …?" for step-by-step platform guidance`,
  },
];

export function buildSiteGuideContext(message: string, locale: SiteGuideLocale): string {
  const parts = [OVERVIEW[locale]];
  const seen = new Set<string>();

  for (const section of SECTIONS) {
    if (section.keywords.test(message) && !seen.has(section.id)) {
      seen.add(section.id);
      parts.push(locale === "tr" ? section.tr : section.en);
    }
  }

  // Turkish inflections: "hesabımı nasıl silerim" etc.
  if (!seen.has("account-delete") && /hesab\w*.*sil|hesap.*sil|delete.*account|remove.*account/i.test(message)) {
    const section = SECTIONS.find((s) => s.id === "account-delete");
    if (section) {
      seen.add(section.id);
      parts.push(locale === "tr" ? section.tr : section.en);
    }
  }

  if (seen.size === 0) {
    parts.push(
      locale === "tr"
        ? "Kullanıcı platform kullanımı soruyorsa menü yolunu adım adım tarif et; emin değilsen Ayarlar veya Yardım sayfasını öner."
        : "If the user asks how to use the platform, give step-by-step menu paths; if unsure, suggest Settings or Help.",
    );
  }

  return parts.join("\n\n");
}

export function mockSiteGuideReply(message: string, locale: SiteGuideLocale): string | null {
  const m = message.toLowerCase();
  const isTr = locale === "tr";

  if (/güvenlik|korunuyor|korunur|başkası.*gör|verilerim|gizli|data safe|data protect|who can see/i.test(m)) {
    return isTr
      ? "**Kısa cevap:** Evet — verileriniz firma bazında izole edilir; başka müşteriler göremez.\n\n**Detay:**\n- Yalnızca kendi firmanızdaki davetli ekip üyeleri çalışma alanını görür\n- Dosyalar herkese açık değildir; giriş + firma kontrolü vardır\n- Parolalar hash ile saklanır; HTTPS ve oturum güvenliği uygulanır\n- Canlı AI kullanıyorsanız, AI için metin parçaları sağlayıcıya gider (Gizlilik Politikası: /privacy)\n- Hesap/firma silme: Ayarlar → Gizlilik ve veri\n\nSorularınız için: privacy@mdrpilot.com"
      : "**Short answer:** Yes — your data is isolated per company; other customers cannot see it.\n\n**Details:**\n- Only invited members of your company see the workspace\n- Files are not public; login + company checks required\n- Passwords are hashed; HTTPS and secure sessions\n- With live AI, excerpts are sent to the provider (see /privacy)\n- Delete account/company: Settings → Privacy & data\n\nQuestions: privacy@mdrpilot.com";
  }

  if (/hesab\w*.*sil|hesap.*sil|hesabım|hesabimi|delete.*account|remove.*account|veri.*sil|kvkk|gdpr|firma veri|silebilirim|silerim/i.test(m)) {
    return isTr
      ? "**Hesabınızı silmek için:**\n1. Sol menü → **Ayarlar** (/settings)\n2. **Gizlilik ve veri (KVKK / GDPR)** bölümüne inin\n3. Parolanızı girin ve onay alanına `HESABIMI SIL` yazın\n4. **Hesabımı sil** düğmesine basın\n\nFirma verilerini tamamen kaldırmak için (yalnızca firma sahibi) aynı sayfada `FIRMA VERILERINI SIL` kullanın."
      : "**To delete your account:**\n1. Left menu → **Settings** (/settings)\n2. Scroll to **Privacy & data (GDPR / KVKK)**\n3. Enter your password and type `HESABIMI SIL` in the confirmation field\n4. Click **Delete my account**\n\nCompany owners can remove all workspace data with `FIRMA VERILERINI SIL` on the same page.";
  }

  if (/parola|şifre|password|2fa|iki adımlı|değiştiri|degistiri|change.*password/i.test(m)) {
    return isTr
      ? "**Şifrenizi değiştirmek için:**\n1. Sol menü → **Ayarlar** (/settings)\n2. **Parola ve güvenlik** kartını açın\n3. Mevcut parola + yeni parolayı girin → **Parolayı güncelle**\n\nParolayı unuttuysanız giriş sayfasında **Parolamı unuttum** (/forgot-password).\n\n**2FA:** Aynı Ayarlar sayfasında **İki adımlı doğrulama** bölümünden kurulur."
      : "**To change your password:**\n1. Left menu → **Settings** (/settings)\n2. Open **Password & security**\n3. Enter current + new password → **Update password**\n\nForgot password? Use **Forgot password** on the login page (/forgot-password).\n\n**2FA:** Set up under **Two-factor authentication** on the same Settings page.";
  }

  if (/nasıl|how to|nerede|where|kullanırım|işlem/i.test(m) && /kys|qms|operasyonel|operational/i.test(m)) {
    return isTr
      ? "**KYS işlemleri:**\n1. **KYS** (/qms) — prosedür ve formlar\n2. **Operasyonel** (/operational) — CAPA, şikayet, iç denetim, FSCA vb.\n3. **Belge kontrolü** (/document-control) — onay akışı\n\nHangi kaydı açmak istediğinizi söylerseniz adım adım yönlendirebilirim."
      : "**QMS operations:**\n1. **QMS** (/qms) — procedures and forms\n2. **Operational** (/operational) — CAPA, complaints, internal audit, FSCA, etc.\n3. **Document control** (/document-control) — approval workflow\n\nTell me which record type you need and I can guide you step by step.";
  }

  if (/belge|doküman|document|oluştur/i.test(m)) {
    return isTr
      ? "**Belge oluşturma seçenekleri:**\n- **Belge oluşturucu** (/composer) — serbest AI belgesi\n- **Kalite el kitabı sihirbazı** (/wizards/quality-manual) — el kitabı\n- **KYS** (/qms) — prosedür/form içeriği\n- Ürün modülleri — teknik dosya, IFU, risk, CER\n\nHangisini istediğinizi belirtin."
      : "**Document creation:**\n- **Composer** (/composer) — free-form AI documents\n- **Quality manual wizard** — quality manual\n- **QMS** (/qms) — procedure/form content\n- Product modules — technical file, IFU, risk, CER\n\nSay which type you need.";
  }

  if (/nasıl kullan|how to use|platformu|uygulamayı|menü|sidebar/i.test(m)) {
    return isTr
      ? "Sol menüden modüllere erişirsiniz. **Ayarlar** hesap/gizlilik, **KYS** ve **Operasyonel** kalite kayıtları, **Belge oluşturucu** ve **Ürünler** regülasyon dosyaları içindir. Ne yapmak istediğinizi yazın (ör. hesap silme, CAPA açma, teknik dosya)."
      : "Use the left menu to navigate. **Settings** for account/privacy, **QMS** and **Operational** for quality records, **Composer** and **Products** for regulatory dossiers. Tell me what you want to do (e.g. delete account, open a CAPA, technical file).";
  }

  return null;
}
