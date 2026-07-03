import "server-only";
import type { StandardSourceType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { embed } from "./scoring";

/**
 * RAG indexing pipeline.
 *
 * Today this stores a lightweight term-frequency "embedding" inside Postgres
 * (KnowledgeChunk.embeddingJson). The retriever reads these vectors directly.
 * The interface is intentionally storage-agnostic so it can be swapped for
 * pgvector or an external vector DB (Qdrant) without touching call sites.
 */

function chunkText(text: string, size = 900, overlap = 120): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= size) return clean ? [clean] : [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    chunks.push(clean.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

/** (Re)indexes all clauses of a standard into KnowledgeChunk rows. */
export async function indexStandardClauses(standardId: string): Promise<number> {
  const standard = await prisma.standard.findUnique({ where: { id: standardId }, include: { clauses: true } });
  if (!standard) return 0;

  await prisma.knowledgeChunk.deleteMany({ where: { standardId } });

  const rows = standard.clauses.map((c) => {
    const expectations = [
      ...((c.documentExpectationsJson as string[] | null) ?? []),
      ...((c.evidenceExpectationsJson as string[] | null) ?? []),
    ].join(" ");
    const text = `${standard.code} ${c.clauseNo} ${c.title}. ${c.summary} ${expectations}`.trim();
    return {
      companyId: standard.companyId,
      standardId: standard.id,
      uploadedFileId: null,
      sourceType: standard.sourceType,
      title: `${standard.code} ${c.clauseNo} — ${c.title}`,
      text,
      embeddingJson: embed(text) as object,
      metadataJson: { clauseId: c.id, clauseNo: c.clauseNo, standardCode: standard.code } as object,
    };
  });
  if (rows.length) await prisma.knowledgeChunk.createMany({ data: rows });
  return rows.length;
}

/** Indexes free text for a (company-owned) standard/procedure into knowledge chunks. */
export async function indexStandardText(params: {
  standardId: string;
  companyId: string;
  sourceType: StandardSourceType;
  title: string;
  text: string;
}): Promise<number> {
  await prisma.knowledgeChunk.deleteMany({ where: { standardId: params.standardId } });
  const chunks = chunkText(params.text);
  if (!chunks.length) return 0;
  await prisma.knowledgeChunk.createMany({
    data: chunks.map((text, i) => ({
      companyId: params.companyId,
      standardId: params.standardId,
      uploadedFileId: null,
      sourceType: params.sourceType,
      title: `${params.title} (part ${i + 1})`,
      text,
      embeddingJson: embed(text) as object,
      metadataJson: { standardId: params.standardId, part: i + 1 } as object,
    })),
  });
  return chunks.length;
}

/** Indexes extracted text from an uploaded file into company-scoped knowledge chunks. */
export async function indexUploadedFile(params: {
  companyId: string;
  uploadedFileId: string;
  fileName: string;
  text: string;
  sourceType?: StandardSourceType;
}): Promise<number> {
  await prisma.knowledgeChunk.deleteMany({ where: { uploadedFileId: params.uploadedFileId } });
  const chunks = chunkText(params.text);
  if (!chunks.length) return 0;

  await prisma.knowledgeChunk.createMany({
    data: chunks.map((text, i) => ({
      companyId: params.companyId,
      standardId: null,
      uploadedFileId: params.uploadedFileId,
      sourceType: params.sourceType ?? "USER_UPLOADED_LICENSED",
      title: `${params.fileName} (part ${i + 1})`,
      text,
      embeddingJson: embed(text) as object,
      metadataJson: { uploadedFileId: params.uploadedFileId, part: i + 1 } as object,
    })),
  });
  return chunks.length;
}
