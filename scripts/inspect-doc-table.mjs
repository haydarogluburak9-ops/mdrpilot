import fs from "fs";

const xml = fs.readFileSync("public/templates/doc-extracted/word/document.xml", "utf8");
const parts = xml.split("<w:tbl");
for (let i = 1; i < parts.length; i++) {
  const t = parts[i].slice(0, 8000);
  if (!t.includes("SIRA NO") && !t.includes("YM-240")) continue;
  const rows = t.split("<w:tr");
  for (let j = 1; j < Math.min(rows.length, 6); j++) {
    const texts = [...rows[j].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");
    const sz = rows[j].match(/<w:sz w:val="(\d+)"/)?.[1] || "?";
    console.log(j, sz, texts.slice(0, 70));
  }
}
