"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, AlertCircle, Zap, ChevronRight, Target, CalendarRange, BookOpen, FileDown } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useI18n } from "@/components/providers/i18n-provider";
import { displayStandardCode } from "@/lib/domain/standards-catalog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Disclaimer } from "@/components/ui/disclaimer";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { ScoreRing } from "@/components/ui/score-ring";
import {
  COMPLIANCE_STANDARDS,
  type CategoryScores,
  type ComplianceStandardScope,
  type ConsultantResult,
  type Severity,
} from "@/lib/compliance/types";
import type { ProductLite } from "@/lib/data/queries";

const SEV_BADGE: Record<Severity, "destructive" | "warning" | "secondary" | "muted"> = {
  Critical: "destructive", Major: "warning", Minor: "secondary", Observation: "muted",
};

function scoreColor(v: number) {
  if (v >= 80) return "text-[hsl(var(--success))]";
  if (v >= 50) return "text-[hsl(var(--warning))]";
  return "text-[hsl(var(--destructive))]";
}
function barColor(v: number) {
  if (v >= 80) return "bg-[hsl(var(--success))]";
  if (v >= 50) return "bg-[hsl(var(--warning))]";
  return "bg-[hsl(var(--destructive))]";
}

export function ConsultantView({ products, canAnalyze }: { products: ProductLite[]; canAnalyze: boolean }) {
  const { t } = useI18n();
  const [productId, setProductId] = useState<string>(products[0]?.id ?? "");
  const [standard, setStandard] = useState<ComplianceStandardScope>("COMBINED");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConsultantResult | null>(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/consultant/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: productId || undefined, standard }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data.result as ConsultantResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t("consultant.title")}
        description={t("consultant.desc")}
      />
      <Disclaimer variant="info" />

      <div className="mt-4 grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Left panel */}
        <Card className="h-fit">
          <CardContent className="space-y-4 p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("consultant.product")}</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="">{t("consultant.allProducts")}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} · {p.deviceClass.replace("CLASS_", "Class ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("consultant.standard")}</label>
              <select
                value={standard}
                onChange={(e) => setStandard(e.target.value as ComplianceStandardScope)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                {COMPLIANCE_STANDARDS.map((s) => (
                  <option key={s.value} value={s.value}>{s.value === "COMBINED" ? t("consultant.combined") : s.label}</option>
                ))}
              </select>
            </div>
            <Button onClick={analyze} disabled={loading || !canAnalyze} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t("consultant.analyze")}
            </Button>
            {loading && <AiAnalyzingHint />}
            {!canAnalyze && (
              <p className="text-xs text-muted-foreground">{t("consultant.noPermission")}</p>
            )}
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          {!result && !loading && (
            <EmptyState
              icon={Sparkles}
              title={t("consultant.empty.title")}
              description={t("consultant.emptyDesc")}
            />
          )}
          {loading && (
            <Card><CardContent className="flex items-center justify-center gap-3 p-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> {t("consultant.scanning")}
            </CardContent></Card>
          )}
          {result && !loading && <ResultDashboard result={result} />}
        </div>
      </div>
    </div>
  );
}

function ResultDashboard({ result }: { result: ConsultantResult }) {
  const { t } = useI18n();
  const router = useRouter();
  const [exporting, setExporting] = useState(false);

  async function exportExecutive() {
    setExporting(true);
    try {
      const res = await fetch("/api/executive/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: result.productId ?? undefined, standard: result.standard }),
      });
      if (res.ok) router.push("/exports");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      {/* Score + summary */}
      <Card>
        <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-center">
          <ScoreRing score={result.overallScore} size={120} label={t("consultant.overall")} />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{result.summary}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{t("consultant.aiConfidence")} {Math.round(result.confidence * 100)}%</Badge>
              <Badge variant="outline">{result.gaps.length} {t("consultant.gaps")}</Badge>
              <Badge variant="destructive">{result.gaps.filter((g) => g.severity === "Critical").length} {t("consultant.criticalCount")}</Badge>
            </div>
          </div>
          <Button variant="outline" onClick={exportExecutive} disabled={exporting} className="shrink-0">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} {t("consultant.executiveReport")}
          </Button>
        </CardContent>
      </Card>

      {/* Sub-scores */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">{t("consultant.categoryScores")}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(result.categoryScores) as (keyof CategoryScores)[]).map((k) => {
              const v = result.categoryScores[k];
              return (
                <div key={k} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t(`consultant.cat.${k}`)}</span>
                    <span className={`font-semibold ${scoreColor(v)}`}>{v}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                    <div className={`h-1.5 rounded-full ${barColor(v)}`} style={{ width: `${v}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top actions */}
      {result.topActions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-primary" /> {t("consultant.topActions")}</h3>
            <div className="space-y-2">
              {result.topActions.map((a, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium">{a.title}</span>
                  <Badge variant="outline" className="text-[10px]">{t("consultant.impact")} {a.impact}</Badge>
                  <Badge variant="outline" className="text-[10px]">{t("consultant.effort")} {a.effort}</Badge>
                  <Badge variant={SEV_BADGE[a.priority]} className="text-[10px]">{t(`sev.${a.priority}`)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gaps */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">{t("consultant.gapAnalysis")} ({result.gaps.length})</h3>
          <div className="space-y-3">
            {result.gaps.map((g, i) => (
              <div key={i} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={SEV_BADGE[g.severity]}>{t(`sev.${g.severity}`)}</Badge>
                  <span className="font-medium">{g.title}</span>
                  {g.quickWin && <Badge variant="success" className="gap-1 text-[10px]"><Zap className="h-3 w-3" /> {t("consultant.quickWin")}</Badge>}
                  <span className="ml-auto text-xs text-muted-foreground">{displayStandardCode(g.standard)} · {g.clause}</span>
                </div>
                <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                  <Field label={t("consultant.field.requirement")} value={g.requirementSummary} />
                  <Field label={t("consultant.field.whyItMatters")} value={g.whyItMatters} />
                  <Field label={t("consultant.field.currentSituation")} value={g.currentSituation} />
                  <Field label={t("consultant.field.recommendedAction")} value={g.recommendedAction} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
                  <Badge variant="outline">{t("consultant.effort")} {g.estimatedEffort}</Badge>
                  <Badge variant="outline">{t("consultant.confidence")} {Math.round(g.confidence * 100)}%</Badge>
                  {g.evidenceNeeded.map((e, j) => (
                    <Badge key={j} variant="muted" className="gap-1"><ChevronRight className="h-3 w-3" />{e}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Roadmap */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><CalendarRange className="h-4 w-4 text-primary" /> {t("consultant.roadmapTitle")}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {result.roadmap.map((w) => (
              <div key={w.week} className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold text-primary">{t("consultant.week")} {w.week}</p>
                <p className="mb-2 text-[11px] text-muted-foreground">{w.focus}</p>
                <ul className="space-y-1 text-xs">
                  {w.items.map((it, i) => <li key={i} className="flex gap-1.5"><span className="text-primary">•</span>{it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Citations */}
      {result.citations.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><BookOpen className="h-4 w-4 text-primary" /> {t("consultant.regulatoryReferences")}</h3>
            <div className="flex flex-wrap gap-2">
              {result.citations.map((c, i) => (
                <Badge key={i} variant="outline" className="text-[11px]" title={c.reason}>
                  {displayStandardCode(c.standardCode)} {c.clauseNo}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5">{value || "—"}</p>
    </div>
  );
}
