import { buildFormNcp01 } from "@/lib/qms/form-templates";
import {
  checkboxChecked,
  parseMarkdownFormFields,
  pickField,
} from "@/lib/qms/form-content-parser";

export interface NcpFormData {
  recordNo: string;
  productLot: string;
  quantity: string;
  ncDescription: string;
  segregationDone: boolean | null;
  segregationNote: string;
  decisionRepair: boolean;
  decisionScrap: boolean;
  decisionReturn: boolean;
  decisionRework: boolean;
  capaNeeded: boolean | null;
  capaNeededNote: string;
  capaRef: string;
  capaLinkedId: string;
}

export function emptyNcpFormData(): NcpFormData {
  return {
    recordNo: "",
    productLot: "",
    quantity: "",
    ncDescription: "",
    segregationDone: null,
    segregationNote: "",
    decisionRepair: false,
    decisionScrap: false,
    decisionReturn: false,
    decisionRework: false,
    capaNeeded: null,
    capaNeededNote: "",
    capaRef: "",
    capaLinkedId: "",
  };
}

function parseYesNoNoteRow(line: string): { value: boolean | null; note: string } {
  const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return { value: null, note: "" };
  const yesCol = parts[1] ?? "";
  const noCol = parts[2] ?? "";
  const note = parts[3] ?? "";
  if (/☑|✓|✔|\[x\]/i.test(yesCol)) return { value: true, note };
  if (/☑|✓|✔|\[x\]/i.test(noCol)) return { value: false, note };
  return { value: null, note: note.replace(/_+/g, "").trim() };
}

function fmtCell(value: string): string {
  const v = value.trim();
  return v || "__________";
}

function chk(label: string, checked: boolean): string {
  return `${checked ? "☑" : "☐"} ${label}`;
}

function assessRow(label: string, value: boolean | null, note: string): string {
  const yesMark = value === true ? "☑" : "☐";
  const noMark = value === false ? "☑" : "☐";
  return `| ${label} | ${yesMark} | ${noMark} | ${note || ""} |`;
}

export function parseNcpFormMarkdown(content: string, locale: "tr" | "en"): NcpFormData {
  if (!content.trim()) {
    return parseNcpFormMarkdown(buildFormNcp01(locale), locale);
  }

  const data = emptyNcpFormData();
  const fields = parseMarkdownFormFields(content);

  data.recordNo =
    pickField(fields, "kayıt no", "record no", "ncp no", "ncp no.") ?? "";
  data.productLot = pickField(fields, "ürün / lot", "product / lot") ?? "";
  data.quantity = pickField(fields, "adet", "quantity") ?? "";
  data.ncDescription =
    pickField(fields, "uygunsuzluk tanımı", "nc description", "uygunsuzluk açıklaması") ?? "";

  const segregationRow =
    pickField(fields, "ayırma / karantina", "segregation / quarantine") ?? "";
  const doneLabel = locale === "tr" ? "yapıldı" : "done";
  const notDoneLabel = locale === "tr" ? "yapılmadı" : "not done";
  if (checkboxChecked(segregationRow, doneLabel)) {
    data.segregationDone = true;
  } else if (checkboxChecked(segregationRow, notDoneLabel)) {
    data.segregationDone = false;
  }
  data.segregationNote =
    pickField(
      fields,
      "ayırma açıklaması",
      "segregation note",
      "açıklayınız",
      "explain",
    ) ?? "";

  const decisionRow = pickField(fields, "karar", "decision") ?? "";
  data.decisionRepair = checkboxChecked(decisionRow, locale === "tr" ? "onarım" : "repair");
  data.decisionScrap = checkboxChecked(decisionRow, locale === "tr" ? "imha" : "scrap");
  data.decisionReturn = checkboxChecked(decisionRow, locale === "tr" ? "iade" : "return");
  data.decisionRework = checkboxChecked(
    decisionRow,
    locale === "tr" ? "yeniden işleme" : "rework",
  );

  for (const line of content.split("\n")) {
    const lower = line.toLowerCase();
    if (locale === "tr" && lower.includes("capa gerekli")) {
      const row = parseYesNoNoteRow(line);
      data.capaNeeded = row.value;
      data.capaNeededNote = row.note;
    }
    if (locale === "en" && lower.includes("capa needed")) {
      const row = parseYesNoNoteRow(line);
      data.capaNeeded = row.value;
      data.capaNeededNote = row.note;
    }
  }

  data.capaRef = pickField(fields, "capa ref", "capa no", "capa no.") ?? "";
  data.capaLinkedId = pickField(fields, "capa id", "capa linked id") ?? "";

  return data;
}

