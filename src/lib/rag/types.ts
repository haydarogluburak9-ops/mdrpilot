import type { StandardSourceType } from "@prisma/client";

/** A structured clause/requirement retrieved by the RAG layer. */
export interface RetrievedClause {
  clauseId: string;
  standardId: string;
  standardCode: string;
  standardTitle: string;
  sourceType: StandardSourceType;
  clauseNo: string;
  title: string;
  summary: string;
  documentExpectations: string[];
  evidenceExpectations: string[];
  riskRelevance: string[];
  score: number;
}

/** A free-text knowledge fragment (from a standard summary, procedure or uploaded file). */
export interface RetrievedChunk {
  id: string;
  title: string;
  text: string;
  sourceType: StandardSourceType;
  standardId: string | null;
  uploadedFileId: string | null;
  score: number;
}

/** Citation as declared by the AI output JSON. */
export interface DeclaredCitation {
  standardCode: string;
  clauseNo: string;
  reason: string;
  confidence: number;
}

/** A resolved citation ready to persist / render. */
export interface ResolvedCitation {
  standardId: string | null;
  clauseId: string | null;
  standardCode: string;
  clauseNo: string;
  summary: string;
  confidence: number;
}

/** Term-frequency vector used for the lightweight local embedding. */
export type TermVector = Record<string, number>;

export const RAG_TOPK_CLAUSES = 6;
export const RAG_TOPK_CHUNKS = 5;
