import fs from "fs";

const xml = fs.readFileSync("public/templates/doc-extracted/word/document.xml", "utf8");
const idx = xml.indexOf("ÜRETİCİ ADI");
if (idx < 0) {
  console.log("not found");
  process.exit(1);
}
const slice = xml.slice(idx - 3000, idx + 12000);
// paragraphs around manufacturer
const paras = slice.split("<w:p ");
for (let i = 0; i < Math.min(paras.length, 25); i++) {
  const p = paras[i];
  const texts = [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");
  const hasTab = p.includes("<w:tab");
  const tabs = p.match(/<w:tabs>[\s\S]*?<\/w:tabs>/);
  const indent = p.match(/<w:ind[^/]*\/>/);
  if (!texts.trim() && !hasTab) continue;
  console.log(`--- p${i} tab=${hasTab} ---`);
  if (tabs) console.log(tabs[0].slice(0, 200));
  if (indent) console.log(indent[0]);
  console.log(texts.slice(0, 120));
}
