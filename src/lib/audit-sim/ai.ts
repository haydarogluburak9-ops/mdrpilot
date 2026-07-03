import "server-only";
import { getMeteredAiProvider, extractJson } from "@/lib/ai/provider-factory";
import { AiTokenLimitError } from "@/lib/auth/errors";
import { retrieveClauses } from "@/lib/rag/retriever";
import { auditSimulatorSystemPrompt, buildAuditEvalUser } from "@/lib/ai/prompts/audit-simulator.prompt";
import type { AiProvider, ChatMessage } from "@/lib/ai/types";
import type { ComplianceSnapshot } from "@/lib/compliance/snapshot";
import type { AuditFindingDto, AuditSummary, CapaSuggestion, FindingSeverity } from "./types";
import type { AnsweredQuestion } from "./engine";

const SEVS: FindingSeverity[] = ["MAJOR", "MINOR", "OBSERVATION", "POSITIVE"];

/** Optionally augments deterministic audit results with the AI provider. Safe fallback. */
export async function augmentAudit(
  base: { findings: AuditFindingDto[]; summary: AuditSummary },
  answers: AnsweredQuestion[],
  snap: ComplianceSnapshot,
  standard: string,
  assessmentType: string,
  providerOverride?: AiProvider | null,
): Promise<{ findings: AuditFindingDto[]; summary: AuditSummary }> {
  let ai = providerOverride ?? null;
  if (!ai) {
    try {
      ai = await getMeteredAiProvider({ companyId: snap.companyId, feature: "audit-sim" });
    } catch (err) {
      if (err instanceof AiTokenLimitError) throw err;
    }
  }
  if (!ai) return base;

  try {
    const clauses = await retrieveClauses(snap.companyId, `${standard} audit ${snap.product?.name ?? ""}`, 6);
    const messages: ChatMessage[] = [
      { role: "system", content: auditSimulatorSystemPrompt },
      {
        role: "user",
        content: buildAuditEvalUser({
          standard, assessmentType,
          productName: snap.product?.name ?? null,
          score: base.summary.score,
          answers: answers.map((a) => ({ standardCode: a.standardCode, clauseNo: a.clauseNo, question: a.question, answerText: a.answerText })),
          clausesContext: clauses.map((c) => ({ standardCode: c.standardCode, clauseNo: c.clauseNo, title: c.title, summary: c.summary })),
        }),
      },
    ];

    const raw = await ai.complete(messages, { json: true });
    const json = extractJson(raw) as any;
    if (!json || typeof json !== "object") return base;

    const findings: AuditFindingDto[] = Array.isArray(json.findings) && json.findings.length
      ? json.findings.slice(0, 60).map((f: any) => ({
          standardCode: String(f.standardCode ?? ""),
          clauseNo: String(f.clauseNo ?? ""),
          severity: SEVS.includes(f.severity) ? f.severity : "OBSERVATION",
          description: String(f.description ?? ""),
          evidence: f.evidence != null ? String(f.evidence) : null,
          rootCause: f.rootCause != null ? String(f.rootCause) : null,
          correctiveAction: f.correctiveAction != null ? String(f.correctiveAction) : null,
          dueDateSuggestion: f.dueDateSuggestion != null ? String(f.dueDateSuggestion) : null,
          priority: typeof f.priority === "number" ? Math.round(f.priority) : 50,
        }))
      : base.findings;

    const capaSuggestions: CapaSuggestion[] = Array.isArray(json.capaSuggestions) && json.capaSuggestions.length
      ? json.capaSuggestions.slice(0, 40).map((c: any) => ({
          title: String(c.title ?? ""),
          rootCause: String(c.rootCause ?? ""),
          correctiveAction: String(c.correctiveAction ?? ""),
          dueDate: String(c.dueDate ?? new Date().toISOString()),
          priority: typeof c.priority === "number" ? Math.round(c.priority) : 50,
          standardCode: String(c.standardCode ?? ""),
          clauseNo: String(c.clauseNo ?? ""),
        }))
      : base.summary.capaSuggestions;

    const score = typeof json.score === "number" && json.score >= 0 && json.score <= 100 ? Math.round(json.score) : base.summary.score;

    return {
      findings,
      summary: {
        ...base.summary,
        score,
        major: findings.filter((f) => f.severity === "MAJOR").length,
        minor: findings.filter((f) => f.severity === "MINOR").length,
        observations: findings.filter((f) => f.severity === "OBSERVATION").length,
        positive: findings.filter((f) => f.severity === "POSITIVE").length,
        narrative: typeof json.narrative === "string" && json.narrative.trim() ? json.narrative.trim() : base.summary.narrative,
        capaSuggestions,
        confidence: typeof json.confidence === "number" ? Math.max(base.summary.confidence, json.confidence) : 0.8,
      },
    };
  } catch (err) {
    console.error("[audit-sim.ai] augmentation failed, using deterministic result", err);
    return base;
  }
}
