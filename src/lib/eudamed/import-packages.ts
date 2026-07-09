/**
 * Parse EUDAMED / GS1-oriented UDI device packages (XML or CSV) so manufacturers
 * with an existing registration can onboard into MDRpilot without re-typing codes.
 *
 * Accepts:
 * - MDRpilot export format (UDIDeviceRegistration XML / udi_di CSV)
 * - Flexible tag/header aliases common in EUDAMED bulk / GS1 exports
 */

export type ImportedUdiDevice = {
  tradeName: string | null;
  basicUdiDi: string | null;
  udiDi: string | null;
  emdnCode: string | null;
  eudamedDeviceId: string | null;
  deviceClass: string | null;
  gmdn: string | null;
  issuingAgency: string | null;
  manufacturerName: string | null;
  srnNumber: string | null;
};

export type UdiImportParseResult = {
  format: "xml" | "csv";
  devices: ImportedUdiDevice[];
  warnings: string[];
};

function clean(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t.length ? t : null;
}

function firstTag(xml: string, names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(
      `<(?:[\\w.-]+:)?${name}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${name}>`,
      "i",
    );
    const m = xml.match(re);
    if (m?.[1]) {
      const raw = m[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/<[^>]+>/g, "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .trim();
      if (raw) return raw;
    }
  }
  return null;
}

function splitDeviceBlocks(xml: string): string[] {
  const blocks: string[] = [];
  const patterns = [
    /<(?:[\w.-]+:)?Device\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?Device>/gi,
    /<(?:[\w.-]+:)?UDIDevice\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?UDIDevice>/gi,
    /<(?:[\w.-]+:)?UDIDeviceRegistration\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?UDIDeviceRegistration>/gi,
  ];
  for (const re of patterns) {
    const found = xml.match(re);
    if (found?.length) {
      for (const b of found) blocks.push(b);
      break;
    }
  }
  return blocks.length ? blocks : [xml];
}

function parseDeviceXmlBlock(block: string, rootXml: string): ImportedUdiDevice {
  const manufacturerBlock =
    rootXml.match(/<(?:[\w.-]+:)?Manufacturer\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?Manufacturer>/i)?.[0] ?? "";
  const udiDi = firstTag(block, [
    "UDI-DI",
    "UDIDI",
    "UDI_DI",
    "udiDi",
    "PrimaryDI",
    "DeviceIdentifier",
  ]);
  const basicUdiDi = firstTag(block, [
    "BasicUDI-DI",
    "BasicUDIDI",
    "BASIC_UDI_DI",
    "basicUdiDi",
    "BasicUDI",
  ]);
  return {
    tradeName: firstTag(block, ["TradeName", "tradeName", "DeviceName", "ProductName"]),
    basicUdiDi,
    udiDi: udiDi ?? basicUdiDi,
    emdnCode: firstTag(block, ["EMDN", "EmdnCode", "emdnCode", "EMDNCode"]),
    eudamedDeviceId: firstTag(block, [
      "EUDAMEDDeviceID",
      "EudamedDeviceId",
      "DeviceID",
      "DeviceId",
      "UUID",
      "eudamedDeviceId",
    ]),
    deviceClass: firstTag(block, ["DeviceClass", "RiskClass", "MDRClass", "Class"]),
    gmdn: firstTag(block, ["GMDN", "GmdnCode"]),
    issuingAgency: firstTag(block, ["IssuingAgency", "IssuingEntity", "Agency"]),
    manufacturerName: firstTag(manufacturerBlock, ["Name", "ManufacturerName"]),
    srnNumber:
      firstTag(manufacturerBlock, ["SRN", "ActorID", "ActorId"]) ??
      firstTag(block, ["SRN", "ActorID", "ActorId", "srnNumber"]) ??
      firstTag(rootXml, ["SRN", "ActorID", "ActorId"]),
  };
}

