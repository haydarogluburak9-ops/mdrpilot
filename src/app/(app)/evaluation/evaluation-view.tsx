"use client";

import { useState } from "react";
import { Gauge, Loader2, AlertCircle, Play, GitCompareArrows, Trophy, Clock, DollarSign } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useI18n } from "@/components/providers/i18n-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Disclaimer } from "@/components/ui/disclaimer";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";

interface Scorecard {
  provider: string;
  model: string;
  cases: number;
  consultantScore: number;
  composerScore: number;
  auditScore: number;
  fileAnalysisScore: number;
  citationScore: number;
  documentQualityScore: number;
  complianceAccuracy: number;
  evidenceUsageScore: number;
  gapDetectionAccuracy: number;
  auditFindingAccuracy: number;
  hallucinationRisk: number;
  precision: number;
  recall: number;
  f1: number;
  overallAiScore: number;
  consultantProximityPercent: number;
  avgLatencyMs: number;
  estCostUsdPerRun: number;
  perCase: CaseResult[];
}

interface CaseResult {
  caseId: string;
  title: string;
  overall: number;
  consultant: { precision: number; recall: number; f1: number; gapDetectionAccuracy: number; hallucinationRisk: number; missed: string[]; falseAlarms: string[] };
  audit?: { findingAccuracy: number; majorAccuracy: number; minorAccuracy: number; capaAccuracy: number };
  composer?: { documentQuality: number; citationQuality: number; hallucinationRisk: number };
  fileAnalysis?: { fileScore: number; kindCorrect: boolean };
}

interface Report {
  generatedAt: string;
  caseCount: number;
  caseTitles: string[];
  runs: Scorecard[];
  best: { provider: string; model: string; overallAiScore: number; consultantProximityPercent: number } | null;
  comparison: boolean;
}

function scoreColor(v: number) {
  if (v >= 80) return "text-[hsl(var(--success))]";
  if (v >= 50) return "text-[hsl(var(--warning))]";
  return "text-[hsl(var(--destructive))]";
}
function riskColor(v: number) {
  if (v <= 20) return "text-[hsl(var(--success))]";
  if (v <= 50) return "text-[hsl(var(--warning))]";
  return "text-[hsl(var(--destructive))]";
}

