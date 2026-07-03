import "server-only";
import { aiProviderInfo, availableProviders, buildNamedProvider } from "@/lib/ai/provider-factory";
import { loadGoldenCases, loadGoldenCase, type GoldenCase } from "./datasets";
import { evaluateCase, type EvalContext } from "./evaluator";
import { buildScorecard, type Scorecard } from "./scorecard";

export interface EvaluationReport {
  generatedAt: string;
  caseCount: number;
  caseTitles: string[];
  runs: Scorecard[];
  best: {
    provider: string;
    model: string;
    overallAiScore: number;
    consultantProximityPercent: number;
  } | null;
  comparison: boolean;
}

async function runProvider(
  cases: GoldenCase[],
  base: Omit<EvalContext, "provider">,
  provider: ReturnType<typeof buildNamedProvider>,
  providerLabel: string,
  model: string,
): Promise<Scorecard> {
  const ctx: EvalContext = { ...base, provider };
  const results = [];
  // Sequential per provider to avoid hammering rate limits.
  for (const c of cases) {
    results.push(await evaluateCase(c, ctx));
  }
  return buildScorecard(providerLabel, model, results);
}

export interface RunOptions {
  caseId?: string; // limit to a single golden case
  compare?: boolean; // run every provider that has an API key
}

/**
 * Runs the full evaluation harness against the golden dataset.
 * - Default: uses the currently-configured provider (or mock if none).
 * - compare=true: benchmarks every provider with a configured API key (OpenAI / Anthropic).
 */
export async function runEvaluation(
  companyId: string,
  companyName: string,
  opts: RunOptions = {},
): Promise<EvaluationReport> {
  const all = loadGoldenCases();
  const cases = opts.caseId ? all.filter((c) => c.id === opts.caseId) : all;
  const base = { companyId, companyName };

  const runs: Scorecard[] = [];

  const live = availableProviders();
  const wantCompare = opts.compare && live.length > 0;

  if (wantCompare) {
    for (const p of live) {
      const provider = buildNamedProvider(p);
      const model = provider?.modelId ?? p;
      runs.push(await runProvider(cases, base, provider, p, model));
    }
  } else {
    const info = aiProviderInfo();
    if (info.configured) {
      const p = info.provider === "anthropic" ? "anthropic" : "openai";
      const provider = buildNamedProvider(p);
      runs.push(await runProvider(cases, base, provider, info.provider, info.model));
    } else {
      // Mock baseline (deterministic engines only).
      runs.push(await runProvider(cases, base, null, "mock", "deterministic"));
    }
  }

  const best = runs.length
    ? runs.reduce((a, b) => (b.overallAiScore > a.overallAiScore ? b : a))
    : null;

  return {
    generatedAt: new Date().toISOString(),
    caseCount: cases.length,
    caseTitles: cases.map((c) => c.title),
    runs,
    best: best
      ? {
          provider: best.provider,
          model: best.model,
          overallAiScore: best.overallAiScore,
          consultantProximityPercent: best.consultantProximityPercent,
        }
      : null,
    comparison: Boolean(wantCompare),
  };
}

export { loadGoldenCase };
