/** Deterministic flow diagrams for KYS child documents (preview markdown + Word export hooks). */

import { buildGenericDiagramContent } from "./layer-content-templates";

export function buildAnDecisionFlowDiagram(locale: "tr" | "en"): string {
  if (locale === "tr") {
    return [
      "# DIA-AN-01 — Danışma / FSCA Karar Akışı ve Bildirim Süreleri",
      "",
      "> Şema — prosedür metni değildir. Word dışa aktarımda kutu akış şeması (yatay sayfa) olarak üretilir.",
      "",
      "## Akış şeması (özet)",
      "",
      "| Sıra | Adım / karar | Kayıt / referans |",
      "|------|----------------|-------------------|",
      "| 1 | GİRİŞ | Şikâyet SOP-CH / FORM-CH-01; Vigilans SOP-VG; PMS sinyali |",
      "| 2 | İlk değerlendirme ve kayıt | FORM-AN-01 |",
      "| 3 | Karar: Emniyet riski var mı? | |",
      "| 3a | ↳ HAYIR | Danışma Bildirimi — FORM-AN-03 |",
      "| 3b | ↳ EVET → FSCA gerekli mi? | |",
      "| 3b-i | ↳↳ HAYIR | Risk azaltma / izleme — SOP-RM |",
      "| 3b-ii | ↳↳ EVET | FSCA → FSN FORM-AN-02 → Dağıtım FORM-AN-04 → İade FORM-AN-05 |",
      "| 4 | MDR bildirim süreleri | 2 gün / 10 gün / 15 gün — WI-AN-01 |",
      "| 5 | Etkinlik ve kapanış | FORM-AN-06; FORM-CAPA-01; REC-AN-01 |",
      "",
      "## Kayıt referansları",
      "",
      "| Kod | Doküman |",
      "|-----|---------|",
      "| FORM-AN-01 | FSCA başlatma ve ilk değerlendirme |",
      "| FORM-AN-02 | Field Safety Notice (FSN) şablonu |",
      "| FORM-AN-03 | Danışma bildirimi şablonu |",
      "| FORM-AN-04 | FSN dağıtım ve okundu teyidi |",
      "| FORM-AN-05 | RMA / iade / geri çağırma takibi |",
      "| FORM-AN-06 | Etkinlik doğrulama kontrol listesi |",
      "| WI-AN-01 | EUDAMED / ulusal portal bildirim talimatı |",
      "",
      "## Revizyon",
      "",
      "| Rev | Tarih | Açıklama |",
      "|-----|-------|----------|",
      "| 00 | [TBC] | İlk yayın |",
    ].join("\n");
  }

  return [
    "# DIA-AN-01 — Advisory / FSCA Decision Flow and Reporting Timelines",
    "",
    "> Diagram — not a procedure. Word export renders a boxed flowchart on landscape pages.",
    "",
    "## Flow diagram (summary)",
    "",
    "| Step | Action / decision | Record / reference |",
    "|------|-------------------|---------------------|",
    "| 1 | ENTRY | Complaint SOP-CH / FORM-CH-01; Vigilance SOP-VG; PMS signal |",
    "| 2 | Initial assessment | FORM-AN-01 |",
    "| 3 | Decision: Safety risk? | |",
    "| 3a | ↳ NO | Advisory Notice — FORM-AN-03 |",
    "| 3b | ↳ YES → FSCA required? | |",
    "| 3b-i | ↳↳ NO | Risk mitigation — SOP-RM |",
    "| 3b-ii | ↳↳ YES | FSCA → FSN FORM-AN-02 → Distribution FORM-AN-04 → Returns FORM-AN-05 |",
    "| 4 | MDR reporting timelines | 2d / 10d / 15d — WI-AN-01 |",
    "| 5 | Effectiveness & closure | FORM-AN-06; FORM-CAPA-01; REC-AN-01 |",
    "",
    "## Record references",
    "",
    "| Code | Document |",
    "|------|----------|",
    "| FORM-AN-01 | FSCA initiation and initial assessment |",
    "| FORM-AN-02 | Field Safety Notice (FSN) template |",
    "| FORM-AN-03 | Advisory notice template |",
    "| FORM-AN-04 | FSN distribution and read receipt |",
    "| FORM-AN-05 | RMA / return / recall tracking |",
    "| FORM-AN-06 | Effectiveness verification checklist |",
    "| WI-AN-01 | EUDAMED / national portal reporting WI |",
    "",
    "## Revision",
    "",
    "| Rev | Date | Description |",
    "|-----|------|-------------|",
    "| 00 | [TBC] | Initial issue |",
  ].join("\n");
}

