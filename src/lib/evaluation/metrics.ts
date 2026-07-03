// Pure scoring utilities for the AI evaluation framework.
// No server-only deps: safe to unit-test and reuse anywhere.

export interface SetMetrics {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number; // 0..1
  recall: number; // 0..1
  f1: number; // 0..1
  matched: string[]; // expected items that were found
  missed: string[]; // expected items not found
  falseAlarms: string[]; // predicted items with no expected match
}

const STOP = new Set([
  "the", "and", "for", "with", "a", "an", "of", "to", "is", "are", "be", "in", "on",
  "missing", "gap", "gaps", "evidence", "procedure", "not", "no", "incomplete",
]);

function norm(s: string): Set<string> {
  return new Set(
    (s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter((w) => !STOP.has(w)),
  );
}

/**
 * Fuzzy match: an expected label is "found" if a predicted label shares enough
 * meaningful tokens (Jaccard-like) or one substring-contains the other.
 */
export function matches(predicted: string, expected: string, threshold = 0.34): boolean {
  const p = predicted.toLowerCase();
  const e = expected.toLowerCase();
  if (p.includes(e) || e.includes(p)) return true;

  const pa = norm(predicted);
  const ea = norm(expected);
  if (ea.size === 0) return false;
  let inter = 0;
  for (const w of ea) if (pa.has(w)) inter++;
  const overlap = inter / ea.size; // recall-oriented overlap vs the expected label
  return overlap >= threshold;
}

/** Compute precision/recall/F1 of a predicted label set against an expected set. */
export function setMetrics(predicted: string[], expected: string[], threshold = 0.34): SetMetrics {
  const matched: string[] = [];
  const missed: string[] = [];
  const usedPredicted = new Set<number>();

  for (const exp of expected) {
    let found = -1;
    for (let i = 0; i < predicted.length; i++) {
      if (usedPredicted.has(i)) continue;
      if (matches(predicted[i], exp, threshold)) {
        found = i;
        break;
      }
    }
    if (found >= 0) {
      usedPredicted.add(found);
      matched.push(exp);
    } else {
      missed.push(exp);
    }
  }

  const falseAlarms = predicted.filter((_, i) => !usedPredicted.has(i));

  const truePositives = matched.length;
  const falseNegatives = missed.length;
  const falsePositives = falseAlarms.length;

  const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 1;
  const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 1;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return { truePositives, falsePositives, falseNegatives, precision, recall, f1, matched, missed, falseAlarms };
}

export const pct = (n: number): number => Math.round(Math.max(0, Math.min(1, n)) * 100);

export const clamp100 = (n: number): number => Math.round(Math.max(0, Math.min(100, n)));

export function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Weighted average; weights need not sum to 1. */
export function weightedMean(parts: { value: number; weight: number }[]): number {
  const wsum = parts.reduce((a, p) => a + p.weight, 0);
  if (wsum <= 0) return 0;
  return parts.reduce((a, p) => a + p.value * p.weight, 0) / wsum;
}
