import { buildFormMe01 } from "@/lib/qms/form-templates";
import { parseMarkdownFormFields, pickField } from "@/lib/qms/form-content-parser";

export interface CalibrationMeasurementPoint {
  label: string;
  deviation: string;
  uncertainty: string;
  totalDeviation: string;
}

export interface CalibrationFormData {
  deviceCode: string;
  deviceName: string;
  responsiblePerson: string;
  brandSerialNo: string;
  calibrationDateCertNo: string;
  measurementRange: string;
  measurementPoints: CalibrationMeasurementPoint[];
  tolerance: string;
  compliancePass: boolean;
  complianceFail: boolean;
  nextCalibrationDate: string;
  capaRef: string;
}

function emptyPoint(): CalibrationMeasurementPoint {
  return { label: "", deviation: "", uncertainty: "", totalDeviation: "" };
}

export function defaultCalibrationMeasurementPoints(count = 1): CalibrationMeasurementPoint[] {
  return Array.from({ length: count }, () => emptyPoint());
}

export function emptyCalibrationFormData(): CalibrationFormData {
  return {
    deviceCode: "",
    deviceName: "",
    responsiblePerson: "",
    brandSerialNo: "",
    calibrationDateCertNo: "",
    measurementRange: "",
    measurementPoints: defaultCalibrationMeasurementPoints(1),
    tolerance: "",
    compliancePass: false,
    complianceFail: false,
    nextCalibrationDate: "",
    capaRef: "",
  };
}

function fmtCell(value: string): string {
  const v = value.trim();
  return v || "__________";
}

function chk(label: string, checked: boolean): string {
  return `${checked ? "☑" : "☐"} ${label}`;
}

/** Parse numeric part as absolute value (supports 0,0 / 0.0 and optional unit). */
export function parseAbsoluteNumeric(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const numPart = trimmed.match(/[\d]+(?:[.,]\d+)?/)?.[0];
  if (!numPart) return null;
  const n = parseFloat(numPart.replace(",", "."));
  return Number.isFinite(n) ? Math.abs(n) : null;
}

function extractMeasurementUnit(...inputs: string[]): string {
  for (const input of inputs) {
    const unit = input.trim().replace(/^[\d\s,.\-+±]+/u, "").trim();
    if (unit) return unit;
  }
  return "";
}

/** Toplam sapma = ± (|sapma| + |belirsizlik|) with shared unit. */
export function computeTotalDeviation(
  deviation: string,
  uncertainty: string,
  locale: "tr" | "en" = "tr",
): string {
  const d = parseAbsoluteNumeric(deviation);
  const u = parseAbsoluteNumeric(uncertainty);
  if (d == null && u == null) return "";
  const sum = (d ?? 0) + (u ?? 0);
  const unit = extractMeasurementUnit(deviation, uncertainty);
  const formatted = locale === "tr" ? sum.toFixed(1).replace(".", ",") : sum.toFixed(1);
  return unit ? `±${formatted} ${unit}` : `±${formatted}`;
}

export function enrichMeasurementPoints(
  points: CalibrationMeasurementPoint[],
  locale: "tr" | "en",
): CalibrationMeasurementPoint[] {
  return points.map((p) => ({
    ...p,
    totalDeviation: computeTotalDeviation(p.deviation, p.uncertainty, locale),
  }));
}

function parseMeasurementTable(content: string, locale: "tr" | "en"): CalibrationMeasurementPoint[] {
  const sectionRe =
    locale === "tr" ? /^##\s+Ölçüm noktaları/m : /^##\s+Measurement points/m;
  const match = content.match(sectionRe);
  if (!match || match.index == null) return defaultCalibrationMeasurementPoints(1);

  const block = content.slice(match.index);
  const lines = block.split("\n");
  const points: CalibrationMeasurementPoint[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inTable && trimmed.startsWith("|") && !/^[-|:\s]+$/.test(trimmed)) {
      const cells = trimmed.split("|").map((c) => c.trim()).filter(Boolean);
      const header = cells.join(" ").toLowerCase();
      if (
        (locale === "tr" && header.includes("nokta")) ||
        (locale === "en" && header.includes("point"))
      ) {
        inTable = true;
      }
      continue;
    }
    if (!inTable) continue;
    if (!trimmed.startsWith("|")) break;
    if (/^[-|:\s]+$/.test(trimmed)) continue;

    const cells = trimmed.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 4) continue;
    points.push({
      label: cells[0] ?? "",
      deviation: cells[1] ?? "",
      uncertainty: cells[2] ?? "",
      totalDeviation: cells[3] ?? "",
    });
  }

  return points.length > 0 ? points : defaultCalibrationMeasurementPoints(1);
}

