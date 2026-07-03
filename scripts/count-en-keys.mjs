import fs from "fs";

const text = fs.readFileSync("src/lib/i18n/dictionaries.ts", "utf8");
const start = text.indexOf("en: {");
const end = text.indexOf("\n  tr:", start);
const body = text.slice(start, end);
let count = 0;
for (const _ of body.matchAll(/"([^"]+)":/g)) count++;
console.log("en keys:", count);
