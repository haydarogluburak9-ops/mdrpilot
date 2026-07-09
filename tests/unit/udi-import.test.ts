import { describe, expect, it } from "vitest";
import {
  parseUdiDeviceXml,
  parseUdiDeviceCsv,
  toProductUdiPatch,
} from "@/lib/eudamed/import-packages";

describe("UDI import packages", () => {
  it("parses MDRpilot-style XML with SRN and Basic UDI-DI", () => {
    const xml = `<?xml version="1.0"?>
<UDIDeviceRegistration>
  <Manufacturer><Name>Acme</Name><SRN>TR-MF-000012345</SRN></Manufacturer>
  <Device>
    <TradeName>Sterile Ophthalmic Blade</TradeName>
    <BasicUDI-DI>++B123BASIC</BasicUDI-DI>
    <UDI-DI>08601234567890</UDI-DI>
    <EMDN>Q020101</EMDN>
    <EUDAMEDDeviceID>DEV-99</EUDAMEDDeviceID>
  </Device>
</UDIDeviceRegistration>`;
    const r = parseUdiDeviceXml(xml);
    expect(r.devices).toHaveLength(1);
    expect(r.devices[0].udiDi).toBe("08601234567890");
    expect(r.devices[0].basicUdiDi).toBe("++B123BASIC");
    expect(r.devices[0].srnNumber).toBe("TR-MF-000012345");
    expect(r.devices[0].emdnCode).toBe("Q020101");
  });

  it("parses CSV with alias headers", () => {
    const csv =
      'manufacturer,srn,trade_name,basic_udi_di,udi_di,emdn,eudamed_device_id\n"Acme","TR-MF-1","Blade","++B1","0860","Q020","DEV-1"';
    const r = parseUdiDeviceCsv(csv);
    expect(r.devices[0].udiDi).toBe("0860");
    expect(toProductUdiPatch(r.devices[0], true).eudamedRegistrationStatus).toBe("REGISTERED");
  });

  it("returns warning for empty XML", () => {
    const r = parseUdiDeviceXml("<root></root>");
    expect(r.devices).toHaveLength(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});
