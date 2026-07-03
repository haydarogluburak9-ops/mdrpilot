import fs from "fs";

const raw = fs.readFileSync("scripts/ref-risk-plan-extract.txt", "latin1");
const e1Start = raw.indexOf("6 TABLO E.1");
const e2Start = raw.indexOf("7 TABLO E.2");
const e8Start = raw.indexOf("8 ZARAR");
const e1Text = raw.slice(e1Start, e2Start);
const e2Text = raw.slice(e2Start, e8Start);

function parseBlock(text) {
  const rows = [];
  const parts = text.split(/\r/g);
  for (const part of parts) {
    const p = part.trim();
    if (!p || p.length < 5) continue;
    const m = /^(.*?)(N\/A|A)\s*(.*)$/s.exec(p);
    if (!m) continue;
    let hazard = m[1].replace(/\*/g, "").trim();
    if (hazard.length < 3 || hazard.length > 250) continue;
    if (/TABLO|Riskli|Risk affects|Tehlike|Examples of|signed with/i.test(hazard)) continue;
    rows.push({
      hazard: hazard.slice(0, 200),
      status: m[2],
      note: m[3].trim().slice(0, 400),
    });
  }
  return rows;
}

const e1 = parseBlock(e1Text);
const e2 = parseBlock(e2Text);

function toSeeds(rows, table) {
  return rows.map((r, i) => ({
    id: `${table}.${String(i + 1).padStart(3, "0")}`,
    table,
    hazardTr: r.hazard,
    hazardEn: r.note.split("\n").find((l) => /^[A-Za-z]/.test(l))?.trim() || r.hazard,
    defaultStatus: r.status,
    defaultNoteTr: r.note.split("\n")[0]?.trim() || "",
    defaultNoteEn: r.note.split("\n").slice(1).join(" ").trim() || r.note,
  }));
}

const out = {
  E1: toSeeds(e1, "E1"),
  E2: toSeeds(e2, "E2"),
};
fs.writeFileSync("src/lib/domain/risk-table-e-seeds.json", JSON.stringify(out, null, 2));
console.log("E1", out.E1.length, "E2", out.E2.length);
