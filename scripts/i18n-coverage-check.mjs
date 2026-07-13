import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../src/lib/i18n");
const dictSrc = fs.readFileSync(path.join(root, "dictionaries.ts"), "utf8");

function extractDictBlock(src, which) {
  const re =
    which === "en"
      ? /en:\s*\{([\s\S]*?)\n\s*\},\s*\n\s*tr:/
      : /tr:\s*\{([\s\S]*?)\n\s*\},\s*\n\};/;
  const m = src.match(re);
  if (!m) throw new Error(which + " block not found");
  return m[1];
}

function parseKeys(block) {
  const out = {};
  const re = /"([^"]+)":\s*"((?:\\.|[^"\\])*)"/g;
  let m;
  while ((m = re.exec(block))) {
    try {
      out[m[1]] = JSON.parse('"' + m[2] + '"');
    } catch {
      out[m[1]] = m[2];
    }
  }
  return out;
}

const en = parseKeys(extractDictBlock(dictSrc, "en"));
const tr = parseKeys(extractDictBlock(dictSrc, "tr"));
console.log("EN keys:", Object.keys(en).length);
console.log("TR keys:", Object.keys(tr).length);
const trMissing = Object.keys(en).filter((k) => !(k in tr));
console.log("TR missing vs EN:", trMissing.length);
if (trMissing.length) console.log("TR missing sample:", trMissing.slice(0, 30));

const langs = ["de", "fr", "es", "it", "nl"];
const report = {};
for (const lang of langs) {
  const pack = JSON.parse(fs.readFileSync(path.join(root, "locale-packs", lang + ".json"), "utf8"));
  const packKeys = Object.keys(pack);
  const missing = Object.keys(en).filter((k) => !(k in pack));
  let sameAsEn = 0;
  let translated = 0;
  for (const k of packKeys) {
    if (en[k] !== undefined && pack[k] === en[k]) sameAsEn++;
    else if (en[k] !== undefined) translated++;
  }
  report[lang] = { pack: packKeys.length, missing: missing.length, sameAsEn, translated, missingKeys: missing };
  console.log(
    lang +
      ": pack=" +
      packKeys.length +
      " missing=" +
      missing.length +
      " identicalToEN=" +
      sameAsEn +
      " different=" +
      translated,
  );
}

const deMissing = report.de.missingKeys;
const prefixes = {};
for (const k of deMissing) {
  const p = k.split(".").slice(0, 2).join(".");
  prefixes[p] = (prefixes[p] || 0) + 1;
}
console.log("\nDE missing top prefixes:");
Object.entries(prefixes)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 35)
  .forEach(([p, n]) => console.log(" ", n, p));

const es = JSON.parse(fs.readFileSync(path.join(root, "locale-packs/es.json"), "utf8"));
const samePref = {};
const sameSamples = [];
for (const k of Object.keys(es)) {
  if (en[k] !== undefined && es[k] === en[k] && /[A-Za-z]{4}/.test(String(es[k]))) {
    const p = k.split(".").slice(0, 2).join(".");
    samePref[p] = (samePref[p] || 0) + 1;
    if (sameSamples.length < 25) sameSamples.push(k + " => " + String(es[k]).slice(0, 80));
  }
}
console.log("\nES identical-to-EN top prefixes:");
Object.entries(samePref)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30)
  .forEach(([p, n]) => console.log(" ", n, p));
console.log("\nES identical samples:");
sameSamples.forEach((s) => console.log(" ", s));

// Write missing key list for sync script
fs.writeFileSync(
  path.join(__dirname, "i18n-missing-report.json"),
  JSON.stringify(
    {
      enCount: Object.keys(en).length,
      trMissing,
      byLang: Object.fromEntries(
        langs.map((l) => [
          l,
          {
            pack: report[l].pack,
            missing: report[l].missing,
            sameAsEn: report[l].sameAsEn,
            translated: report[l].translated,
          },
        ]),
      ),
      deMissingPrefixes: Object.entries(prefixes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50),
    },
    null,
    2,
  ),
);
console.log("\nWrote scripts/i18n-missing-report.json");
