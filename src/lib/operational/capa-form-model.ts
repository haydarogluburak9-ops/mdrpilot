import { buildFormCapa01 } from "@/lib/qms/form-templates";
import {
  checkboxChecked,
  parseMarkdownFormFields,
  pickField,
} from "@/lib/qms/form-content-parser";

export interface CapaFormData {
  formDate: string;
  referenceNo: string;
  capaNo: string;
  sourceInternalAudit: boolean;
  sourceComplaint: boolean;
  sourceProduction: boolean;
  sourceSupplier: boolean;
  sourcePms: boolean;
  sourceOther: boolean;
  sourceRef: string;
  eventDate: string;
  description: string;
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  owner: string;
  targetDate: string;
  effActionCompleted: boolean | null;
  effNoRecurrence: boolean | null;
  effRecordsUpdated: boolean | null;
  closureApproval: string;
  closureDate: string;
}

export function emptyCapaFormData(): CapaFormData {
  return {
    formDate: "",
    referenceNo: "",
    capaNo: "",
    sourceInternalAudit: false,
    sourceComplaint: false,
    sourceProduction: false,
    sourceSupplier: false,
    sourcePms: false,
    sourceOther: false,
    sourceRef: "",
    eventDate: "",
    description: "",
    rootCause: "",
    correctiveAction: "",
    preventiveAction: "",
    owner: "",
    targetDate: "",
    effActionCompleted: null,
    effNoRecurrence: null,
    effRecordsUpdated: null,
    closureApproval: "",
    closureDate: "",
  };
}

function parseEffRow(line: string): boolean | null {
  const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  const yesCol = parts[parts.length - 2] ?? "";
  const noCol = parts[parts.length - 1] ?? "";
  if (/☑|✓|✔|\[x\]/i.test(yesCol)) return true;
  if (/☑|✓|✔|\[x\]/i.test(noCol)) return false;
  return null;
}

function parseClosure(content: string, locale: "tr" | "en"): { approval: string; date: string } {
  const pattern =
    locale === "tr"
      ? /\*\*Kapanış onayı:\*\*\s*(.*?)\s*\*\*Tarih:\*\*\s*(.*?)$/m
      : /\*\*Closure approval:\*\*\s*(.*?)\s*\*\*Date:\*\*\s*(.*?)$/m;
  const m = content.match(pattern);
  if (!m) return { approval: "", date: "" };
  return {
    approval: m[1].replace(/_+/g, "").trim(),
    date: m[2].replace(/_+/g, "").trim(),
  };
}

export function parseCapaFormMarkdown(content: string, locale: "tr" | "en"): CapaFormData {
  const data = emptyCapaFormData();
  if (!content.trim()) {
    return parseCapaFormMarkdown(buildFormCapa01(locale), locale);
  }

  const fields = parseMarkdownFormFields(content);
  const sourceRow = pickField(fields, "kaynak", "source") ?? "";

  data.formDate = pickField(fields, "tarih", "date") ?? "";
  data.referenceNo = pickField(fields, "referans no", "reference no") ?? "";
  data.capaNo = pickField(fields, "capa no", "capa no.") ?? "";
  data.sourceInternalAudit = checkboxChecked(sourceRow, locale === "tr" ? "iç denetim" : "internal audit");
  data.sourceComplaint = checkboxChecked(sourceRow, locale === "tr" ? "şikâyet" : "complaint");
  data.sourceProduction = checkboxChecked(sourceRow, locale === "tr" ? "üretim" : "production");
  data.sourceSupplier = checkboxChecked(sourceRow, locale === "tr" ? "tedarikçi" : "supplier");
  data.sourcePms = checkboxChecked(sourceRow, "pms");
  data.sourceOther = checkboxChecked(sourceRow, locale === "tr" ? "diğer" : "other");
  data.sourceRef = pickField(fields, "kaynak ref", "source ref") ?? "";
  data.eventDate = pickField(fields, "tarih", "date") ?? data.formDate;
  data.description = pickField(fields, "açıklama", "description") ?? "";
  data.rootCause = pickField(fields, "kök neden analizi", "root cause analysis") ?? "";
  data.correctiveAction = pickField(fields, "düzeltici faaliyet", "corrective action") ?? "";
  data.preventiveAction = pickField(fields, "önleyici faaliyet", "preventive action") ?? "";
  data.owner = pickField(fields, "sorumlu", "owner") ?? "";
  data.targetDate = pickField(fields, "hedef tarih", "target date") ?? "";

  for (const line of content.split("\n")) {
    const lower = line.toLowerCase();
    if (locale === "tr") {
      if (lower.includes("aksiyon tamamlandı")) data.effActionCompleted = parseEffRow(line);
      if (lower.includes("tekrar oluşmadı")) data.effNoRecurrence = parseEffRow(line);
      if (lower.includes("kayıtlar güncellendi")) data.effRecordsUpdated = parseEffRow(line);
    } else {
      if (lower.includes("action completed")) data.effActionCompleted = parseEffRow(line);
      if (lower.includes("no recurrence")) data.effNoRecurrence = parseEffRow(line);
      if (lower.includes("records updated")) data.effRecordsUpdated = parseEffRow(line);
    }
  }

  const closure = parseClosure(content, locale);
  data.closureApproval = closure.approval;
  data.closureDate = closure.date;

  return data;
}

