import fs from "fs";

const text = fs.readFileSync("src/lib/i18n/dictionaries.ts", "utf8");
const start = text.indexOf("en: {");
const end = text.indexOf("\n  tr:", start);
const body = text.slice(start, end);

const publicPrefixes = [
  "landing.",
  "auth.",
  "help.",
  "legal.",
  "demo.landing.",
  "brand.",
  "billing.",
  "plan.",
  "common.",
  "dashboard.",
  "topbar.",
  "composer.",
  "theme.",
  "lang.",
  "disclaimer.",
  "nav.",
  "demo.",
  "sales.",
];

const keys = {};
const entryRe = /"([^"]+)":\s*(?:"((?:\\.|[^"\\])*)"|([\s\S]*?)(?=,\s*\n\s*"(?:[^"]+)":|\n\s*\/\/|\n\s*}))/g;

let match;
while ((match = entryRe.exec(body)) !== null) {
  const key = match[1];
  if (process.argv[2] === "--public") {
    if (!publicPrefixes.some((p) => key === p || key.startsWith(p))) continue;
  }
  let raw = match[2] ?? match[3] ?? "";
  raw = raw.trim();
  if (raw.startsWith('"')) {
    const endQuote = raw.lastIndexOf('"');
    raw = raw.slice(1, endQuote);
  }
  raw = raw.replace(/\\n/g, "\n").replace(/\\"/g, '"');
  keys[key] = raw;
}

const outFile = process.argv[2] === "--public" ? "scripts/public-keys-en.json" : "scripts/all-keys-en.json";
fs.writeFileSync(outFile, JSON.stringify(keys, null, 2), "utf8");
console.error("wrote", outFile, Object.keys(keys).length, "keys");