export function serializeNcpFormMarkdown(data: NcpFormData, locale: "tr" | "en"): string {
  const template = buildFormNcp01(locale);
  const approvalIdx = template.search(/^##\s+(Onay|Approval)/m);
  const approval = approvalIdx > 0 ? template.slice(approvalIdx).trim() : "";

  const segregationVal =
    locale === "tr"
      ? `${chk("Yapıldı", data.segregationDone === true)} ${chk("Yapılmadı", data.segregationDone === false)}`
      : `${chk("Done", data.segregationDone === true)} ${chk("Not done", data.segregationDone === false)}`;

  const decisionTr = [
    chk("Onarım", data.decisionRepair),
    chk("İmha", data.decisionScrap),
    chk("İade", data.decisionReturn),
    chk("Yeniden işleme", data.decisionRework),
  ].join(" ");

  const decisionEn = [
    chk("Repair", data.decisionRepair),
    chk("Scrap", data.decisionScrap),
    chk("Return", data.decisionReturn),
    chk("Rework", data.decisionRework),
  ].join(" ");

  const body =
    locale === "tr"
      ? [
          "## Uygunsuzluk",
          "",
          "| Alan | Değer |",
          "|------|-------|",
          `| Kayıt no | ${fmtCell(data.recordNo)} |`,
          `| Ürün / lot | ${fmtCell(data.productLot)} |`,
          `| Adet | ${fmtCell(data.quantity)} |`,
          `| Uygunsuzluk tanımı | ${fmtCell(data.ncDescription)} |`,
          `| Ayırma / karantina | ${segregationVal} |`,
          `| Ayırma açıklaması | ${fmtCell(data.segregationNote)} |`,
          `| Karar | ${decisionTr} |`,
          "",
          "## CAPA değerlendirmesi",
          "",
          "| Soru | EVET | HAYIR | Açıklama |",
          "|------|------|-------|----------|",
          assessRow("CAPA gerekli mi? (SOP-CAPA)", data.capaNeeded, data.capaNeededNote),
          "",
          "| Alan | Değer |",
          "|------|-------|",
          `| CAPA ref | ${fmtCell(data.capaRef)} |`,
          `| CAPA id | ${fmtCell(data.capaLinkedId)} |`,
        ].join("\n")
      : [
          "## Nonconformity",
          "",
          "| Field | Value |",
          "|-------|-------|",
          `| Record no | ${fmtCell(data.recordNo)} |`,
          `| Product / lot | ${fmtCell(data.productLot)} |`,
          `| Quantity | ${fmtCell(data.quantity)} |`,
          `| NC description | ${fmtCell(data.ncDescription)} |`,
          `| Segregation / quarantine | ${segregationVal} |`,
          `| Segregation note | ${fmtCell(data.segregationNote)} |`,
          `| Decision | ${decisionEn} |`,
          "",
          "## CAPA assessment",
          "",
          "| Question | YES | NO | Note |",
          "|----------|-----|-----|------|",
          assessRow("CAPA needed? (SOP-CAPA)", data.capaNeeded, data.capaNeededNote),
          "",
          "| Field | Value |",
          "|-------|-------|",
          `| CAPA ref | ${fmtCell(data.capaRef)} |`,
          `| CAPA id | ${fmtCell(data.capaLinkedId)} |`,
        ].join("\n");

  const headerEnd = template.search(/^##\s+(Uygunsuzluk|Nonconformity)/m);
  const header = headerEnd > 0 ? template.slice(0, headerEnd).trim() : "";

  return [header, body, approval].filter(Boolean).join("\n\n");
}