function fmtCell(value: string): string {
  const v = value.trim();
  return v || "__________";
}

function chk(label: string, checked: boolean): string {
  return `${checked ? "☑" : "☐"} ${label}`;
}

function effRow(label: string, value: boolean | null): string {
  const yesMark = value === true ? "☑" : "☐";
  const noMark = value === false ? "☑" : "☐";
  return `| ${label} | | ${yesMark} | ${noMark} |`;
}

export function serializeCapaFormMarkdown(data: CapaFormData, locale: "tr" | "en"): string {
  const template = buildFormCapa01(locale);
  const headerEnd = template.search(/^##\s+(Uygunsuzluk|Nonconformity)/m);
  const header = headerEnd > 0 ? template.slice(0, headerEnd).trim() : "";

  const approvalIdx = template.search(/^##\s+(Onay|Approval)/m);
  const approval = approvalIdx > 0 ? template.slice(approvalIdx).trim() : "";

  const headerLines = header.split("\n");
  const filledHeader = headerLines.map((line) => {
    if (locale === "tr") {
      if (line.includes("| Tarih |")) return `| Tarih | ${fmtCell(data.formDate)} |`;
      if (line.includes("| Referans no |")) return `| Referans no | ${fmtCell(data.referenceNo)} |`;
    } else {
      if (line.includes("| Date |") && line.includes("Form information")) return line;
      if (line.match(/^\| Date \|/)) return `| Date | ${fmtCell(data.formDate)} |`;
      if (line.includes("| Reference no |")) return `| Reference no | ${fmtCell(data.referenceNo)} |`;
    }
    return line;
  });

  const sourceTr = [
    chk("İç denetim", data.sourceInternalAudit),
    chk("Şikâyet", data.sourceComplaint),
    chk("Üretim", data.sourceProduction),
    chk("Tedarikçi", data.sourceSupplier),
    chk("PMS", data.sourcePms),
    chk("Diğer", data.sourceOther),
  ].join(" ");

  const sourceEn = [
    chk("Internal audit", data.sourceInternalAudit),
    chk("Complaint", data.sourceComplaint),
    chk("Production", data.sourceProduction),
    chk("Supplier", data.sourceSupplier),
    chk("PMS", data.sourcePms),
    chk("Other", data.sourceOther),
  ].join(" ");

  const body =
    locale === "tr"
      ? [
          "## Uygunsuzluk / olay",
          "",
          "| Alan | Değer |",
          "|------|-------|",
          `| CAPA no | ${fmtCell(data.capaNo)} |`,
          `| Kaynak | ${sourceTr} |`,
          `| Kaynak ref | ${fmtCell(data.sourceRef)} |`,
          `| Tarih | ${fmtCell(data.eventDate)} |`,
          `| Açıklama | ${fmtCell(data.description)} |`,
          "",
          "## Analiz ve aksiyon",
          "",
          "| Alan | Değer |",
          "|------|-------|",
          `| Kök neden analizi | ${fmtCell(data.rootCause)} |`,
          `| Düzeltici faaliyet | ${fmtCell(data.correctiveAction)} |`,
          `| Önleyici faaliyet | ${fmtCell(data.preventiveAction)} |`,
          `| Sorumlu | ${fmtCell(data.owner)} |`,
          `| Hedef tarih | ${fmtCell(data.targetDate)} |`,
          "",
          "## Etkinlik doğrulama",
          "",
          "| Doğrulama yöntemi | Sonuç | EVET | HAYIR |",
          "|-------------------|-------|------|-------|",
          effRow("Aksiyon tamamlandı", data.effActionCompleted),
          effRow("Tekrar oluşmadı", data.effNoRecurrence),
          effRow("Kayıtlar güncellendi", data.effRecordsUpdated),
          "",
          `**Kapanış onayı:** ${fmtCell(data.closureApproval)}  **Tarih:** ${fmtCell(data.closureDate)}`,
        ].join("\n")
      : [
          "## Nonconformity / event",
          "",
          "| Field | Value |",
          "|-------|-------|",
          `| CAPA no | ${fmtCell(data.capaNo)} |`,
          `| Source | ${sourceEn} |`,
          `| Source ref | ${fmtCell(data.sourceRef)} |`,
          `| Date | ${fmtCell(data.eventDate)} |`,
          `| Description | ${fmtCell(data.description)} |`,
          "",
          "## Analysis and action",
          "",
          "| Field | Value |",
          "|-------|-------|",
          `| Root cause analysis | ${fmtCell(data.rootCause)} |`,
          `| Corrective action | ${fmtCell(data.correctiveAction)} |`,
          `| Preventive action | ${fmtCell(data.preventiveAction)} |`,
          `| Owner | ${fmtCell(data.owner)} |`,
          `| Target date | ${fmtCell(data.targetDate)} |`,
          "",
          "## Effectiveness verification",
          "",
          "| Verification method | Result | YES | NO |",
          "|---------------------|--------|-----|-----|",
          effRow("Action completed", data.effActionCompleted),
          effRow("No recurrence", data.effNoRecurrence),
          effRow("Records updated", data.effRecordsUpdated),
          "",
          `**Closure approval:** ${fmtCell(data.closureApproval)}  **Date:** ${fmtCell(data.closureDate)}`,
        ].join("\n");

  return [filledHeader.join("\n"), body, approval].filter(Boolean).join("\n\n");
}
