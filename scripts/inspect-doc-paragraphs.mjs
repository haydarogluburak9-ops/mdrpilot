import fs from "fs";

const xml = fs.readFileSync("public/templates/doc-extracted/word/document.xml", "utf8");
// Extract first 150 w:t texts with approximate styles from nearby rPr
const parts = xml.split("<w:p ");
for (let i = 1; i < Math.min(parts.length, 120); i++) {
  const p = parts[i];
  const texts = [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");
  if (!texts.trim()) continue;
  const font = p.match(/w:ascii="([^"]+)"/)?.[1] || "?";
  const sz = p.match(/<w:sz w:val="(\d+)"/)?.[1] || "?";
  const color = p.match(/<w:color w:val="([^"]+)"/)?.[1] || "auto";
  const bold = p.includes("<w:b/>") || p.includes('<w:b w:val="1"');
  console.log(`${i}: [${font} ${sz}hp ${color} ${bold ? "B" : ""}] ${texts.slice(0, 80)}`);
}