export function parseUdiDeviceXml(xml: string): UdiImportParseResult {
  const warnings: string[] = [];
  const trimmed = xml.trim();
  if (!trimmed.includes("<")) {
    return { format: "xml", devices: [], warnings: ["File does not look like XML."] };
  }

  const blocks = splitDeviceBlocks(trimmed);
  const devices = blocks
    .map((b) => parseDeviceXmlBlock(b, trimmed))
    .filter((d) => d.udiDi || d.basicUdiDi || d.emdnCode || d.eudamedDeviceId || d.tradeName);

  if (!devices.length) {
    warnings.push("No device records found in XML. Check that UDI-DI / Basic UDI-DI tags are present.");
  }

  // Prefer Basic UDI-DI when only one DI-like field was mapped to both
  for (const d of devices) {
    if (d.udiDi && !d.basicUdiDi && d.udiDi.length > 14) {
      // keep as UDI-DI; Basic often shorter / different format — leave as-is
    }
    if (!d.basicUdiDi && d.udiDi) {
      // Many exports only carry unit-of-use DI; Basic may be filled later by user
    }
  }

  return { format: "xml", devices, warnings };
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/["']/g, "")
    .replace(/[\s-]+/g, "_");
}

const HEADER_MAP: Record<string, keyof ImportedUdiDevice> = {
  trade_name: "tradeName",
  tradename: "tradeName",
  device_name: "tradeName",
  product_name: "tradeName",
  name: "tradeName",
  udi_di: "udiDi",
  udidi: "udiDi",
  "udi-di": "udiDi",
  primary_di: "udiDi",
  device_identifier: "udiDi",
  basic_udi_di: "basicUdiDi",
  basicudidi: "basicUdiDi",
  "basic_udi-di": "basicUdiDi",
  basic_udi: "basicUdiDi",
  emdn: "emdnCode",
  emdn_code: "emdnCode",
  emdncode: "emdnCode",
  eudamed_device_id: "eudamedDeviceId",
  eudameddeviceid: "eudamedDeviceId",
  device_id: "eudamedDeviceId",
  deviceid: "eudamedDeviceId",
  device_class: "deviceClass",
  risk_class: "deviceClass",
  mdr_class: "deviceClass",
  gmdn: "gmdn",
  gmdn_code: "gmdn",
  issuing_agency: "issuingAgency",
  agency: "issuingAgency",
  manufacturer: "manufacturerName",
  manufacturer_name: "manufacturerName",
  srn: "srnNumber",
  actor_id: "srnNumber",
  srn_number: "srnNumber",
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === "," || ch === ";") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function parseUdiDeviceCsv(csv: string): UdiImportParseResult {
  const warnings: string[] = [];
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { format: "csv", devices: [], warnings: ["CSV needs a header row and at least one data row."] };
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const mapped = headers.map((h) => HEADER_MAP[h] ?? null);
  if (!mapped.some(Boolean)) {
    return {
      format: "csv",
      devices: [],
      warnings: [
        `Unrecognized CSV headers. Expected columns like udi_di, basic_udi_di, emdn, trade_name. Got: ${headers.join(", ")}`,
      ],
    };
  }

  const devices: ImportedUdiDevice[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row: ImportedUdiDevice = {
      tradeName: null,
      basicUdiDi: null,
      udiDi: null,
      emdnCode: null,
      eudamedDeviceId: null,
      deviceClass: null,
      gmdn: null,
      issuingAgency: null,
      manufacturerName: null,
      srnNumber: null,
    };
    mapped.forEach((key, idx) => {
      if (!key) return;
      row[key] = clean(cols[idx]);
    });
    if (row.udiDi || row.basicUdiDi || row.emdnCode || row.eudamedDeviceId || row.tradeName) {
      if (!row.udiDi && row.basicUdiDi) row.udiDi = row.basicUdiDi;
      devices.push(row);
    }
  }

  if (!devices.length) warnings.push("No device rows found in CSV.");
  return { format: "csv", devices, warnings };
}

export function parseUdiImportFile(filename: string, content: string): UdiImportParseResult {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".xml") || content.trimStart().startsWith("<?xml") || content.trimStart().startsWith("<")) {
    return parseUdiDeviceXml(content);
  }
  return parseUdiDeviceCsv(content);
}

/** Map imported device fields onto product UDI columns (never invent values). */
export function toProductUdiPatch(device: ImportedUdiDevice, markRegistered: boolean) {
  return {
    basicUdiDi: device.basicUdiDi,
    udiDi: device.udiDi ?? device.basicUdiDi,
    emdnCode: device.emdnCode,
    eudamedDeviceId: device.eudamedDeviceId,
    eudamedRegistrationStatus: markRegistered
      ? ("REGISTERED" as const)
      : device.eudamedDeviceId
        ? ("REGISTERED" as const)
        : ("IN_PROGRESS" as const),
  };
}
