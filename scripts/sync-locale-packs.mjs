/**
 * Sync DE/FR/ES/IT/NL locale packs to EN key set and translate
 * missing / still-English strings via Google gtx (no API key).
 *
 * Usage:
 *   node scripts/sync-locale-packs.mjs              # full sync+translate
 *   node scripts/sync-locale-packs.mjs --dry-run    # report only
 *   node scripts/sync-locale-packs.mjs --lang=es    # one language
 *   node scripts/sync-locale-packs.mjs --limit=200  # cap translations
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../src/lib/i18n");
const cachePath = path.join(__dirname, ".i18n-translate-cache.json");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const langArg = args.find((a) => a.startsWith("--lang="))?.split("=")[1];
const limit = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || 0) || Infinity;

const TARGETS = {
  de: "de",
  fr: "fr",
  es: "es",
  it: "it",
  nl: "nl",
};

function extractEn(src) {
  const m = src.match(/en:\s*\{([\s\S]*?)\n\s*\},\s*\n\s*tr:/);
  if (!m) throw new Error("EN block not found");
  const out = {};
  const re = /"([^"]+)":\s*"((?:\\.|[^"\\])*)"/g;
  let x;
  while ((x = re.exec(m[1]))) {
    try {
      out[x[1]] = JSON.parse(`"${x[2]}"`);
    } catch {
      out[x[1]] = x[2];
    }
  }
  return out;
}

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(cachePath, "utf8"));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 0));
}

/** Protect {placeholders} and {{mustache}} during translation. */
function protect(s) {
  const tokens = [];
  const out = s.replace(/\{\{[^}]+\}\}|\{[a-zA-Z0-9_.]+\}/g, (m) => {
    const i = tokens.length;
    tokens.push(m);
    return `__PH${i}__`;
  });
  return { out, tokens };
}

function restore(s, tokens) {
  return s.replace(/__PH(\d+)__/g, (_, i) => tokens[Number(i)] ?? _);
}

async function translateText(text, tl, cache) {
  const key = `${tl}::${text}`;
  if (cache[key]) return cache[key];
  if (!text.trim()) return text;
  // Keep pure codes / short acronyms
  if (/^[A-Z0-9_./+\-]+$/.test(text) && text.length <= 12) {
    cache[key] = text;
    return text;
  }

  const { out, tokens } = protect(text);
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=" +
    encodeURIComponent(tl) +
    "&dt=t&q=" +
    encodeURIComponent(out);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`translate HTTP ${res.status}`);
  const json = await res.json();
  const translated = Array.isArray(json?.[0])
    ? json[0].map((row) => row?.[0] ?? "").join("")
    : out;
  const final = restore(translated, tokens);
  cache[key] = final;
  return final;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function sortObject(obj) {
  return Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));
}

async function main() {
  const en = extractEn(fs.readFileSync(path.join(root, "dictionaries.ts"), "utf8"));
  const cache = loadCache();
  const langs = langArg ? [langArg] : Object.keys(TARGETS);
  let translatedTotal = 0;

  for (const lang of langs) {
    if (!TARGETS[lang]) throw new Error(`Unknown lang ${lang}`);
    const packPath = path.join(root, "locale-packs", `${lang}.json`);
    const pack = JSON.parse(fs.readFileSync(packPath, "utf8"));
    const next = { ...pack };

    let added = 0;
    let toTranslate = [];

    for (const [k, v] of Object.entries(en)) {
      if (!(k in next)) {
        next[k] = v;
        added++;
        toTranslate.push(k);
      } else if (next[k] === v && /[A-Za-z]{3}/.test(v)) {
        // Still English copy
        toTranslate.push(k);
      }
    }

    console.log(`[${lang}] keys=${Object.keys(next).length} addedMissing=${added} needTranslate=${toTranslate.length}`);

    if (dryRun) continue;

    let done = 0;
    for (const k of toTranslate) {
      if (translatedTotal >= limit) break;
      const src = en[k];
      try {
        next[k] = await translateText(src, TARGETS[lang], cache);
        done++;
        translatedTotal++;
        if (done % 25 === 0) {
          process.stdout.write(`  ${lang} ${done}/${toTranslate.length}\r`);
          saveCache(cache);
          await sleep(80);
        } else {
          await sleep(35);
        }
      } catch (err) {
        console.error(`\n[${lang}] fail ${k}:`, err.message);
        saveCache(cache);
        await sleep(1500);
      }
    }
    console.log(`\n[${lang}] translated ${done}`);

    const sorted = sortObject(next);
    fs.writeFileSync(packPath, JSON.stringify(sorted, null, 2) + "\n", "utf8");
    saveCache(cache);
  }

  console.log("Done. Cache:", cachePath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
