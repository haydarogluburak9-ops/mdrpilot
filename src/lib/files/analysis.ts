import "server-only";
import { z } from "zod";
import type { DocumentKind } from "@prisma/client";
import { getMeteredAiProvider, extractJson } from "@/lib/ai/provider-factory";
import { AiTokenLimitError } from "@/lib/auth/errors";
import { fileAnalysisPrompt } from "@/lib/ai/prompts/file-analysis.prompt";
import { retrieveClauses } from "@/lib/rag/retriever";
import { citationsFromClauses } from "@/lib/rag/citation-builder";
import type { RetrievedClause } from "@/lib/rag/types";

export const recommendedLinkSchema = z.object({
  targetType: z.enum(["GSPR", "TECHNICAL_FILE", "RISK"]),
  targetIdOrHint: z.string(),
  reason: z.string(),
  confidence: z.number().min(0).max(1).default(0.5),
});

export const fileCitationSchema = z.object({
  standardCode: z.string(),
  clauseNo: z.string(),
  reason: z.string().default(""),
  confidence: z.number().min(0).max(1).default(0.5),
});

export const fileAnalysisResultSchema = z.object({
  detectedDocumentKind: z.string().default("OTHER"),
  summary: z.string().default(""),
  relatedStandards: z.array(z.string()).default([]),
  citations: z.array(fileCitationSchema).default([]),
  possibleGsprItems: z.array(z.string()).default([]),
  possibleTechnicalFileSections: z.array(z.string()).default([]),
  possibleRiskItems: z.array(z.string()).default([]),
  missingInformation: z.array(z.string()).default([]),
  complianceGaps: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  recommendedLinks: z.array(recommendedLinkSchema).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
  disclaimer: z.string().default(""),
});

export type FileAnalysisResult = z.infer<typeof fileAnalysisResultSchema>;

export interface AnalysisProductContext {
  name: string;
  deviceClass: string;
  gsprItems: { id: string; gsprNo: string; requirementSummary: string }[];
  technicalSections: { id: string; key: string; title: string }[];
  riskItems: { id: string; hazard: string }[];
}

export interface AnalyzeFileInput {
  fileName: string;
  documentKind: DocumentKind;
  mimeType: string;
  extractedText: string;
  product?: AnalysisProductContext | null;
  companyId?: string | null;
}

const DISCLAIMER =
  "AI-generated classification for documentation support only. Not a regulatory determination; a qualified person must confirm evidence suitability.";

const STOPWORDS = new Set([
  "and", "the", "for", "with", "this", "that", "from", "into", "shall", "must", "device",
  "product", "report", "requirement", "requirements", "general", "safety", "performance",
  "medical", "test", "data", "information", "file", "document", "documents", "annex",
]);

function tokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of text.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []) {
    if (!STOPWORDS.has(w)) out.add(w);
  }
  return out;
}

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
}

function detectStandards(text: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /\bISO\s?\d{3,5}(?:-\d+)?\b/gi,
    /\bIEC\s?\d{3,5}(?:-\d+)?\b/gi,
    /\bEN\s?\d{3,5}(?:-\d+)?\b/gi,
    /\bMDR\b|\b2017\/745\b/gi,
    /\b21\s?CFR\s?\d+\b/gi,
    /\bASTM\s?[A-Z]?\d+\b/gi,
  ];
  for (const re of patterns) {
    for (const m of text.match(re) ?? []) found.add(m.replace(/\s+/g, " ").toUpperCase().trim());
  }
  return Array.from(found).slice(0, 12);
}

