export type UdiExportPayload = {
  tradeName?: string | null;
  udiDi?: string | null;
  udiPi?: string | null;
  deviceClass?: string | null;
  emdn?: string | null;
  gmdn?: string | null;
  issuingAgency?: string | null;
};

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** EUDAMED-oriented UDI device XML (manual upload / API prep). */
export function buildUdiDeviceXml(payload: UdiExportPayload, company: { name: string; srnNumber?: string | null }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<UDIDeviceRegistration xmlns="urn:eudamed:udi:device">
  <Manufacturer>
    <Name>${escXml(company.name)}</Name>
    ${company.srnNumber ? `<SRN>${escXml(company.srnNumber)}</SRN>` : ""}
  </Manufacturer>
  <Device>
    <TradeName>${escXml(payload.tradeName ?? "")}</TradeName>
    <UDI-DI>${escXml(payload.udiDi ?? "")}</UDI-DI>
    <UDI-PI>${escXml(payload.udiPi ?? "")}</UDI-PI>
    <DeviceClass>${escXml(payload.deviceClass ?? "")}</DeviceClass>
    <EMDN>${escXml(payload.emdn ?? "")}</EMDN>
    <GMDN>${escXml(payload.gmdn ?? "")}</GMDN>
    <IssuingAgency>${escXml(payload.issuingAgency ?? "GS1")}</IssuingAgency>
  </Device>
</UDIDeviceRegistration>`;
}

export function buildUdiDeviceCsv(payload: UdiExportPayload, company: { name: string; srnNumber?: string | null }) {
  const headers = [
    "manufacturer",
    "srn",
    "trade_name",
    "udi_di",
    "udi_pi",
    "device_class",
    "emdn",
    "gmdn",
    "issuing_agency",
  ];
  const row = [
    company.name,
    company.srnNumber ?? "",
    payload.tradeName ?? "",
    payload.udiDi ?? "",
    payload.udiPi ?? "",
    payload.deviceClass ?? "",
    payload.emdn ?? "",
    payload.gmdn ?? "",
    payload.issuingAgency ?? "GS1",
  ];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [headers.join(","), row.map(esc).join(",")].join("\n");
}

export function buildVigilanceReportCsv(
  records: {
    referenceNo: string | null;
    title: string;
    eventAt: string | null;
    dueDate: string | null;
    severity: string | null;
    status: string;
  }[],
) {
  const headers = ["reference_no", "title", "event_date", "report_deadline", "severity", "status"];
  const lines = [headers.join(",")];
  for (const r of records) {
    lines.push(
      [
        r.referenceNo ?? "",
        r.title,
        r.eventAt?.slice(0, 10) ?? "",
        r.dueDate?.slice(0, 10) ?? "",
        r.severity ?? "",
        r.status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
  }
  return lines.join("\n");
}
