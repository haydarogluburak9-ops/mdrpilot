/**
 * Generates locale override JSON files.
 * Run: node scripts/translate-locale-packs.mjs [de|fr|es|it|nl]
 */
import fs from "fs";
import path from "path";

const only = process.argv.find((a) => ["de", "fr", "es", "it", "nl"].includes(a));
const useAllKeys = process.argv.includes("--all");
const keyFile = useAllKeys ? "scripts/all-keys-en.json" : "scripts/public-keys-en.json";
const en = JSON.parse(fs.readFileSync(keyFile, "utf8"));
const langs = [
  { code: "de", target: "de" },
  { code: "fr", target: "fr" },
  { code: "es", target: "es" },
  { code: "it", target: "it" },
  { code: "nl", target: "nl" },
];

async function translateText(text, target, attempt = 0) {
  if (!text.trim()) return text;
  const chunk = text.slice(0, 450);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${target}&dt=t&q=${encodeURIComponent(chunk)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const out = (data?.[0] ?? []).map((p) => p?.[0]).join("").trim();
    if (!out) return text;
    return out;
  } catch {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      return translateText(text, target, attempt + 1);
    }
    return text;
  }
}

async function translatePack(code, target) {
  const outPath = path.join("scripts", "locale-overrides", `${code}.json`);
  const out = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : {};
  const keys = Object.keys(en);
  let changed = 0;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const text = en[key];
    if (out[key] && out[key] !== text) continue;

    const translated = await translateText(text, target);
    out[key] = translated;
    if (translated !== text) changed++;

    if ((i + 1) % 25 === 0) {
      fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
      console.error(`${code} ${i + 1}/${keys.length} (+${changed})`);
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  return changed;
}

const selected = langs.filter((l) => !only || l.code === only);
if (!selected.length) {
  console.error("Unknown locale:", only);
  process.exit(1);
}

for (const { code, target } of selected) {
  console.log(`Translating ${code}...`);
  const changed = await translatePack(code, target);
  console.log(`Wrote scripts/locale-overrides/${code}.json (${changed} new translations)`);
}
