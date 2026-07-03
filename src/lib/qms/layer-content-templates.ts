/** Generic KYS child document bodies by layer (form / WI / list … — not SOP prose). */

import { qmsDocTitle } from "@/lib/i18n/qms-doc-titles";
import type { QmsDocumentLayer } from "./kys-structure";

export interface LayerContentParams {
  code: string;
  title: string;
  locale: "tr" | "en";
  parentProcedureCode?: string | null;
  clauseRefs?: string | null;
}

function displayTitle(params: LayerContentParams): string {
  return qmsDocTitle(params.code, params.title, params.locale);
}

function docMetaTable(params: LayerContentParams): string {
  const tr = params.locale === "tr";
  const parent = params.parentProcedureCode ?? "—";
  const clauses = params.clauseRefs ?? "—";
  if (tr) {
    return [
      "| Alan | Değer |",
      "|------|-------|",
      `| Doküman kodu | ${params.code} |`,
      `| İlgili prosedür | ${parent} |`,
      `| Madde ref | ${clauses} |`,
      "| Revizyon | 00 |",
      "| Tarih | __________ |",
    ].join("\n");
  }
  return [
    "| Field | Value |",
    "|-------|-------|",
    `| Document code | ${params.code} |`,
    `| Related procedure | ${parent} |`,
    `| Clause ref | ${clauses} |`,
    "| Revision | 00 |",
    "| Date | __________ |",
  ].join("\n");
}

function approvalBlock(locale: "tr" | "en"): string {
  if (locale === "tr") {
    return [
      "## Onay",
      "",
      "| Rol | Ad / imza | Tarih |",
      "|-----|-----------|-------|",
      "| Hazırlayan | | |",
      "| İnceleyen | | |",
      "| Onaylayan | | |",
    ].join("\n");
  }
  return [
    "## Approval",
    "",
    "| Role | Name / signature | Date |",
    "|------|------------------|------|",
    "| Prepared by | | |",
    "| Reviewed by | | |",
    "| Approved by | | |",
  ].join("\n");
}

export function buildGenericFormContent(params: LayerContentParams): string {
  const tr = params.locale === "tr";
  const title = displayTitle(params);
  const intro = tr
    ? "> Form şablonu — prosedür metni değildir."
    : "> Form template — not a procedure.";
  const fields = tr
    ? [
        "## Form alanları",
        "",
        "| Alan | Değer |",
        "|------|-------|",
        "| Referans no | __________ |",
        "| Sorumlu | __________ |",
        "| Açıklama / detay | __________ |",
        "| Sonuç / karar | __________ |",
        "",
        "**Ek notlar:** _______________________________________________",
        "",
        "## Örnek (doldurulmuş satır)",
        "",
        "| Alan | Örnek |",
        "|------|-------|",
        "| Referans no | " + params.code.replace(/-/g, "") + "-2026-001 |",
        "| Sorumlu | Kalite Müdürü |",
        "| Açıklama | Prosedür gereği kayıt |",
      ].join("\n")
    : [
        "## Form fields",
        "",
        "| Field | Value |",
        "|-------|-------|",
        "| Reference no | __________ |",
        "| Owner | __________ |",
        "| Description / detail | __________ |",
        "| Result / decision | __________ |",
        "",
        "**Additional notes:** _______________________________________",
        "",
        "## Example (filled row)",
        "",
        "| Field | Example |",
        "|-------|---------|",
        "| Reference no | " + params.code.replace(/-/g, "") + "-2026-001 |",
        "| Owner | Quality Manager |",
        "| Description | Record per procedure |",
      ].join("\n");

  return [
    `# ${params.code} — ${title}`,
    "",
    intro,
    "",
    tr ? "## Form bilgileri" : "## Form information",
    "",
    docMetaTable(params),
    "",
    fields,
    "",
    approvalBlock(params.locale),
  ].join("\n");
}

