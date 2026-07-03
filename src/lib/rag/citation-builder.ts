import "server-only";
import type { CitationTargetType } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { RetrievedClause, DeclaredCitation, ResolvedCitation } from "./types";

/** Turns retrieved clauses into citation objects for the AI output JSON. */
export function citationsFromClauses(clauses: RetrievedClause[]): DeclaredCitation[] {
  return clauses.map((c) => ({
    standardCode: c.standardCode,
    clauseNo: c.clauseNo,
    reason: c.title,
    confidence: Math.min(0.95, Math.max(0.3, c.score)),
  }));
}

/**
 * Resolves declared citations (from AI output) against retrieved clauses so we
 * can attach real standardId/clauseId. Falls back to the retrieved set.
 */
export function resolveCitations(declared: DeclaredCitation[], retrieved: RetrievedClause[]): ResolvedCitation[] {
  const byKey = new Map(retrieved.map((c) => [`${c.standardCode}|${c.clauseNo}`.toLowerCase(), c]));
  const out: ResolvedCitation[] = [];
  const seen = new Set<string>();

  for (const d of declared) {
    const key = `${d.standardCode}|${d.clauseNo}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const match = byKey.get(key);
    out.push({
      standardId: match?.standardId ?? null,
      clauseId: match?.clauseId ?? null,
      standardCode: d.standardCode,
      clauseNo: d.clauseNo,
      summary: d.reason || match?.title || "",
      confidence: d.confidence,
    });
  }
  return out;
}

/** Replaces all citations for a target with the supplied set (idempotent for regenerate). */
export async function persistCitations(params: {
  companyId: string;
  targetType: CitationTargetType;
  targetId: string;
  citations: ResolvedCitation[];
  uploadedFileId?: string | null;
}): Promise<number> {
  await prisma.aICitation.deleteMany({ where: { companyId: params.companyId, targetType: params.targetType, targetId: params.targetId } });
  if (!params.citations.length) return 0;

  await prisma.aICitation.createMany({
    data: params.citations.map((c) => ({
      companyId: params.companyId,
      targetType: params.targetType,
      targetId: params.targetId,
      standardId: c.standardId,
      clauseId: c.clauseId,
      uploadedFileId: params.uploadedFileId ?? null,
      summary: `${c.standardCode} ${c.clauseNo}: ${c.summary}`.slice(0, 500),
      confidence: c.confidence,
    })),
  });
  return params.citations.length;
}

export async function listCitations(companyId: string, targetType: CitationTargetType, targetId: string) {
  const rows = await prisma.aICitation.findMany({
    where: { companyId, targetType, targetId }, orderBy: { confidence: "desc" },
  });
  return rows.map((r) => ({
    id: r.id, standardId: r.standardId, clauseId: r.clauseId, summary: r.summary, confidence: r.confidence,
  }));
}
