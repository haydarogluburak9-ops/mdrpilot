import fs from "fs";
import path from "path";

const en = JSON.parse(fs.readFileSync("scripts/public-keys-en.json", "utf8"));
const packDir = "src/lib/i18n/locale-packs";
fs.mkdirSync(packDir, { recursive: true });

const langs = ["de", "fr", "es", "it", "nl"];
for (const lang of langs) {
  const file = path.join(packDir, `${lang}.json`);
  if (!fs.existsSync(file)) {
    console.warn(`Missing ${file} — copy from en and translate`);
    fs.writeFileSync(file, JSON.stringify(en, null, 2), "utf8");
  }
}

const imports = langs.map((l) => `import ${l} from "./locale-packs/${l}.json";`).join("\n");
const exportsBody = langs.map((l) => `  ${l},`).join("\n");

const ts = `import type { Lang } from "@/lib/i18n/locales";
${imports}

/** Public-facing UI strings for DE/FR/ES/IT/NL (landing, auth, help, billing). */
export const PUBLIC_LOCALE_TRANSLATIONS: Partial<Record<Exclude<Lang, "en" | "tr">, Record<string, string>>> = {
${exportsBody}
};
`;

fs.writeFileSync("src/lib/i18n/public-locale-translations.ts", ts, "utf8");
console.log("Wrote public-locale-translations.ts");