export function buildGenericInstructionContent(params: LayerContentParams): string {
  const tr = params.locale === "tr";
  const title = displayTitle(params);
  const intro = tr
    ? "> İş talimatı — prosedür (SOP) metni değildir."
    : "> Work instruction — not a procedure (SOP).";
  const steps = tr
    ? [
        "## Adımlar",
        "",
        "1. **Hazırlık** — Gerekli ekipman, doküman ve yetkin personel. Kayıt: __________",
        "2. **Uygulama** — Prosedürde tanımlı adımları sırayla uygula. Sorumlu: __________",
        "3. **Kontrol** — Kabul kriterlerini doğrula. Sonuç: ☐ Uygun ☐ Uygunsuz",
        "4. **Kayıt** — İlgili formu doldur ve sakla (" + (params.parentProcedureCode ?? "SOP") + ").",
        "",
        "## Güvenlik / dikkat",
        "",
        "- Kişisel koruyucu donanım gereksinimleri: __________",
        "- Acil durum: __________",
      ].join("\n")
    : [
        "## Steps",
        "",
        "1. **Preparation** — Equipment, documents, competent personnel. Record: __________",
        "2. **Execution** — Follow procedure steps in order. Owner: __________",
        "3. **Verification** — Check acceptance criteria. Result: ☐ OK ☐ Not OK",
        "4. **Record** — Complete related form and store (" + (params.parentProcedureCode ?? "SOP") + ").",
        "",
        "## Safety / precautions",
        "",
        "- PPE requirements: __________",
        "- Emergency: __________",
      ].join("\n");

  return [
    `# ${params.code} — ${title}`,
    "",
    intro,
    "",
    tr ? "## Talimat bilgileri" : "## Instruction information",
    "",
    docMetaTable(params),
    "",
    steps,
    "",
    approvalBlock(params.locale),
  ].join("\n");
}

export function buildGenericDiagramContent(params: LayerContentParams): string {
  const tr = params.locale === "tr";
  const title = displayTitle(params);
  const intro = tr
    ? "> Şema — prosedür metni değildir. Word dışa aktarımda özet akış tablosu kullanılır."
    : "> Diagram — not a procedure. Word export uses a summary flow table.";
  const flow = tr
    ? [
        "## Akış özeti",
        "",
        "| Sıra | Adım | Sorumlu | Kayıt / form |",
        "|------|------|---------|--------------|",
        "| 1 | Başlangıç / tetikleyici | __________ | __________ |",
        "| 2 | Değerlendirme | __________ | __________ |",
        "| 3 | Karar / onay | __________ | __________ |",
        "| 4 | Uygulama | __________ | __________ |",
        "| 5 | Doğrulama / kapanış | __________ | __________ |",
      ].join("\n")
    : [
        "## Flow summary",
        "",
        "| Step | Activity | Owner | Record / form |",
        "|------|----------|-------|---------------|",
        "| 1 | Trigger / start | __________ | __________ |",
        "| 2 | Assessment | __________ | __________ |",
        "| 3 | Decision / approval | __________ | __________ |",
        "| 4 | Implementation | __________ | __________ |",
        "| 5 | Verification / close | __________ | __________ |",
      ].join("\n");

  return [`# ${params.code} — ${title}`, "", intro, "", flow].join("\n");
}

export function buildGenericListContent(params: LayerContentParams): string {
  const tr = params.locale === "tr";
  const title = displayTitle(params);
  const table = tr
    ? [
        "## Liste",
        "",
        "| Sütun 1 | Sütun 2 | Sütun 3 | Güncelleme | Sorumlu |",
        "|---------|---------|---------|------------|---------|",
        "| | | | __________ | __________ |",
        "| | | | __________ | __________ |",
        "| | | | __________ | __________ |",
      ].join("\n")
    : [
        "## List",
        "",
        "| Column 1 | Column 2 | Column 3 | Last update | Owner |",
        "|----------|----------|----------|-------------|-------|",
        "| | | | __________ | __________ |",
        "| | | | __________ | __________ |",
        "| | | | __________ | __________ |",
      ].join("\n");

  return [
    `# ${params.code} — ${title}`,
    "",
    tr ? "> Liste — prosedür metni değildir." : "> List — not a procedure.",
    "",
    docMetaTable(params),
    "",
    table,
  ].join("\n");
}

export function buildGenericPlanContent(params: LayerContentParams): string {
  const tr = params.locale === "tr";
  const title = displayTitle(params);
  const table = tr
    ? [
        "## Plan aktiviteleri",
        "",
        "| Aktivite | Frekans | Sorumlu | Hedef tarih | Kayıt |",
        "|----------|---------|---------|-------------|-------|",
        "| | | | __________ | __________ |",
        "| | | | __________ | __________ |",
        "| | | | __________ | __________ |",
      ].join("\n")
    : [
        "## Planned activities",
        "",
        "| Activity | Frequency | Owner | Target date | Record |",
        "|----------|-----------|-------|-------------|--------|",
        "| | | | __________ | __________ |",
        "| | | | __________ | __________ |",
        "| | | | __________ | __________ |",
      ].join("\n");

  return [
    `# ${params.code} — ${title}`,
    "",
    tr ? "> Plan — prosedür metni değildir." : "> Plan — not a procedure.",
    "",
    docMetaTable(params),
    "",
    table,
    "",
    approvalBlock(params.locale),
  ].join("\n");
}

