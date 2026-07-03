/**
 * Generates locale override JSON files from embedded translation tables.
 * Run: node scripts/locale-overrides/generate-all.mjs
 */
import fs from "fs";
import path from "path";
import { de } from "./tables/de.mjs";
import { fr } from "./tables/fr.mjs";
import { es } from "./tables/es.mjs";
import { it } from "./tables/it.mjs";
import { nl } from "./tables/nl.mjs";

const outDir = path.join("scripts", "locale-overrides");
fs.mkdirSync(outDir, { recursive: true });

for (const [lang, table] of Object.entries({ de, fr, es, it, nl })) {
  fs.writeFileSync(path.join(outDir, `${lang}.json`), JSON.stringify(table, null, 2), "utf8");
  console.log(lang, Object.keys(table).length, "keys");
}
