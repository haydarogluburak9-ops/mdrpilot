import fs from "fs";

const { EN, TR } = JSON.parse(fs.readFileSync("scripts/_export-dicts.json", "utf8"));

function fmt(obj, indent) {
  const pad = "  ".repeat(indent);
  return Object.entries(obj)
    .map(([k, v]) => `${pad}${JSON.stringify(k)}: ${JSON.stringify(v)},`)
    .join("\n");
}

const header = fs.readFileSync("src/lib/exports/i18n.ts", "utf8").split("const EN")[0];

const footer = `
const TR: Dict = {
${fmt(TR, 1)}
};

const DICTS: Record<ExportLanguage, Dict> = {
  tr: TR,
  en: EN,
  de: EN,
  fr: EN,
  es: EN,
  it: EN,
  nl: EN,
};

export function tx(lang: ExportLanguage, key: string): string {
  return DICTS[lang]?.[key] ?? EN[key] ?? key;
}

export function generatedLine(lang: ExportLanguage, date: string, by: string): string {
  return \`\${tx(lang, "generated")} \${date} \${tx(lang, "by")} \${by}\`;
}

export function formatGsprApplicable(lang: ExportLanguage, applicable: string): string {
  return tx(lang, \`gx.applicableVal.\${applicable}\`) || applicable;
}
`;

const body = `${header}const EN: Dict = {
${fmt(EN, 1)}
};

${footer}`;

fs.writeFileSync("src/lib/exports/i18n.ts", body);
console.log("restored", body.length, "chars");
