import type { TermVector } from "./types";

const STOPWORDS = new Set([
  "and", "the", "for", "with", "this", "that", "from", "into", "shall", "must", "are", "all",
  "device", "devices", "product", "report", "requirement", "requirements", "general", "medical",
  "document", "documents", "information", "data", "file", "system", "process", "applicable",
  "where", "which", "such", "been", "have", "has", "its", "per", "any", "may", "not",
]);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter((w) => !STOPWORDS.has(w));
}

/** Local "embedding": a normalised term-frequency vector. */
export function embed(text: string): TermVector {
  const vec: TermVector = {};
  const toks = tokenize(text);
  for (const t of toks) vec[t] = (vec[t] ?? 0) + 1;
  // L2 normalise so cosine reduces to a dot product.
  let norm = 0;
  for (const v of Object.values(vec)) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  for (const k of Object.keys(vec)) vec[k] /= norm;
  return vec;
}

export function cosine(a: TermVector, b: TermVector): number {
  // Iterate the smaller vector for speed.
  const [small, large] = Object.keys(a).length <= Object.keys(b).length ? [a, b] : [b, a];
  let dot = 0;
  for (const [k, v] of Object.entries(small)) {
    const w = large[k];
    if (w) dot += v * w;
  }
  return dot;
}

/** Keyword-boost: fraction of explicit keywords present in the query. */
export function keywordBoost(query: string, keywords: string | null | undefined): number {
  if (!keywords) return 0;
  const q = query.toLowerCase();
  const list = keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (!list.length) return 0;
  let hits = 0;
  for (const k of list) if (k && q.includes(k)) hits++;
  return hits / list.length;
}
