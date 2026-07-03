export type DiffOp = { type: "eq" | "add" | "del"; text: string };

/** Simple LCS-based line diff for comparing two document versions. */
export function diffLines(a: string, b: string): DiffOp[] {
  const left = a.replace(/\r\n/g, "\n").split("\n");
  const right = b.replace(/\r\n/g, "\n").split("\n");
  const n = left.length;
  const m = right.length;

  // LCS length table.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = left[i] === right[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (left[i] === right[j]) { ops.push({ type: "eq", text: left[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: "del", text: left[i] }); i++; }
    else { ops.push({ type: "add", text: right[j] }); j++; }
  }
  while (i < n) { ops.push({ type: "del", text: left[i] }); i++; }
  while (j < m) { ops.push({ type: "add", text: right[j] }); j++; }
  return ops;
}

export function diffStats(ops: DiffOp[]): { added: number; removed: number } {
  return ops.reduce(
    (acc, op) => {
      if (op.type === "add") acc.added++;
      else if (op.type === "del") acc.removed++;
      return acc;
    },
    { added: 0, removed: 0 },
  );
}