export function parseCalibrationFormMarkdown(content: string, locale: "tr" | "en"): CalibrationFormData {
  const data = emptyCalibrationFormData();
  const fields = parseMarkdownFormFields(content);

  data.deviceCode =
    pickField(fields, "cihaz kodu", "ekipman no", "equipment no", "device code") ?? "";
  data.deviceName =
    pickField(fields, "cihaz adı", "ekipman adı", "equipment name", "device name") ?? "";
  data.responsiblePerson =
    pickField(fields, "cihaz sorumlusu", "sorumlu", "owner", "calibration owner") ?? "";
  data.brandSerialNo =
    pickField(fields, "marka / seri no", "marka/ seri no", "brand / serial no", "brand/serial") ??
    "";
  data.calibrationDateCertNo =
    pickField(
      fields,
      "kalibrasyon tarihi / sertifika no",
      "kalibrasyon tarihi sertifika no",
      "calibration date / certificate no",
    ) ?? "";
  data.measurementRange =
    pickField(fields, "ölçüm aralığı", "ölçüm aralıkları", "measurement range") ?? "";
  data.tolerance = pickField(fields, "tolerans", "tolerance") ?? "";
  data.nextCalibrationDate =
    pickField(
      fields,
      "gelecek kalibrasyon tarihi",
      "sonraki kalibrasyon",
      "next calibration",
    ) ?? "";
  data.capaRef =
    pickField(fields, "out-of-tolerance capa ref", "capa ref", "capa no") ?? "";

  const complianceRow = pickField(fields, "uygunluk", "compliance", "sonuç", "result") ?? "";
  data.compliancePass = /☑|✓|✔|\[x\]/i.test(complianceRow) && /uygun|pass|suitable/i.test(complianceRow);
  data.complianceFail =
    /☑|✓|✔|\[x\]/i.test(complianceRow) && /değil|fail|not/i.test(complianceRow);
  if (!data.compliancePass && !data.complianceFail && /uygun/i.test(complianceRow) && !/değil/i.test(complianceRow)) {
    data.compliancePass = true;
  }

  data.measurementPoints = enrichMeasurementPoints(parseMeasurementTable(content, locale), locale);
  return data;
}

/** Row for calibration plan Word export */
export interface CalibrationPlanRow {
  serialNo: number;
  deviceCode: string;
  deviceName: string;
  responsiblePerson: string;
  brandSerialNo: string;
  calibrationDateCertNo: string;
  measurementRange: string;
  measurementPoints: CalibrationMeasurementPoint[];
  tolerance: string;
  compliance: string;
  nextCalibrationDate: string;
}

export function calibrationFormToPlanRow(
  data: CalibrationFormData,
  serialNo: number,
  fallbackTitle?: string,
  locale: "tr" | "en" = "tr",
): CalibrationPlanRow {
  const compliance = data.complianceFail
    ? "Uygun değil"
    : data.compliancePass
      ? "Uygun"
      : "";
  return {
    serialNo,
    deviceCode: data.deviceCode.trim(),
    deviceName: data.deviceName.trim() || fallbackTitle?.trim() || "",
    responsiblePerson: data.responsiblePerson.trim(),
    brandSerialNo: data.brandSerialNo.trim(),
    calibrationDateCertNo: data.calibrationDateCertNo.trim(),
    measurementRange: data.measurementRange.trim(),
    measurementPoints: enrichMeasurementPoints(
      data.measurementPoints.length > 0 ? data.measurementPoints : defaultCalibrationMeasurementPoints(1),
      locale,
    ),
    tolerance: data.tolerance.trim(),
    compliance,
    nextCalibrationDate: data.nextCalibrationDate.trim(),
  };
}