function detectKind(text: string, fallback: DocumentKind): DocumentKind {
  const t = text.toLowerCase();
  const rules: [DocumentKind, RegExp][] = [
    ["CERTIFICATE", /certificate|certified|notified body|ce mark|declaration of conformity/],
    ["RISK_FILE", /risk (management|analysis|assessment)|iso\s?14971|hazard/],
    ["CLINICAL_EVALUATION", /clinical evaluation|cer\b|literature (search|appraisal)/],
    ["IFU", /instructions? for use|\bifu\b|intended purpose/],
    ["LABEL", /\blabel\b|udi-di|lot number|expiry/],
    ["PMCF", /post.?market clinical follow|\bpmcf\b/],
    ["PMS", /post.?market surveillance|\bpms\b|vigilance/],
    ["TECHNICAL_DRAWING", /technical drawing|dimension|tolerance|\bdwg\b|cad/],
    ["TEST_REPORT", /test report|validation|biocompat|sterilization|sterility|10993|11135|11607/],
  ];
  for (const [kind, re] of rules) if (re.test(t)) return kind;
  return fallback;
}

/** Deterministic, offline analysis engine. Always returns a valid result. */
function deterministicAnalysis(input: AnalyzeFileInput): FileAnalysisResult {
  const haystack = `${input.fileName} ${input.extractedText}`;
  const hay = tokens(haystack);
  const p = input.product;

  const relatedStandards = detectStandards(haystack);
  const detectedDocumentKind = detectKind(haystack, input.documentKind);

  const recommendedLinks: FileAnalysisResult["recommendedLinks"] = [];
  const possibleGsprItems: string[] = [];
  const possibleTechnicalFileSections: string[] = [];
  const possibleRiskItems: string[] = [];

  if (p) {
    const gsprScored = p.gsprItems
      .map((g) => ({ g, score: overlap(hay, tokens(`${g.gsprNo} ${g.requirementSummary}`)) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    for (const { g, score } of gsprScored) {
      possibleGsprItems.push(`GSPR ${g.gsprNo} — ${g.requirementSummary}`);
      recommendedLinks.push({
        targetType: "GSPR",
        targetIdOrHint: g.id,
        reason: `Document terms overlap with GSPR ${g.gsprNo} (${g.requirementSummary}).`,
        confidence: Math.min(0.4 + score * 0.12, 0.92),
      });
    }

    const secScored = p.technicalSections
      .map((s) => ({ s, score: overlap(hay, tokens(s.title)) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    for (const { s, score } of secScored) {
      possibleTechnicalFileSections.push(s.title);
      recommendedLinks.push({
        targetType: "TECHNICAL_FILE",
        targetIdOrHint: s.id,
        reason: `Content appears relevant to technical file section "${s.title}".`,
        confidence: Math.min(0.4 + score * 0.15, 0.9),
      });
    }

    const riskScored = p.riskItems
      .map((r) => ({ r, score: overlap(hay, tokens(r.hazard)) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    for (const { r, score } of riskScored) {
      possibleRiskItems.push(r.hazard);
      recommendedLinks.push({
        targetType: "RISK",
        targetIdOrHint: r.id,
        reason: `May provide verification evidence for hazard "${r.hazard}".`,
        confidence: Math.min(0.35 + score * 0.15, 0.85),
      });
    }
  }

  const warnings: string[] = [];
  const missingInformation: string[] = [];
  const complianceGaps: string[] = [];

  if (!input.extractedText || input.extractedText.startsWith("[image")) {
    warnings.push("No machine-readable text extracted; classification is based on filename and document kind only.");
    missingInformation.push("Searchable text (the file may be a scan/image).");
  }
  if (relatedStandards.length === 0) {
    missingInformation.push("No explicit standard references (e.g., ISO/IEC/EN) detected in the document.");
  }
  if (recommendedLinks.length === 0 && p) {
    complianceGaps.push("Could not confidently map this document to existing GSPR, technical file or risk items.");
  }

  const summaryBits = [
    `${detectedDocumentKind.replace(/_/g, " ").toLowerCase()} document`,
    p ? `for ${p.name}` : "",
    relatedStandards.length ? `referencing ${relatedStandards.slice(0, 3).join(", ")}` : "",
    recommendedLinks.length ? `with ${recommendedLinks.length} suggested evidence link(s)` : "",
  ].filter(Boolean);

  const confidence = Math.min(
    0.3 + (input.extractedText && !input.extractedText.startsWith("[image") ? 0.2 : 0) +
      relatedStandards.length * 0.05 + recommendedLinks.length * 0.05,
    0.9,
  );

  return {
    detectedDocumentKind,
    summary: `Detected ${summaryBits.join(" ")}.`,
    relatedStandards,
    citations: [],
    possibleGsprItems,
    possibleTechnicalFileSections,
    possibleRiskItems,
    missingInformation,
    complianceGaps,
    warnings,
    recommendedLinks,
    confidence,
    disclaimer: DISCLAIMER,
  };
}

function buildProductContext(p: AnalysisProductContext | null | undefined): string | undefined {
  if (!p) return undefined;
  return [
    `Product: ${p.name} (class ${p.deviceClass})`,
    `GSPR items: ${p.gsprItems.map((g) => `[${g.id}] ${g.gsprNo}: ${g.requirementSummary}`).join("; ")}`,
    `Technical file sections: ${p.technicalSections.map((s) => `[${s.id}] ${s.title}`).join("; ")}`,
    `Risk items: ${p.riskItems.map((r) => `[${r.id}] ${r.hazard}`).join("; ")}`,
  ].join("\n");
}

/**
 * Analyse an uploaded file. Uses the live AI provider when configured (validated
 * against the rich schema) and always falls back to the deterministic engine.
 */
export async function analyzeFile(
  input: AnalyzeFileInput,
  providerOverride?: import("@/lib/ai/types").AiProvider | null,
): Promise<FileAnalysisResult & { _clauses?: RetrievedClause[] }> {
  const deterministic = deterministicAnalysis(input);

  // Company-isolated clause retrieval for citations.
  let clauses: RetrievedClause[] = [];
  if (input.companyId) {
    const query = [input.fileName, deterministic.summary, deterministic.relatedStandards.join(" "), input.extractedText.slice(0, 2000)].join(" ");
    clauses = await retrieveClauses(input.companyId, query, 5);
  }
  const ragCitations = citationsFromClauses(clauses);
  deterministic.citations = ragCitations;

  let provider = providerOverride ?? null;
  if (!provider && input.companyId) {
    try {
      provider = await getMeteredAiProvider({ companyId: input.companyId, feature: "file-analysis" });
    } catch (err) {
      if (err instanceof AiTokenLimitError) throw err;
    }
  }
  if (!provider) {
    return { ...deterministic, _clauses: clauses };
  }

  try {
    const user = fileAnalysisPrompt.buildUser({
      fileName: input.fileName,
      mimeType: input.mimeType,
      extractedText: input.extractedText,
      productContext: buildProductContext(input.product),
      clausesContext: clauses.length
        ? clauses.map((c) => `${c.standardCode} ${c.clauseNo} — ${c.title}: ${c.summary}`).join("\n")
        : undefined,
    });
    const raw = await provider.complete(
      [
        { role: "system", content: fileAnalysisPrompt.system },
        { role: "user", content: user },
      ],
      { json: true },
    );
    const parsed = fileAnalysisResultSchema.safeParse(extractJson(raw));
    if (parsed.success) {
      // Merge: keep deterministic links if the model returned none (so linking still works by id).
      return {
        ...parsed.data,
        disclaimer: parsed.data.disclaimer || DISCLAIMER,
        recommendedLinks: parsed.data.recommendedLinks.length
          ? parsed.data.recommendedLinks
          : deterministic.recommendedLinks,
        citations: parsed.data.citations.length ? parsed.data.citations : ragCitations,
        _clauses: clauses,
      };
    }
  } catch (err) {
    console.error("[file-analysis] provider failed, using deterministic engine", err);
  }
  return { ...deterministic, _clauses: clauses };
}
