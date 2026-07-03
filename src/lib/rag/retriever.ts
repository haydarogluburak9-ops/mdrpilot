import "server-only";
import { prisma } from "@/lib/db";
import { embed, cosine, keywordBoost } from "./scoring";
import { RAG_TOPK_CLAUSES, RAG_TOPK_CHUNKS, type RetrievedClause, type RetrievedChunk, type TermVector } from "./types";

/**
 * Company-isolated clause retrieval.
 *
 * Searches the company's own standards/procedures PLUS public standards
 * (companyId = null AND isPublic = true). Never returns another company's data.
 */
export async function retrieveClauses(companyId: string, query: string, limit = RAG_TOPK_CLAUSES): Promise<RetrievedClause[]> {
  if (!query.trim()) return [];

  const clauses = await prisma.standardClause.findMany({
    where: {
      standard: { OR: [{ companyId }, { companyId: null, isPublic: true }] },
    },
    include: { standard: { select: { id: true, code: true, title: true, sourceType: true } } },
    take: 800,
  });
  if (!clauses.length) return [];

  const qVec = embed(query);

  const scored = clauses.map((c) => {
    const docExp = (c.documentExpectationsJson as string[] | null) ?? [];
    const evExp = (c.evidenceExpectationsJson as string[] | null) ?? [];
    const riskRel = (c.riskRelevanceJson as string[] | null) ?? [];
    const text = `${c.standard.code} ${c.clauseNo} ${c.title} ${c.summary} ${[...docExp, ...evExp].join(" ")}`;
    const sim = cosine(qVec, embed(text));
    const boost = keywordBoost(query, c.keywords);
    // Direct clause-number hit is a strong signal (e.g. "GSPR 10.4", "Annex II").
    const clauseHit = query.toLowerCase().includes(c.clauseNo.toLowerCase()) ? 0.4 : 0;
    const score = sim + boost * 0.5 + clauseHit;
    return {
      clause: c, docExp, evExp, riskRel, score,
    };
  });

  return scored
    .filter((s) => s.score > 0.02)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => ({
      clauseId: s.clause.id,
      standardId: s.clause.standard.id,
      standardCode: s.clause.standard.code,
      standardTitle: s.clause.standard.title,
      sourceType: s.clause.standard.sourceType,
      clauseNo: s.clause.clauseNo,
      title: s.clause.title,
      summary: s.clause.summary,
      documentExpectations: s.docExp,
      evidenceExpectations: s.evExp,
      riskRelevance: s.riskRel,
      score: Number(s.score.toFixed(4)),
    }));
}

/** Company-isolated free-text chunk retrieval (standards + uploaded files). */
export async function retrieveChunks(companyId: string, query: string, limit = RAG_TOPK_CHUNKS): Promise<RetrievedChunk[]> {
  if (!query.trim()) return [];

  const chunks = await prisma.knowledgeChunk.findMany({
    where: { OR: [{ companyId }, { companyId: null }] },
    take: 1500,
  });
  if (!chunks.length) return [];

  const qVec = embed(query);

  return chunks
    .map((c) => {
      const vec = (c.embeddingJson as TermVector | null) ?? embed(c.text);
      const score = cosine(qVec, vec);
      return { c, score };
    })
    .filter((s) => s.score > 0.02)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => ({
      id: s.c.id,
      title: s.c.title,
      text: s.c.text,
      sourceType: s.c.sourceType,
      standardId: s.c.standardId,
      uploadedFileId: s.c.uploadedFileId,
      score: Number(s.score.toFixed(4)),
    }));
}
