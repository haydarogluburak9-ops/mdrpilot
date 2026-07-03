import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  Tab,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import JSZip from "jszip";
import type { DeviceClass } from "@/lib/domain/types";
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import { resolveApplicableReferences } from "@/lib/domain/applicable-references";
import { formatStandardsInText } from "@/lib/domain/standards-catalog";
import { brandsFromVariants, flattenDeclarationModels } from "../declaration-models";
import { loadModelPhotoFromPublic, scalePhoto } from "../product-photos";
import { loadProductPhotoBuffer } from "@/lib/products/photo";
import { readImageSize, logoImageRunOptions, type CompanyLogo } from "../logo";
import { coerceLanguage, localeUppercase, tx, type ExportLanguage } from "../i18n";

export interface DeclarationDocxInput {
  company: {
    name: string;
    legalName?: string | null;
    address?: string | null;
    manufacturingSites?: string | null;
    notifiedBody?: string | null;
    notifiedBodyNumber?: string | null;
    country?: string | null;
  };
  product: {
    name: string;
    brand?: string | null;
    model?: string | null;
    basicUdiDi?: string | null;
    emdnCode?: string | null;
    photoKey?: string | null;
    deviceClass: string;
    variantsJson?: unknown;
    appliedStandards?: string | null;
    isSterile?: boolean;
    sterilization?: string | null;
  };
  documentNo: string;
  publicationDate: string;
  revisionNo: string;
  revisionDate: string;
  issueDate: string;
  logo: CompanyLogo | null;
  language?: ExportLanguage;
}

const C = {
  BLACK: "000000",
  GRAY: "808080",
} as const;

const FONT = "Arial";

const COLON_TAB = 3200;
const VALUE_INDENT = 3360;

const SZ = {
  H1: 36,
  LABEL: 20,
  BODY: 18,
  DEVICE: 17,
  SUB: 16,
  FOOTER: 14,
  TABLE: 12,
} as const;

const DEVICE_CLASS_LABEL_TR: Record<DeviceClass, string> = {
  CLASS_I: "Sınıf I",
  CLASS_IS: "Sınıf Is (steril)",
  CLASS_IM: "Sınıf Im (ölçüm)",
  CLASS_IR: "Sınıf Ir (yeniden kullanılabilir cerrahi)",
  CLASS_IIA: "Sınıf IIa",
  CLASS_IIB: "Sınıf IIb",
  CLASS_III: "Sınıf III",
};

const GRID = { style: BorderStyle.SINGLE, size: 4, color: C.BLACK } as const;
const GRID_BORDERS = { top: GRID, bottom: GRID, left: GRID, right: GRID, insideHorizontal: GRID, insideVertical: GRID } as const;
const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: "auto" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
  left: { style: BorderStyle.NONE, size: 0, color: "auto" },
  right: { style: BorderStyle.NONE, size: 0, color: "auto" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
} as const;

const PG_BORDERS_XML =
  '<w:pgBorders w:offsetFrom="page">' +
  '<w:top w:val="twistedLines1" w:sz="18" w:space="24" w:color="30ACEC" w:themeColor="accent1"/>' +
  '<w:left w:val="twistedLines1" w:sz="18" w:space="24" w:color="30ACEC" w:themeColor="accent1"/>' +
  '<w:bottom w:val="twistedLines1" w:sz="18" w:space="24" w:color="30ACEC" w:themeColor="accent1"/>' +
  '<w:right w:val="twistedLines1" w:sz="18" w:space="24" w:color="30ACEC" w:themeColor="accent1"/>' +
  "</w:pgBorders>";

type RunOpts = {
  bold?: boolean;
  size?: number;
  italics?: boolean;
  color?: string;
};

function run(text: string, opts: RunOpts = {}): TextRun {
  return new TextRun({
    text,
    font: FONT,
    bold: opts.bold,
    italics: opts.italics,
    size: opts.size ?? SZ.BODY,
    color: opts.color,
  });
}

function para(children: TextRun[], spacing = 0): Paragraph {
  return new Paragraph({ spacing: { after: spacing }, children });
}

type ParaChild = TextRun | Tab;

function tabPara(children: ParaChild[], indentLeft?: number, spacing = 0): Paragraph {
  return new Paragraph({
    spacing: { after: spacing },
    indent: indentLeft ? { left: indentLeft } : undefined,
    tabStops: [{ type: TabStopType.LEFT, position: COLON_TAB }],
    children,
  });
}

/** Label + tab + colon + value — bilingual field layout. */
function alignedField(label: string, valueLines: TextRun[][], lang: ExportLanguage): Paragraph[] {
  const tbc = tx(lang, "decl.tbc");
  const firstValue = valueLines[0]?.length ? valueLines[0] : [run(tbc, { size: SZ.BODY })];
  const out: Paragraph[] = [
    tabPara([
      run(label, { bold: true, size: SZ.LABEL }),
      new Tab(),
      run(":", { bold: true, size: SZ.LABEL }),
      run(" ", { size: SZ.BODY }),
      ...firstValue,
    ]),
  ];
  for (let i = 1; i < valueLines.length; i++) {
    out.push(tabPara(valueLines[i], VALUE_INDENT));
  }
  return out;
}

