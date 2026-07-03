import "server-only";
import { getMeteredAiProvider, extractJson } from "@/lib/ai/provider-factory";
import { AiTokenLimitError } from "@/lib/auth/errors";
import { retrieveClauses } from "@/lib/rag/retriever";
import { buildConsultantUser, consultantSystemPrompt } from "@/lib/ai/prompts/consultant.prompt";
import type { AiProvider, ChatMessage } from "@/lib/ai/types";
import { bandOf, type ComplianceStandardScope, type ConsultantResult, type Severity } from "./types";
import type { ComplianceSnapshot } from "./snapshot";

const SEVERITIES: Severity[] = ["Critical", "Major", "Minor", "Observation"];
const clampScore = (n: unknown, fb: number) => (typeof n === "number" && n >= 0 && n <= 100 ? Math.round(n) : fb);
const clamp01 = (n: unknown, fb: number) => (typeof n === "number" && n >= 0 && n <= 1 ? n : fb);

/**
 * Optionally enriches a deterministic ConsultantResult with the AI provider.
 * Always returns a valid result; falls back to the deterministic base on any error.
 */
export async function augmentConsultant(
  base: ConsultantResult,
  snap: ComplianceSnapshot,
  scope: ComplianceStandardScope,
  providerOverride?: AiProvider | null,
): Promise<ConsultantResult> {
  let ai = providerOverride ?? null;
  if (!ai) {
    try {
      ai = await getMeteredAiProvider({ companyId: snap.companyId, feature: "consultant" });
    } catch (err) {
      if (err instanceof AiTokenLimitError) throw err;
    }
  }
  if (!ai) return base;

  try {
    const clauses = await retrieveClauses(
      snap.companyId,
      `${snap.product?.name ?? ""} ${snap.product?.intendedPurpose ?? ""} ${scope}`,
      8,
    );

    const messages: ChatMessage[] = [
      { role: "system", content: consultantSystemPrompt },
      {
        role: "user",
        content: buildConsultantUser({
          standard: scope,
          productName: base.productName,
          deterministicSummary: base.summary,
          overallScore: base.overallScore,
          categoryScores: base.categoryScores as unknown as Record<string, number>,
          gaps: base.gaps.map((g) => ({
            title: g.title, severity: g.severity, standard: g.standard, clause: g.clause, currentSituation: g.currentSituation,
          })),
          clausesContext: clauses.map((c) => ({ standardCode: c.standardCode, clauseNo: c.clauseNo, title: c.title, summary: c.summary })),
        }),
      },
    ];

    const raw = await ai.complete(messages, { json: true });
    const json = extractJson(raw) as any;
    if (!json || typeof json !== "object") return base;

    const merged: ConsultantResult = { ...base };

    if (json.categoryScores && typeof json.categoryScores === "object") {
      merged.categoryScores = {
        technicalFile: clampScore(json.categoryScores.technicalFile, base.categoryScores.technicalFile),
        gspr: clampScore(json.categoryScores.gspr, base.categoryScores.gspr),
        risk: clampScore(json.categoryScores.risk, base.categoryScores.risk),
        clinical: clampScore(json.categoryScores.clinical, base.categoryScores.clinical),
        pms: clampScore(json.categoryScores.pms, base.categoryScores.pms),
        qms: clampScore(json.categoryScores.qms, base.categoryScores.qms),
        evidenceCoverage: clampScore(json.categoryScores.evidenceCoverage, base.categoryScores.evidenceCoverage),
        documentationQuality: clampScore(json.categoryScores.documentationQuality, base.categoryScores.documentationQuality),
        traceability: clampScore(json.categoryScores.traceability, base.categoryScores.traceability),
      };
    }
    merged.overallScore = clampScore(json.overallScore, base.overallScore);
    merged.band = bandOf(merged.overallScore);
    if (typeof json.summary === "string" && json.summary.trim()) merged.summary = json.summary.trim();
    merged.confidence = Math.max(base.confidence, clamp01(json.confidence, 0.8));

    if (Array.isArray(json.gaps) && json.gaps.length) {
      merged.gaps = json.gaps.slice(0, 40).map((g: any, i: number) => {
        const fb = base.gaps[i];
        return {
          title: String(g.title ?? fb?.title ?? "Gap"),
          severity: SEVERITIES.includes(g.severity) ? g.severity : (fb?.severity ?? "Minor"),
          standard: String(g.standard ?? fb?.standard ?? ""),
          clause: String(g.clause ?? fb?.clause ?? ""),
          requirementSummary: String(g.requirementSummary ?? fb?.requirementSummary ?? ""),
          whyItMatters: String(g.whyItMatters ?? fb?.whyItMatters ?? ""),
          currentSituation: String(g.currentSituation ?? fb?.currentSituation ?? ""),
          recommendedAction: String(g.recommendedAction ?? fb?.recommendedAction ?? ""),
          estimatedEffort: clampScore(g.estimatedEffort, fb?.estimatedEffort ?? 40),
          quickWin: typeof g.quickWin === "boolean" ? g.quickWin : (fb?.quickWin ?? false),
          dependencies: Array.isArray(g.dependencies) ? g.dependencies.map(String) : (fb?.dependencies ?? []),
          evidenceNeeded: Array.isArray(g.evidenceNeeded) ? g.evidenceNeeded.map(String) : (fb?.evidenceNeeded ?? []),
          confidence: clamp01(g.confidence, fb?.confidence ?? 0.7),
        };
      });
    }

    if (Array.isArray(json.topActions) && json.topActions.length) {
      merged.topActions = json.topActions.slice(0, 5).map((a: any) => ({
        title: String(a.title ?? ""),
        impact: clampScore(a.impact, 70),
        effort: clampScore(a.effort, 40),
        priority: SEVERITIES.includes(a.priority) ? a.priority : "Major",
      }));
    }

    if (Array.isArray(json.roadmap) && json.roadmap.length) {
      merged.roadmap = json.roadmap.slice(0, 8).map((w: any, i: number) => ({
        week: typeof w.week === "number" ? w.week : i + 1,
        focus: String(w.focus ?? `Week ${i + 1}`),
        items: Array.isArray(w.items) ? w.items.map(String) : [],
      }));
    }

    if (Array.isArray(json.citations) && json.citations.length) {
      merged.citations = json.citations.slice(0, 12).map((c: any) => ({
        standardCode: String(c.standardCode ?? ""),
        clauseNo: String(c.clauseNo ?? ""),
        reason: String(c.reason ?? ""),
        confidence: clamp01(c.confidence, 0.6),
      }));
    }

    return merged;
  } catch (err) {
    console.error("[compliance.ai] augmentation failed, using deterministic result", err);
    return base;
  }
}