export function buildCcChangeFlowDiagram(locale: "tr" | "en"): string {
  if (locale === "tr") {
    return [
      "# DIA-CC-01 — Değişiklik Kontrol Süreç Akışı",
      "",
      "> Şema — prosedür metni değildir.",
      "",
      "## Akış şeması (özet)",
      "",
      "| Sıra | Adım | Kayıt / referans |",
      "|------|------|------------------|",
      "| 1 | Değişiklik ihtiyacı tanımlanır | CAPA, tetkik, müşteri, regülasyon |",
      "| 2 | CR açılır ve kaydedilir | FORM-CC-01, LIST-CC-01 |",
      "| 3 | Etki değerlendirmesi | FORM-CC-02 (KYS, tasarım, risk, NB…) |",
      "| 4 | Önemli değişiklik mi? | |",
      "| 4a | ↳ EVET | FORM-CC-03 — MDCG 2020-3 / Art. 120 |",
      "| 4b | ↳ HAYIR | Doğrudan onay dalına |",
      "| 5 | Onay | Kalite Müdürü / tasarım yetkilisi / üst yönetim |",
      "| 6 | NB bildirimi (gerekirse) | PRRC koordinasyonu |",
      "| 7 | Uygulama | SOP-DC revizyon, eğitim |",
      "| 8 | V&V ve CR kapanışı | REC-CC-01 (örnek) |",
      "",
      "## Kayıt referansları",
      "",
      "| Kod | Doküman |",
      "|-----|---------|",
      "| FORM-CC-01 | Değişiklik talebi (CR) |",
      "| FORM-CC-02 | Etki değerlendirme |",
      "| FORM-CC-03 | Önemli değişiklik değerlendirme |",
      "| LIST-CC-01 | Değişiklik kayıt defteri |",
      "| REC-CC-01 | Örnek tamamlanmış CR kaydı |",
    ].join("\n");
  }

  return [
    "# DIA-CC-01 — Change Control Process Flow",
    "",
    "> Diagram — not a procedure.",
    "",
    "## Flow diagram (summary)",
    "",
    "| Step | Action | Record / reference |",
    "|------|--------|---------------------|",
    "| 1 | Define change need | CAPA, audit, customer, regulation |",
    "| 2 | Open and log CR | FORM-CC-01, LIST-CC-01 |",
    "| 3 | Impact assessment | FORM-CC-02 (QMS, design, risk, NB…) |",
    "| 4 | Significant change? | |",
    "| 4a | ↳ YES | FORM-CC-03 — MDCG 2020-3 / Art. 120 |",
    "| 4b | ↳ NO | Proceed to approval |",
    "| 5 | Approval | Quality Manager / design authority / top management |",
    "| 6 | NB notification (if required) | PRRC coordination |",
    "| 7 | Implementation | SOP-DC revision, training |",
    "| 8 | V&V and CR closure | REC-CC-01 (sample) |",
    "",
    "## Record references",
    "",
    "| Code | Document |",
    "|------|----------|",
    "| FORM-CC-01 | Change request (CR) |",
    "| FORM-CC-02 | Impact assessment |",
    "| FORM-CC-03 | Significant change assessment |",
    "| LIST-CC-01 | Change register |",
    "| REC-CC-01 | Sample completed CR record |",
  ].join("\n");
}

const RULE_BASED_DIAGRAM_BY_CODE: Record<string, (locale: "tr" | "en") => string> = {
  "DIA-AN-01": buildAnDecisionFlowDiagram,
  "DIA-CC-01": buildCcChangeFlowDiagram,
};

export function getRuleBasedDiagramContent(
  code: string | null | undefined,
  locale: "tr" | "en",
  meta?: { title?: string; parentProcedureCode?: string | null; clauseRefs?: string | null },
): string | null {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  const builder = RULE_BASED_DIAGRAM_BY_CODE[c];
  if (builder) return builder(locale);

  if (!c.startsWith("DIA-")) return null;
  return buildGenericDiagramContent({
    code: c,
    title: meta?.title ?? c,
    locale,
    parentProcedureCode: meta?.parentProcedureCode,
    clauseRefs: meta?.clauseRefs,
  });
}
