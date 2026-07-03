import { buildFormCh01, buildFormCh02 } from "@/lib/qms/form-templates";
import {
  checkboxChecked,
  parseMarkdownFormFields,
  pickField,
} from "@/lib/qms/form-content-parser";

export interface ComplaintCh01FormData {
  formDate: string;
  referenceNo: string;
  complaintNo: string;
  receivedDate: string;
  sourceCustomer: boolean;
  sourceDistributor: boolean;
  sourceHealthcare: boolean;
  sourcePms: boolean;
  sourceInternal: boolean;
  sourceOther: boolean;
  customerInstitution: string;
  contact: string;
  productModel: string;
  lotSerial: string;
  udiDi: string;
  description: string;
  safetyRisk: boolean | null;
  safetyRiskNote: string;
  vigilanceNeeded: boolean | null;
  vigilanceNote: string;
  fscaNeeded: boolean | null;
  fscaNote: string;
  capaNeeded: boolean | null;
  capaNeededNote: string;
  assessedBy: string;
  assessedDate: string;
  customerResponseDate: string;
  statusOpen: boolean;
  statusClosed: boolean;
}

export type EffectivenessVerified = "yes" | "no" | "pending" | null;

export interface ComplaintCh02FormData {
  formDate: string;
  referenceNo: string;
  complaintNo: string;
  assessmentDate: string;
  productLot: string;
  capaNo: string;
  capaOpenedDate: string;
  capaStatusOpen: boolean;
  capaStatusClosed: boolean;
  capaOwner: string;
  rootCauseSummary: string;
  actionSummary: string;
  capaTargetDate: string;
  effectivenessVerified: EffectivenessVerified;
  complaintStatusMonitoring: boolean;
  complaintStatusClosed: boolean;
  customerNotificationDate: string;
}

export function emptyComplaintCh01FormData(): ComplaintCh01FormData {
  return {
    formDate: "",
    referenceNo: "",
    complaintNo: "",
    receivedDate: "",
    sourceCustomer: false,
    sourceDistributor: false,
    sourceHealthcare: false,
    sourcePms: false,
    sourceInternal: false,
    sourceOther: false,
    customerInstitution: "",
    contact: "",
    productModel: "",
    lotSerial: "",
    udiDi: "",
    description: "",
    safetyRisk: null,
    safetyRiskNote: "",
    vigilanceNeeded: null,
    vigilanceNote: "",
    fscaNeeded: null,
    fscaNote: "",
    capaNeeded: null,
    capaNeededNote: "",
    assessedBy: "",
    assessedDate: "",
    customerResponseDate: "",
    statusOpen: false,
    statusClosed: false,
  };
}

export function emptyComplaintCh02FormData(): ComplaintCh02FormData {
  return {
    formDate: "",
    referenceNo: "",
    complaintNo: "",
    assessmentDate: "",
    productLot: "",
    capaNo: "",
    capaOpenedDate: "",
    capaStatusOpen: false,
    capaStatusClosed: false,
    capaOwner: "",
    rootCauseSummary: "",
    actionSummary: "",
    capaTargetDate: "",
    effectivenessVerified: null,
    complaintStatusMonitoring: false,
    complaintStatusClosed: false,
    customerNotificationDate: "",
  };
}

