import fs from "fs";
import path from "path";

const keyFile = fs.existsSync("scripts/all-keys-en.json")
  ? "scripts/all-keys-en.json"
  : "scripts/public-keys-en.json";
const en = JSON.parse(fs.readFileSync(keyFile, "utf8"));
const keys = Object.keys(en);
const overrideDir = "scripts/locale-overrides";
const outDir = "src/lib/i18n/locale-packs";
const langs = ["de", "fr", "es", "it", "nl"];

fs.mkdirSync(outDir, { recursive: true });

for (const lang of langs) {
  const overridePath = path.join(overrideDir, `${lang}.json`);
  const overrides = fs.existsSync(overridePath)
    ? JSON.parse(fs.readFileSync(overridePath, "utf8"))
    : {};
  const pack = {};
  for (const key of keys) {
    pack[key] = overrides[key] ?? en[key];
  }
  fs.writeFileSync(path.join(outDir, `${lang}.json`), JSON.stringify(pack, null, 2), "utf8");
}
console.log("Built packs:", langs.join(", "));