function alignedTextField(label: string, text: string, lang: ExportLanguage): Paragraph[] {
  const tbc = tx(lang, "decl.tbc");
  const lines = (text || tbc).split("\n").filter((l) => l.length > 0);
  const valueLines = lines.map((line) => [run(line, { size: SZ.BODY })]);
  return alignedField(label, valueLines.length ? valueLines : [[run(tbc, { size: SZ.BODY })]], lang);
}

function addressField(centre: string, production: string, lang: ExportLanguage): Paragraph[] {
  return alignedField(tx(lang, "decl.address"), [
    [run(`${tx(lang, "decl.addressCentre")} : ${centre}`, { size: SZ.BODY })],
    [run(`${tx(lang, "decl.addressProduction")} : ${production}`, { size: SZ.SUB, bold: true })],
  ], lang);
}

function modelsLabelBlock(lang: ExportLanguage): Paragraph[] {
  return [
    tabPara([
      run(tx(lang, "decl.productModels"), { bold: true, size: SZ.LABEL }),
      new Tab(),
      run(":", { bold: true, size: SZ.LABEL }),
    ]),
  ];
}

function issuePlace(company: DeclarationDocxInput["company"], lang: ExportLanguage): string {
  const addr = company.manufacturingSites || company.address || "";
  const m = addr.match(/([A-Za-zÇĞİÖŞÜçğıöşü]+)\s*[-/]\s*([A-ZÇĞİÖŞÜ]{2,})/);
  if (m) return localeUppercase(m[1], lang);
  return company.country?.trim() || "—";
}

function conformityRoute(deviceClass: string, hasNb: boolean, lang: ExportLanguage): string {
  if (deviceClass === "CLASS_I" || deviceClass === "CLASS_IS" || deviceClass === "CLASS_IM" || deviceClass === "CLASS_IR") {
    return [tx(lang, "decl.route.class1"), hasNb ? tx(lang, "decl.route.nb") : ""].filter(Boolean).join("\n");
  }
  return tx(lang, "decl.route.other");
}

function classBlock(deviceClass: string, isSterile: boolean, lang: ExportLanguage): string {
  const label =
    lang === "tr"
      ? DEVICE_CLASS_LABEL_TR[deviceClass as DeviceClass] ?? deviceClass
      : (DEVICE_CLASS_LABEL as Record<string, string>)[deviceClass] ?? deviceClass;
  const sterile = isSterile ? tx(lang, "decl.classSterile") : "";
  return tx(lang, "decl.classBlock").replace("{class}", label).replace("{sterile}", sterile);
}

function standardsText(product: DeclarationDocxInput["product"], lang: ExportLanguage): string {
  if (product.appliedStandards?.trim()) {
    return formatStandardsInText(product.appliedStandards.trim()) ?? product.appliedStandards.trim();
  }
  const refs = resolveApplicableReferences(product);
  return [tx(lang, "decl.defaultStandards"), ...refs.harmonisedStandards].join(", ");
}

function tableHeaderCell(label: string): TableCell {
  return new TableCell({
    shading: { fill: "D9D9D9" },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [run(label, { bold: true, size: SZ.TABLE })] }),
    ],
  });
}

function modelsTable(
  rows: ReturnType<typeof flattenDeclarationModels>,
  defaultPhoto: { data: Buffer; width: number; height: number } | null,
  lang: ExportLanguage,
): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      tableHeaderCell(tx(lang, "decl.col.orderNo")),
      tableHeaderCell(tx(lang, "decl.col.modelName")),
      tableHeaderCell(tx(lang, "decl.col.productName")),
      tableHeaderCell(tx(lang, "decl.col.photo")),
      tableHeaderCell(tx(lang, "decl.col.emdn")),
      tableHeaderCell(tx(lang, "decl.col.sterilization")),
    ],
  });

  const dataRows = rows.map((r) => {
    const modelPhoto = loadModelPhotoFromPublic(r.modelName) ?? defaultPhoto;
    return new TableRow({
      children: [
        tableCell(String(r.orderNo)),
        tableCell(r.modelName),
        tableCell(r.productName),
        photoCell(modelPhoto),
        tableCell(r.emdnCode),
        tableCell(r.sterilization),
      ],
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: GRID_BORDERS,
    rows: [headerRow, ...dataRows],
  });
}

function photoCell(image: { data: Buffer; width: number; height: number } | null): TableCell {
  if (!image) {
    return new TableCell({
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run("—", { size: SZ.TABLE })] })],
    });
  }
  const size = scalePhoto(image, 48, 48);
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ data: image.data, transformation: { width: size.width, height: size.height } })],
      }),
    ],
  });
}

function tableCell(text: string): TableCell {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ children: [run(text, { size: SZ.TABLE })] })],
  });
}

