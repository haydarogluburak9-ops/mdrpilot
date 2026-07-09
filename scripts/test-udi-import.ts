import {
  parseUdiDeviceXml,
  parseUdiDeviceCsv,
} from "../src/lib/eudamed/import-packages";

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
console.log("XML", JSON.stringify(r, null, 2));
if (!r.devices[0]?.udiDi || r.devices[0].srnNumber !== "TR-MF-000012345") {
  throw new Error("XML parse failed");
}

const csv =
  'manufacturer,srn,trade_name,basic_udi_di,udi_di,emdn,eudamed_device_id\n"Acme","TR-MF-1","Blade","++B1","0860","Q020","DEV-1"';
const c = parseUdiDeviceCsv(csv);
console.log("CSV", JSON.stringify(c, null, 2));
if (!c.devices[0]?.udiDi) throw new Error("CSV parse failed");
console.log("OK");
