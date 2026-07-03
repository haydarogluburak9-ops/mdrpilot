import fs from "fs";

const trText = fs.readFileSync("src/lib/i18n/dictionaries.ts", "utf8");
const enKeys = JSON.parse(fs.readFileSync("scripts/public-keys-en.json", "utf8"));
const trStart = trText.indexOf("tr: {");
const trEnd = trText.indexOf("\n};", trStart);
const trBody = trText.slice(trStart, trEnd);
const trMap = {};
for (const m of trBody.matchAll(/"([^"]+)":\s*"((?:\\.|[^"\\])*)"/g)) {
  trMap[m[1]] = m[2].replace(/\\"/g, '"');
}
let hit = 0;
for (const k of Object.keys(enKeys)) {
  if (trMap[k]) hit++;
}
console.log("tr overlap", hit, "of", Object.keys(enKeys).length);
