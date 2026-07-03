/**
 * Natural sort for MDR Annex I GSPR numbers (1, 2, … 9, 10.1, 23.2.a, 23.4.ab).
 * String sort incorrectly places "10.x" before "2".
 */

function segmentValue(part: string): number | string {
  if (/^\d+$/.test(part)) return parseInt(part, 10);
  return part.toLowerCase();
}

function parseParts(gsprNo: string): (number | string)[] {
  return gsprNo.split(".").map(segmentValue);
}

export function compareGsprNo(a: string, b: string): number {
  const pa = parseParts(a);
  const pb = parseParts(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i];
    const vb = pb[i];
    if (va === undefined) return -1;
    if (vb === undefined) return 1;
    if (typeof va === "number" && typeof vb === "number") {
      if (va !== vb) return va - vb;
    } else {
      const sa = String(va);
      const sb = String(vb);
      const cmp = sa.localeCompare(sb);
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}

export function sortByGsprNo<T extends { gsprNo: string }>(items: T[]): T[] {
  return [...items].sort((x, y) => compareGsprNo(x.gsprNo, y.gsprNo));
}