function sectionSlice(content: string, startRe: RegExp, endRe?: RegExp): string {
  const match = content.match(startRe);
  if (!match || match.index == null) return "";
  const start = match.index + match[0].length;
  const rest = content.slice(start);
  if (!endRe) return rest;
  const end = rest.search(endRe);
  return end >= 0 ? rest.slice(0, end) : rest;
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

function parseAssessed(content: string, locale: "tr" | "en"): { by: string; date: string } {
  const pattern =
    locale === "tr"
      ? /\*\*Değerlendiren:\*\*\s*(.*?)\s*\*\*Tarih:\*\*\s*(.*?)$/m
      : /\*\*Assessed by:\*\*\s*(.*?)\s*\*\*Date:\*\*\s*(.*?)$/m;
  const m = content.match(pattern);
  if (!m) return { by: "", date: "" };
  return {
    by: m[1].replace(/_+/g, "").trim(),
    date: m[2].replace(/_+/g, "").trim(),
  };
}

function parseEffectivenessVerified(value: string, locale: "tr" | "en"): EffectivenessVerified {
  if (checkboxChecked(value, locale === "tr" ? "evet" : "yes")) return "yes";
  if (checkboxChecked(value, locale === "tr" ? "hayır" : "no")) return "no";
  if (checkboxChecked(value, locale === "tr" ? "bekliyor" : "pending")) return "pending";
  return null;
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

export function parseComplaintCh01Markdown(content: string, locale: "tr" | "en"): ComplaintCh01FormData {
  if (!content.trim()) {
    return parseComplaintCh01Markdown(buildFormCh01(locale), locale);
  }

  const data = emptyComplaintCh01FormData();
  const infoSection = sectionSlice(
    content,
    locale === "tr" ? /^##\s+Form bilgileri/m : /^##\s+Form information/m,
    /^##\s+/m,
  );
  const infoFields = parseMarkdownFormFields(infoSection);
  data.formDate = pickField(infoFields, "tarih", "date") ?? "";
  data.referenceNo = pickField(infoFields, "referans no", "reference no") ?? "";

  const complaintSection = sectionSlice(
    content,
    locale === "tr" ? /^##\s+Şikâyet bilgileri/m : /^##\s+Complaint information/m,
    /^##\s+/m,
  );
  const complaintFields = parseMarkdownFormFields(complaintSection);
  const sourceRow = pickField(complaintFields, "kaynak", "source") ?? "";

  data.complaintNo = pickField(complaintFields, "şikâyet no", "complaint no") ?? "";
  data.receivedDate = pickField(complaintFields, "alım tarihi", "received date") ?? "";
  data.sourceCustomer = checkboxChecked(sourceRow, locale === "tr" ? "müşteri" : "customer");
  data.sourceDistributor = checkboxChecked(sourceRow, locale === "tr" ? "distribütör" : "distributor");
  data.sourceHealthcare = checkboxChecked(
    sourceRow,
    locale === "tr" ? "sağlık kurumu" : "healthcare",
  );
  data.sourcePms = checkboxChecked(sourceRow, "pms");
  data.sourceInternal = checkboxChecked(sourceRow, locale === "tr" ? "iç" : "internal");
  data.sourceOther = checkboxChecked(sourceRow, locale === "tr" ? "diğer" : "other");
  data.customerInstitution =
    pickField(complaintFields, "müşteri / kurum", "customer / institution") ?? "";
  data.contact = pickField(complaintFields, "iletişim", "contact") ?? "";
  data.productModel = pickField(complaintFields, "ürün / model", "product / model") ?? "";
  data.lotSerial = pickField(complaintFields, "lot / seri no", "lot / serial no") ?? "";
  data.udiDi = pickField(complaintFields, "udi-di", "udi-di (if applicable)") ?? "";
  data.description = pickField(complaintFields, "şikâyet açıklaması", "description") ?? "";

  const assessSection = sectionSlice(
    content,
    locale === "tr" ? /^##\s+İlk değerlendirme/m : /^##\s+Initial assessment/m,
    /^##\s+|^>/m,
  );

  for (const line of assessSection.split("\n")) {
    const lower = line.toLowerCase();
    if (locale === "tr") {
      if (lower.includes("emniyet riski")) {
        const row = parseYesNoNoteRow(line);
        data.safetyRisk = row.value;
        data.safetyRiskNote = row.note;
      }
      if (lower.includes("vigilans")) {
        const row = parseYesNoNoteRow(line);
        data.vigilanceNeeded = row.value;
        data.vigilanceNote = row.note;
      }
      if (lower.includes("fsca")) {
        const row = parseYesNoNoteRow(line);
        data.fscaNeeded = row.value;
        data.fscaNote = row.note;
      }
      if (lower.includes("capa gerekli")) {
        const row = parseYesNoNoteRow(line);
        data.capaNeeded = row.value;
        data.capaNeededNote = row.note;
      }
    } else {
      if (lower.includes("safety risk")) {
        const row = parseYesNoNoteRow(line);
        data.safetyRisk = row.value;
        data.safetyRiskNote = row.note;
      }
      if (lower.includes("vigilance")) {
        const row = parseYesNoNoteRow(line);
        data.vigilanceNeeded = row.value;
        data.vigilanceNote = row.note;
      }
      if (lower.includes("fsca")) {
        const row = parseYesNoNoteRow(line);
        data.fscaNeeded = row.value;
        data.fscaNote = row.note;
      }
      if (lower.includes("capa needed")) {
        const row = parseYesNoNoteRow(line);
        data.capaNeeded = row.value;
        data.capaNeededNote = row.note;
      }
    }
  }

  const assessed = parseAssessed(content, locale);
  data.assessedBy = assessed.by;
  data.assessedDate = assessed.date;

  const closureFields = parseMarkdownFormFields(content);
  data.customerResponseDate =
    pickField(closureFields, "müşteri yanıtı tarihi", "customer response date") ?? "";
  const statusRow =
    pickField(closureFields, "durum", "status") ??
    Object.entries(closureFields).find(([k]) => k === "durum" || k === "status")?.[1] ??
    "";
  if (statusRow) {
    data.statusOpen = checkboxChecked(statusRow, locale === "tr" ? "açık" : "open");
    data.statusClosed = checkboxChecked(statusRow, locale === "tr" ? "kapat" : "closed");
  }

  return data;
}

export function parseComplaintCh02Markdown(content: string, locale: "tr" | "en"): ComplaintCh02FormData {
  if (!content.trim()) {
    return parseComplaintCh02Markdown(buildFormCh02(locale), locale);
  }

  const data = emptyComplaintCh02FormData();
  const infoSection = sectionSlice(
    content,
    locale === "tr" ? /^##\s+Form bilgileri/m : /^##\s+Form information/m,
    /^##\s+/m,
  );
  const infoFields = parseMarkdownFormFields(infoSection);
  data.formDate = pickField(infoFields, "tarih", "date") ?? "";
  data.referenceNo = pickField(infoFields, "referans no", "reference no") ?? "";

  const fields = parseMarkdownFormFields(content);
  data.complaintNo =
    pickField(
      fields,
      "şikâyet no form-ch-01",
      "complaint no form-ch-01",
      "şikâyet no",
      "complaint no",
    ) ?? "";
  data.assessmentDate =
    pickField(fields, "şikâyet değerlendirme tarihi", "complaint assessment date") ?? "";
  data.productLot = pickField(fields, "ürün / lot", "product / lot") ?? "";
  data.capaNo = pickField(fields, "capa no", "capa no.") ?? "";
  data.capaOpenedDate = pickField(fields, "capa açılış tarihi", "capa opened date") ?? "";

  const capaStatusRow = pickField(fields, "capa durumu", "capa status") ?? "";
  data.capaStatusOpen = checkboxChecked(capaStatusRow, locale === "tr" ? "açık" : "open");
  data.capaStatusClosed = checkboxChecked(capaStatusRow, locale === "tr" ? "kapalı" : "closed");

  data.capaOwner = pickField(fields, "capa sorumlusu", "capa owner") ?? "";
  data.rootCauseSummary = pickField(fields, "kök neden özeti", "root cause summary") ?? "";
  data.actionSummary =
    pickField(
      fields,
      "düzeltici / önleyici aksiyon özeti",
      "corrective / preventive action summary",
    ) ?? "";
  data.capaTargetDate = pickField(fields, "capa hedef tarih", "capa target date") ?? "";

  const effRow =
    pickField(fields, "etkinlik doğrulandı mı?", "effectiveness verified?") ?? "";
  data.effectivenessVerified = parseEffectivenessVerified(effRow, locale);

  const complaintStatusRow =
    pickField(fields, "şikâyet durumu", "complaint status") ?? "";
  data.complaintStatusMonitoring = checkboxChecked(
    complaintStatusRow,
    locale === "tr" ? "izlemede" : "monitoring",
  );
  data.complaintStatusClosed = checkboxChecked(
    complaintStatusRow,
    locale === "tr" ? "kapat" : "closed",
  );

  data.customerNotificationDate =
    pickField(fields, "müşteri bilgilendirme tarihi", "customer notification date") ?? "";

  return data;
}

function effectivenessCell(value: EffectivenessVerified, locale: "tr" | "en"): string {
  const yes = locale === "tr" ? "Evet" : "Yes";
  const no = locale === "tr" ? "Hayır" : "No";
  const pending = locale === "tr" ? "Bekliyor" : "Pending";
  return [
    chk(yes, value === "yes"),
    chk(no, value === "no"),
    chk(pending, value === "pending"),
  ].join(" ");
}

function extractCh01Hints(template: string, locale: "tr" | "en"): string {
  const assessIdx = template.search(
    locale === "tr" ? /^##\s+İlk değerlendirme/m : /^##\s+Initial assessment/m,
  );
  if (assessIdx < 0) return "";
  const afterAssess = template.slice(assessIdx);
  const closureIdx = afterAssess.search(locale === "tr" ? /^##\s+Kapanış/m : /^##\s+Closure/m);
  const section = closureIdx >= 0 ? afterAssess.slice(0, closureIdx) : afterAssess;
  return section
    .split("\n")
    .filter((l) => l.startsWith(">"))
    .join("\n");
}

export function serializeComplaintCh01Markdown(data: ComplaintCh01FormData, locale: "tr" | "en"): string {
  const template = buildFormCh01(locale);
  const headerEnd = template.search(locale === "tr" ? /^##\s+Şikâyet bilgileri/m : /^##\s+Complaint information/m);
  const header = headerEnd > 0 ? template.slice(0, headerEnd).trim() : "";

  const approvalIdx = template.search(/^##\s+(Onay|Approval)/m);
  const approval = approvalIdx > 0 ? template.slice(approvalIdx).trim() : "";

  const hintBlock = extractCh01Hints(template, locale);

  const headerLines = header.split("\n");
  const filledHeader = headerLines.map((line) => {
    if (locale === "tr") {
      if (line.includes("| Tarih |")) return `| Tarih | ${fmtCell(data.formDate)} |`;
      if (line.includes("| Referans no |")) return `| Referans no | ${fmtCell(data.referenceNo)} |`;
    } else {
      if (line.match(/^\| Date \|/)) return `| Date | ${fmtCell(data.formDate)} |`;
      if (line.includes("| Reference no |")) return `| Reference no | ${fmtCell(data.referenceNo)} |`;
    }
    return line;
  });

  const sourceTr = [
    chk("Müşteri", data.sourceCustomer),
    chk("Distribütör", data.sourceDistributor),
    chk("Sağlık kurumu", data.sourceHealthcare),
    chk("PMS", data.sourcePms),
    chk("İç", data.sourceInternal),
    chk("Diğer", data.sourceOther),
  ].join(" ");

  const sourceEn = [
    chk("Customer", data.sourceCustomer),
    chk("Distributor", data.sourceDistributor),
    chk("Healthcare", data.sourceHealthcare),
    chk("PMS", data.sourcePms),
    chk("Internal", data.sourceInternal),
    chk("Other", data.sourceOther),
  ].join(" ");

  const statusTr = [chk("Açık", data.statusOpen), chk("Kapatıldı", data.statusClosed)].join(" ");
  const statusEn = [chk("Open", data.statusOpen), chk("Closed", data.statusClosed)].join(" ");

  const body =
    locale === "tr"
      ? [
          "## Şikâyet bilgileri",
          "",
          "| Alan | Değer |",
          "|------|-------|",
          `| Şikâyet no | ${fmtCell(data.complaintNo)} |`,
          `| Alım tarihi | ${fmtCell(data.receivedDate)} |`,
          `| Kaynak | ${sourceTr} |`,
          `| Müşteri / kurum | ${fmtCell(data.customerInstitution)} |`,
          `| İletişim | ${fmtCell(data.contact)} |`,
          `| Ürün / model | ${fmtCell(data.productModel)} |`,
          `| Lot / seri no | ${fmtCell(data.lotSerial)} |`,
          `| UDI-DI (varsa) | ${fmtCell(data.udiDi)} |`,
          `| Şikâyet açıklaması | ${fmtCell(data.description)} |`,
          "",
          "## İlk değerlendirme",
          "",
          "| Soru | EVET | HAYIR | Not |",
          "|------|------|-------|-----|",
          assessRow("Hasta / kullanıcı emniyet riski var mı?", data.safetyRisk, data.safetyRiskNote),
          assessRow("Vigilans bildirimi gerekli mi? (SOP-VG)", data.vigilanceNeeded, data.vigilanceNote),
          assessRow("FSCA / danışma gerekli mi? (SOP-AN)", data.fscaNeeded, data.fscaNote),
          assessRow("CAPA gerekli mi? (SOP-CAPA)", data.capaNeeded, data.capaNeededNote),
          "",
          `**Değerlendiren:** ${fmtCell(data.assessedBy)}  **Tarih:** ${fmtCell(data.assessedDate)}`,
          "",
          hintBlock,
          "",
          "## Kapanış",
          "",
          `| Müşteri yanıtı tarihi | ${fmtCell(data.customerResponseDate)} |`,
          `| Durum | ${statusTr} |`,
        ].join("\n")
      : [
          "## Complaint information",
          "",
          "| Field | Value |",
          "|-------|-------|",
          `| Complaint no | ${fmtCell(data.complaintNo)} |`,
          `| Received date | ${fmtCell(data.receivedDate)} |`,
          `| Source | ${sourceEn} |`,
          `| Customer / institution | ${fmtCell(data.customerInstitution)} |`,
          `| Contact | ${fmtCell(data.contact)} |`,
          `| Product / model | ${fmtCell(data.productModel)} |`,
          `| Lot / serial no | ${fmtCell(data.lotSerial)} |`,
          `| UDI-DI (if applicable) | ${fmtCell(data.udiDi)} |`,
          `| Description | ${fmtCell(data.description)} |`,
          "",
          "## Initial assessment",
          "",
          "| Question | YES | NO | Note |",
          "|----------|-----|-----|------|",
          assessRow("Patient / user safety risk?", data.safetyRisk, data.safetyRiskNote),
          assessRow("Vigilance report needed? (SOP-VG)", data.vigilanceNeeded, data.vigilanceNote),
          assessRow("FSCA / advisory needed? (SOP-AN)", data.fscaNeeded, data.fscaNote),
          assessRow("CAPA needed? (SOP-CAPA)", data.capaNeeded, data.capaNeededNote),
          "",
          `**Assessed by:** ${fmtCell(data.assessedBy)}  **Date:** ${fmtCell(data.assessedDate)}`,
          "",
          hintBlock,
          "",
          "## Closure",
          "",
          `| Customer response date | ${fmtCell(data.customerResponseDate)} |`,
          `| Status | ${statusEn} |`,
        ].join("\n");

  return [filledHeader.join("\n"), body, approval].filter(Boolean).join("\n\n");
}

export function serializeComplaintCh02Markdown(data: ComplaintCh02FormData, locale: "tr" | "en"): string {
  const template = buildFormCh02(locale);
  const headerEnd = template.search(
    locale === "tr" ? /^##\s+Şikâyet referansı/m : /^##\s+Complaint reference/m,
  );
  const header = headerEnd > 0 ? template.slice(0, headerEnd).trim() : "";

  const approvalIdx = template.search(/^##\s+(Onay|Approval)/m);
  const approval = approvalIdx > 0 ? template.slice(approvalIdx).trim() : "";

  const introNote = template
    .split("\n")
    .find((l) => l.startsWith(">"))
    ?? "";

  const headerLines = header.split("\n");
  const filledHeader = headerLines.map((line) => {
    if (locale === "tr") {
      if (line.includes("| Tarih |")) return `| Tarih | ${fmtCell(data.formDate)} |`;
      if (line.includes("| Referans no |")) return `| Referans no | ${fmtCell(data.referenceNo)} |`;
    } else {
      if (line.match(/^\| Date \|/)) return `| Date | ${fmtCell(data.formDate)} |`;
      if (line.includes("| Reference no |")) return `| Reference no | ${fmtCell(data.referenceNo)} |`;
    }
    return line;
  });

  const capaStatusTr = [chk("Açık", data.capaStatusOpen), chk("Kapalı", data.capaStatusClosed)].join(" ");
  const capaStatusEn = [chk("Open", data.capaStatusOpen), chk("Closed", data.capaStatusClosed)].join(" ");

  const complaintStatusTr = [
    chk("İzlemede (CAPA açık)", data.complaintStatusMonitoring),
    chk("Kapatıldı (CAPA kapandı)", data.complaintStatusClosed),
  ].join(" ");
  const complaintStatusEn = [
    chk("Monitoring (CAPA open)", data.complaintStatusMonitoring),
    chk("Closed (CAPA closed)", data.complaintStatusClosed),
  ].join(" ");

  const body =
    locale === "tr"
      ? [
          introNote,
          "",
          "## Şikâyet referansı",
          "",
          "| Alan | Değer |",
          "|------|-------|",
          `| Şikâyet no (FORM-CH-01) | ${fmtCell(data.complaintNo)} |`,
          `| Şikâyet değerlendirme tarihi | ${fmtCell(data.assessmentDate)} |`,
          `| Ürün / lot | ${fmtCell(data.productLot)} |`,
          "",
          "## CAPA bağlantısı (FORM-CAPA-01)",
          "",
          "| Alan | Değer |",
          "|------|-------|",
          `| CAPA no | ${fmtCell(data.capaNo)} |`,
          `| CAPA açılış tarihi | ${fmtCell(data.capaOpenedDate)} |`,
          `| CAPA durumu | ${capaStatusTr} |`,
          `| CAPA sorumlusu | ${fmtCell(data.capaOwner)} |`,
          `| Kök neden özeti | ${fmtCell(data.rootCauseSummary)} |`,
          `| Düzeltici / önleyici aksiyon özeti | ${fmtCell(data.actionSummary)} |`,
          `| CAPA hedef tarih | ${fmtCell(data.capaTargetDate)} |`,
          `| Etkinlik doğrulandı mı? | ${effectivenessCell(data.effectivenessVerified, locale)} |`,
          "",
          "## Şikâyet kapanışı (CAPA ile)",
          "",
          `| Şikâyet durumu | ${complaintStatusTr} |`,
          `| Müşteri bilgilendirme tarihi | ${fmtCell(data.customerNotificationDate)} |`,
        ].join("\n")
      : [
          introNote,
          "",
          "## Complaint reference",
          "",
          "| Field | Value |",
          "|-------|-------|",
          `| Complaint no (FORM-CH-01) | ${fmtCell(data.complaintNo)} |`,
          `| Complaint assessment date | ${fmtCell(data.assessmentDate)} |`,
          `| Product / lot | ${fmtCell(data.productLot)} |`,
          "",
          "## CAPA linkage (FORM-CAPA-01)",
          "",
          "| Field | Value |",
          "|-------|-------|",
          `| CAPA no | ${fmtCell(data.capaNo)} |`,
          `| CAPA opened date | ${fmtCell(data.capaOpenedDate)} |`,
          `| CAPA status | ${capaStatusEn} |`,
          `| CAPA owner | ${fmtCell(data.capaOwner)} |`,
          `| Root cause summary | ${fmtCell(data.rootCauseSummary)} |`,
          `| Corrective / preventive action summary | ${fmtCell(data.actionSummary)} |`,
          `| CAPA target date | ${fmtCell(data.capaTargetDate)} |`,
          `| Effectiveness verified? | ${effectivenessCell(data.effectivenessVerified, locale)} |`,
          "",
          "## Complaint closure (with CAPA)",
          "",
          `| Complaint status | ${complaintStatusEn} |`,
          `| Customer notification date | ${fmtCell(data.customerNotificationDate)} |`,
        ].join("\n");

  return [filledHeader.join("\n"), body, approval].filter(Boolean).join("\n\n");
}