function ScoreTile({ label, value, suffix = "", risk = false }: { label: string; value: number; suffix?: string; risk?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${risk ? riskColor(value) : scoreColor(value)}`}>
          {value}{suffix}
        </p>
      </CardContent>
    </Card>
  );
}

export function EvaluationView({
  provider, model, configured, availableProviders,
}: { provider: string; model: string; configured: boolean; availableProviders: string[] }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  async function run(compare: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/evaluation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compare }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("evaluation.failed"));
      setReport(data.report as Report);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("evaluation.failed"));
    } finally {
      setLoading(false);
    }
  }

  const primary = report?.runs[0];

  return (
    <div>
      <PageHeader title={t("evaluation.title")} description={t("evaluation.desc")} />
      <Disclaimer variant="info" className="mb-4" />

      <Card className="mb-5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {t("evaluation.activeProvider")}: <span className="uppercase">{provider}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {t("evaluation.model")}: {model}{" "}
                {configured
                  ? <Badge variant="success" className="ml-1">{t("evaluation.live")}</Badge>
                  : <Badge variant="muted" className="ml-1">{t("evaluation.mockMode")}</Badge>}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => run(false)} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {t("evaluation.run")}
            </Button>
            <Button
              variant="outline"
              onClick={() => run(true)}
              disabled={loading || availableProviders.length < 1}
              className="gap-1.5"
              title={availableProviders.length < 2 ? t("evaluation.compareHint") : undefined}
            >
              <GitCompareArrows className="h-4 w-4" />
              {t("evaluation.compare")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!configured && (
        <p className="mb-4 text-xs text-muted-foreground">{t("evaluation.mockNote")}</p>
      )}

      {error && (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}

      {loading && (
        <div className="space-y-2 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("evaluation.running")}
          </div>
          <AiAnalyzingHint />
        </div>
      )}

      {report && primary && !loading && (
        <div className="space-y-6">
          {/* Headline scores */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("evaluation.headline")}</h2>
              <p className="text-xs text-muted-foreground">
                {report.caseCount} {t("evaluation.cases")} · {new Date(report.generatedAt).toLocaleString()}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ScoreTile label={t("evaluation.overallScore")} value={primary.overallAiScore} />
              <ScoreTile label={t("evaluation.consultantScore")} value={primary.consultantScore} />
              <ScoreTile label={t("evaluation.composerScore")} value={primary.composerScore} />
              <ScoreTile label={t("evaluation.auditScore")} value={primary.auditScore} />
              <ScoreTile label={t("evaluation.fileScore")} value={primary.fileAnalysisScore} />
              <ScoreTile label={t("evaluation.citationScore")} value={primary.citationScore} />
              <ScoreTile label={t("evaluation.hallucination")} value={primary.hallucinationRisk} risk />
              <ScoreTile label={t("evaluation.proximity")} value={primary.consultantProximityPercent} suffix="%" />
            </div>
          </div>

          {/* Consultant precision/recall/F1 */}
          <div>
            <h2 className="mb-2 text-sm font-semibold">{t("evaluation.consultantBenchmark")}</h2>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <ScoreTile label={t("evaluation.precision")} value={primary.precision} suffix="%" />
              <ScoreTile label={t("evaluation.recall")} value={primary.recall} suffix="%" />
              <ScoreTile label="F1" value={primary.f1} suffix="%" />
              <ScoreTile label={t("evaluation.gapDetection")} value={primary.gapDetectionAccuracy} suffix="%" />
              <ScoreTile label={t("evaluation.complianceAcc")} value={primary.complianceAccuracy} suffix="%" />
              <ScoreTile label={t("evaluation.evidenceUsage")} value={primary.evidenceUsageScore} suffix="%" />
            </div>
          </div>

          {/* Provider comparison */}
          {report.comparison && report.runs.length > 1 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold">{t("evaluation.providerComparison")}</h2>
              <Card>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="px-4 py-2">{t("evaluation.provider")}</th>
                        <th className="px-4 py-2">{t("evaluation.model")}</th>
                        <th className="px-4 py-2">{t("evaluation.overallScore")}</th>
                        <th className="px-4 py-2">{t("evaluation.consultantScore")}</th>
                        <th className="px-4 py-2">{t("evaluation.composerScore")}</th>
                        <th className="px-4 py-2">{t("evaluation.auditScore")}</th>
                        <th className="px-4 py-2">{t("evaluation.citationScore")}</th>
                        <th className="px-4 py-2">{t("evaluation.hallucination")}</th>
                        <th className="px-4 py-2"><Clock className="inline h-3.5 w-3.5" /> {t("evaluation.latency")}</th>
                        <th className="px-4 py-2"><DollarSign className="inline h-3.5 w-3.5" /> {t("evaluation.cost")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.runs.map((r) => {
                        const isBest = report.best?.provider === r.provider;
                        return (
                          <tr key={r.provider} className="border-b border-border/50 last:border-0">
                            <td className="px-4 py-2 font-medium">
                              <span className="uppercase">{r.provider}</span>
                              {isBest && <Trophy className="ml-1 inline h-3.5 w-3.5 text-[hsl(var(--warning))]" />}
                            </td>
                            <td className="px-4 py-2 text-xs text-muted-foreground">{r.model}</td>
                            <td className={`px-4 py-2 font-semibold ${scoreColor(r.overallAiScore)}`}>{r.overallAiScore}</td>
                            <td className={`px-4 py-2 ${scoreColor(r.consultantScore)}`}>{r.consultantScore}</td>
                            <td className={`px-4 py-2 ${scoreColor(r.composerScore)}`}>{r.composerScore}</td>
                            <td className={`px-4 py-2 ${scoreColor(r.auditScore)}`}>{r.auditScore}</td>
                            <td className={`px-4 py-2 ${scoreColor(r.citationScore)}`}>{r.citationScore}</td>
                            <td className={`px-4 py-2 ${riskColor(r.hallucinationRisk)}`}>{r.hallucinationRisk}</td>
                            <td className="px-4 py-2 text-xs">{r.avgLatencyMs} ms</td>
                            <td className="px-4 py-2 text-xs">${r.estCostUsdPerRun}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
              <p className="mt-1 text-[11px] text-muted-foreground">{t("evaluation.costEstimate")}</p>
            </div>
          )}

          {/* Per-case breakdown */}
          <div>
            <h2 className="mb-2 text-sm font-semibold">{t("evaluation.perCase")}</h2>
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2">{t("evaluation.case")}</th>
                      <th className="px-4 py-2">P / R / F1</th>
                      <th className="px-4 py-2">{t("evaluation.gapDetection")}</th>
                      <th className="px-4 py-2">{t("evaluation.auditScore")}</th>
                      <th className="px-4 py-2">{t("evaluation.composerScore")}</th>
                      <th className="px-4 py-2">{t("evaluation.fileScore")}</th>
                      <th className="px-4 py-2">{t("evaluation.overallScore")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {primary.perCase.map((c) => (
                      <tr key={c.caseId} className="border-b border-border/50 last:border-0 align-top">
                        <td className="px-4 py-2">
                          <p className="font-medium">{c.title}</p>
                          {c.consultant.missed.length > 0 && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {t("evaluation.missed")}: {c.consultant.missed.join(", ")}
                            </p>
                          )}
                          {c.consultant.falseAlarms.length > 0 && (
                            <p className="text-[11px] text-[hsl(var(--warning))]">
                              {t("evaluation.falseAlarms")}: {c.consultant.falseAlarms.join(", ")}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          {c.consultant.precision} / {c.consultant.recall} / {c.consultant.f1}
                        </td>
                        <td className={`px-4 py-2 ${scoreColor(c.consultant.gapDetectionAccuracy)}`}>{c.consultant.gapDetectionAccuracy}</td>
                        <td className={`px-4 py-2 ${c.audit ? scoreColor(c.audit.findingAccuracy) : ""}`}>{c.audit ? c.audit.findingAccuracy : "—"}</td>
                        <td className={`px-4 py-2 ${c.composer ? scoreColor(c.composer.documentQuality) : ""}`}>{c.composer ? c.composer.documentQuality : "—"}</td>
                        <td className={`px-4 py-2 ${c.fileAnalysis ? scoreColor(c.fileAnalysis.fileScore) : ""}`}>{c.fileAnalysis ? c.fileAnalysis.fileScore : "—"}</td>
                        <td className={`px-4 py-2 font-semibold ${scoreColor(c.overall)}`}>{c.overall}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Proximity verdict */}
          {report.best && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-[hsl(var(--warning))]" />
                  <h2 className="text-sm font-semibold">{t("evaluation.verdict")}</h2>
                </div>
                <p className="mt-2 text-sm">
                  {t("evaluation.bestProvider")}: <span className="font-semibold uppercase">{report.best.provider}</span>{" "}
                  ({report.best.model}) — {t("evaluation.overallScore")} <span className="font-semibold">{report.best.overallAiScore}/100</span>.
                </p>
                <p className="mt-2 text-sm">
                  {t("evaluation.proximityVerdict")}{" "}
                  <span className={`text-lg font-bold ${scoreColor(report.best.consultantProximityPercent)}`}>
                    %{report.best.consultantProximityPercent}
                  </span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{t("evaluation.proximityNote")}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