export function serializeCalibrationFormMarkdown(data: CalibrationFormData, locale: "tr" | "en"): string {
  const template = buildFormMe01(locale);
  const approvalIdx = template.search(/^##\s+(Onay|Approval)/m);
  const approval = approvalIdx > 0 ? template.slice(approvalIdx).trim() : "";

  const passMark = data.compliancePass ? "☑" : "☐";
  const failMark = data.complianceFail ? "☑" : "☐";

  const pointRows = enrichMeasurementPoints(data.measurementPoints, locale).map((p) => {
    const total = p.totalDeviation || computeTotalDeviation(p.deviation, p.uncertainty, locale);
    return locale === "tr"
      ? `| ${fmtCell(p.label)} | ${fmtCell(p.deviation)} | ${fmtCell(p.uncertainty)} | ${fmtCell(total)} |`
      : `| ${fmtCell(p.label)} | ${fmtCell(p.deviation)} | ${fmtCell(p.uncertainty)} | ${fmtCell(total)} |`;
  });

  const body =
    locale === "tr"
      ? [
          "## Cihaz bilgisi",
          "",
          "| Alan | Değer |",
          "|------|-------|",
          `| Cihaz kodu | ${fmtCell(data.deviceCode)} |`,
          `| Cihaz adı | ${fmtCell(data.deviceName)} |`,
          `| Cihaz sorumlusu | ${fmtCell(data.responsiblePerson)} |`,
          `| Marka / seri no | ${fmtCell(data.brandSerialNo)} |`,
          `| Ölçüm aralığı | ${fmtCell(data.measurementRange)} |`,
          "",
          "## Kalibrasyon",
          "",
          "| Alan | Değer |",
          "|------|-------|",
          `| Kalibrasyon tarihi / sertifika no | ${fmtCell(data.calibrationDateCertNo)} |`,
          `| Gelecek kalibrasyon tarihi | ${fmtCell(data.nextCalibrationDate)} |`,
          `| Tolerans | ${fmtCell(data.tolerance)} |`,
          `| Uygunluk | ${passMark} Uygun | ${failMark} Uygun değil |`,
          `| Out-of-tolerance CAPA ref | ${fmtCell(data.capaRef)} |`,
          "",
          "## Ölçüm noktaları",
          "",
          "| Nokta | Sapma | Belirsizlik | Toplam sapma |",
          "|-------|-------|-------------|--------------|",
          ...pointRows,
        ].join("\n")
      : [
          "## Device information",
          "",
          "| Field | Value |",
          "|-------|-------|",
          `| Device code | ${fmtCell(data.deviceCode)} |`,
          `| Device name | ${fmtCell(data.deviceName)} |`,
          `| Device responsible | ${fmtCell(data.responsiblePerson)} |`,
          `| Brand / serial no | ${fmtCell(data.brandSerialNo)} |`,
          `| Measurement range | ${fmtCell(data.measurementRange)} |`,
          "",
          "## Calibration",
          "",
          "| Field | Value |",
          "|-------|-------|",
          `| Calibration date / certificate no | ${fmtCell(data.calibrationDateCertNo)} |`,
          `| Next calibration date | ${fmtCell(data.nextCalibrationDate)} |`,
          `| Tolerance | ${fmtCell(data.tolerance)} |`,
          `| Compliance | ${passMark} Pass | ${failMark} Fail |`,
          `| Out-of-tolerance CAPA ref | ${fmtCell(data.capaRef)} |`,
          "",
          "## Measurement points",
          "",
          "| Point | Deviation | Uncertainty | Total deviation |",
          "|-------|-----------|-------------|-----------------|",
          ...pointRows,
        ].join("\n");

  const headerEnd = template.search(/^##\s+(Cihaz bilgisi|Device information|Equipment information)/m);
  const header = headerEnd > 0 ? template.slice(0, headerEnd).trim() : "";

  return [header, body, approval].filter(Boolean).join("\n\n");
}
