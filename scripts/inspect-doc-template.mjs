import fs from "fs";

const xml = fs.readFileSync("public/templates/doc-extracted/word/document.xml", "utf8");

const pg = xml.includes("pgBorders");
console.log("has pgBorders:", pg);
if (pg) {
  const m = xml.match(/<w:pgBorders[\s\S]*?<\/w:pgBorders>/);
  console.log(m?.[0]?.slice(0, 800));
}

const sect = xml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g);
console.log("sectPr count", sect?.length);
console.log(sect?.[0]?.slice(0, 1200));

const tblCount = (xml.match(/<w:tbl>/g) || []).length;
console.log("tables", tblCount);

// first table borders
const t0 = xml.indexOf("<w:tbl>");
if (t0 >= 0) {
  const chunk = xml.slice(t0, t0 + 3000);
  const borders = chunk.match(/<w:tblBorders[\s\S]*?<\/w:tblBorders>/);
  console.log("first table borders:", borders?.[0]);
}
