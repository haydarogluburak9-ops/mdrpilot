# Export templates

## Declaration of Conformity (D1004.04)

Reference layout: `doc-template.docx` (company QMS form **D1004.04 Uygunluk Beyanı / Declaration of Conformity**).

Word export for the technical-file section `doc` is generated programmatically to match that bilingual structure:

- Header: UYGUNLUK BEYANI / DECLARATION OF CONFORMITY
- Footer: Doküman No **D1004.04**, Yayın Tarihi, Rev. No, Rev. Tarihi
- Manufacturer, addresses, device, brands, Basic UDI-DI
- Product models table (from device family matrix) with **EMDN code** and **product photos**
- Class, conformity route, declaration text, standards, Notified Body
- Signature block (placeholders until confirmed)

Generator: `src/lib/exports/generators/declaration-docx.ts`