function buildDocHeader(lang: ExportLanguage): Header {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 },
        children: [run(tx(lang, "decl.header"), { bold: true, size: SZ.H1 })],
      }),
    ],
  });
}

function footerCell(label: string, value: string): TableCell {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [run(label, { size: SZ.FOOTER, color: C.GRAY })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [run(value || "—", { size: SZ.FOOTER, color: C.GRAY })] }),
    ],
  });
}

function buildDocFooter(data: DeclarationDocxInput, lang: ExportLanguage): Footer {
  return new Footer({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: [
          new TableRow({
            children: [
              footerCell(tx(lang, "decl.footer.docNo"), data.documentNo),
              footerCell(tx(lang, "decl.footer.pubDate"), data.publicationDate),
              footerCell(tx(lang, "decl.footer.revNo"), data.revisionNo),
              footerCell(tx(lang, "decl.footer.revDate"), data.revisionDate),
            ],
          }),
        ],
      }),
    ],
  });
}

async function applyTemplatePageFrame(buffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  const docPath = "word/document.xml";
  const file = zip.file(docPath);
  if (!file) return buffer;
  let xml = await file.async("string");
  if (!xml.includes("<w:pgBorders")) {
    xml = xml.replace(/<w:sectPr([^>]*)>/, `<w:sectPr$1>${PG_BORDERS_XML}`);
  }
  zip.file(docPath, xml);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

export async function buildDeclarationDocx(data: DeclarationDocxInput): Promise<Buffer> {
  const lang = coerceLanguage(data.language);
  const tbc = tx(lang, "decl.tbc");
  const c = data.company;
  const p = data.product;
  const mfrName = c.legalName?.trim() || c.name;
  const centre = c.address?.trim() || tbc;
  const production = c.manufacturingSites?.trim() || centre;
  const brands = brandsFromVariants(p.variantsJson, p.brand);
  const models = flattenDeclarationModels(p.name, p.variantsJson, p.emdnCode, p.model, p.brand);
  const defaultPhotoBuf = await loadProductPhotoBuffer(p.photoKey);
  const defaultPhoto = defaultPhotoBuf
    ? (() => {
        const size = readImageSize(defaultPhotoBuf);
        return size ? { data: defaultPhotoBuf, width: size.width, height: size.height } : null;
      })()
    : null;
  const nbLine = [c.notifiedBody, c.notifiedBodyNumber ? `(${c.notifiedBodyNumber})` : ""].filter(Boolean).join(" ") || tbc;
  const stds = standardsText(p, lang);

  const body: (Paragraph | Table)[] = [];

  if (data.logo) {
    body.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new ImageRun(logoImageRunOptions(data.logo, 180, 72))],
      }),
    );
  }

  body.push(
    ...alignedField(tx(lang, "decl.mfrName"), [[run(mfrName, { size: SZ.BODY })]], lang),
    ...addressField(centre, production, lang),
    ...alignedField(tx(lang, "decl.deviceName"), [[run(p.name, { bold: true, size: SZ.DEVICE })]], lang),
    ...alignedField(tx(lang, "decl.brand"), brands.map((b) => [run(b, { bold: true, size: SZ.LABEL })]), lang),
    ...alignedField(tx(lang, "decl.basicUdi"), [[run(p.basicUdiDi?.trim() || tbc, { size: SZ.BODY })]], lang),
    ...modelsLabelBlock(lang),
    modelsTable(models, defaultPhoto, lang),
    new Paragraph({ text: "", spacing: { after: 80 } }),
    ...alignedTextField(tx(lang, "decl.class"), classBlock(p.deviceClass, !!p.isSterile, lang), lang),
    ...alignedTextField(tx(lang, "decl.emdnCode"), p.emdnCode?.trim() || tbc, lang),
    ...alignedTextField(tx(lang, "decl.conformityRoute"), conformityRoute(p.deviceClass, !!c.notifiedBody, lang), lang),
    para([run(tx(lang, "decl.body"), { size: SZ.BODY })], 80),
    ...alignedTextField(tx(lang, "decl.standards"), stds, lang),
    ...alignedTextField(tx(lang, "decl.nb"), nbLine, lang),
    ...alignedTextField(tx(lang, "decl.ecCert"), tbc, lang),
    ...alignedTextField(tx(lang, "decl.firstPublication"), data.publicationDate, lang),
    ...alignedTextField(tx(lang, "decl.validity"), tbc, lang),
    ...alignedTextField(tx(lang, "decl.signedPlace"), `${issuePlace(c, lang)} / ${data.issueDate}`, lang),
    ...alignedTextField(tx(lang, "decl.signatory"), tbc, lang),
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1476, right: 829, bottom: 851, left: 872, footer: 532 },
          },
        },
        headers: { default: buildDocHeader(lang) },
        footers: { default: buildDocFooter(data, lang) },
        children: body,
      },
    ],
  });

  const raw = await Packer.toBuffer(doc);
  return applyTemplatePageFrame(raw);
}
