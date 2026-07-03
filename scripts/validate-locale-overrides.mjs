import fs from "fs";
import path from "path";

const en = JSON.parse(fs.readFileSync("scripts/public-keys-en.json", "utf8"));
const langs = ["de", "fr", "es", "it", "nl"];

for (const lang of langs) {
  const overridePath = path.join("scripts/locale-overrides", `${lang}.json`);
  const overrides = fs.existsSync(overridePath)
    ? JSON.parse(fs.readFileSync(overridePath, "utf8"))
    : {};
  if (Object.keys(overrides).length < Object.keys(en).length * 0.9) {
    console.warn(`${lang}: only ${Object.keys(overrides).length} overrides`);
  }
}