export function buildGenericRecordContent(params: LayerContentParams): string {
  const tr = params.locale === "tr";
  const title = displayTitle(params);
  const body = tr
    ? [
        "## Örnek kayıt",
        "",
        "| Alan | Değer |",
        "|------|-------|",
        "| Kayıt no | __________ |",
        "| Tarih | __________ |",
        "| İlgili form | __________ |",
        "| Özet | Dolu örnek kayıt — prosedür gereği arşivlenir |",
      ].join("\n")
    : [
        "## Sample record",
        "",
        "| Field | Value |",
        "|-------|-------|",
        "| Record no | __________ |",
        "| Date | __________ |",
        "| Related form | __________ |",
        "| Summary | Completed example record — archived per procedure |",
      ].join("\n");

  return [
    `# ${params.code} — ${title}`,
    "",
    tr ? "> Kayıt örneği — prosedür metni değildir." : "> Sample record — not a procedure.",
    "",
    docMetaTable(params),
    "",
    body,
  ].join("\n");
}

export function buildGenericJobDescriptionContent(params: LayerContentParams): string {
  const tr = params.locale === "tr";
  const title = displayTitle(params);
  const body = tr
    ? [
        "## Görev tanımı",
        "",
        "**Raporlama:** __________",
        "",
        "**Yetki:** __________",
        "",
        "**Sorumluluklar:**",
        "1. __________",
        "2. __________",
        "3. __________",
        "",
        "**Gerekli yetkinlik / eğitim:** __________",
      ].join("\n")
    : [
        "## Job description",
        "",
        "**Reports to:** __________",
        "",
        "**Authority:** __________",
        "",
        "**Responsibilities:**",
        "1. __________",
        "2. __________",
        "3. __________",
        "",
        "**Required competence / training:** __________",
      ].join("\n");

  return [`# ${params.code} — ${title}`, "", body, "", approvalBlock(params.locale)].join("\n");
}

export function buildGenericAssignmentContent(params: LayerContentParams): string {
  const tr = params.locale === "tr";
  const title = displayTitle(params);
  const body = tr
    ? [
        "## Atama yazısı",
        "",
        "**Atanan kişi:** __________",
        "",
        "**Atama kapsamı:** __________",
        "",
        "**Yetki devri:** __________",
        "",
        "**Geçerlilik:** __________ — __________",
      ].join("\n")
    : [
        "## Appointment letter",
        "",
        "**Appointee:** __________",
        "",
        "**Scope of appointment:** __________",
        "",
        "**Delegated authority:** __________",
        "",
        "**Validity:** __________ — __________",
      ].join("\n");

  return [`# ${params.code} — ${title}`, "", body, "", approvalBlock(params.locale)].join("\n");
}

export function buildGenericSpecificationContent(params: LayerContentParams): string {
  const tr = params.locale === "tr";
  const title = displayTitle(params);
  const table = tr
    ? [
        "## Gereklilikler",
        "",
        "| Madde | Gereklilik | Kabul limiti | Referans |",
        "|-------|------------|--------------|----------|",
        "| 1 | __________ | __________ | __________ |",
        "| 2 | __________ | __________ | __________ |",
      ].join("\n")
    : [
        "## Requirements",
        "",
        "| Item | Requirement | Acceptance limit | Reference |",
        "|------|-------------|------------------|-----------|",
        "| 1 | __________ | __________ | __________ |",
        "| 2 | __________ | __________ | __________ |",
      ].join("\n");

  return [`# ${params.code} — ${title}`, "", table, "", approvalBlock(params.locale)].join("\n");
}

export function buildGenericOtherContent(params: LayerContentParams): string {
  const tr = params.locale === "tr";
  const title = displayTitle(params);
  const body = tr
    ? "Kontrollü ek doküman içeriği — prosedürle tutarlı politika veya destek metni."
    : "Controlled supplementary document — policy or support text aligned with the procedure.";
  return [`# ${params.code} — ${title}`, "", body].join("\n\n");
}

export function buildLayerContent(layer: QmsDocumentLayer, params: LayerContentParams): string {
  switch (layer) {
    case "FORM":
      return buildGenericFormContent(params);
    case "INSTRUCTION":
      return buildGenericInstructionContent(params);
    case "DIAGRAM":
      return buildGenericDiagramContent(params);
    case "LIST":
      return buildGenericListContent(params);
    case "PLAN":
      return buildGenericPlanContent(params);
    case "RECORD":
      return buildGenericRecordContent(params);
    case "JOB_DESCRIPTION":
      return buildGenericJobDescriptionContent(params);
    case "ASSIGNMENT":
      return buildGenericAssignmentContent(params);
    case "SPECIFICATION":
      return buildGenericSpecificationContent(params);
    case "OTHER":
      return buildGenericOtherContent(params);
    default:
      return buildGenericOtherContent(params);
  }
}
