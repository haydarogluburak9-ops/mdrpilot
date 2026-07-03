"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2, FileDown, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/ui/score-ring";
import { Disclaimer } from "@/components/ui/disclaimer";
import { useI18n } from "@/components/providers/i18n-provider";
import { displayStandardCode } from "@/lib/domain/standards-catalog";
import type { AuditSummary, FindingSeverity } from "@/lib/audit-sim/types";

interface QuestionRow {
  id: string; order: number; standardCode: string; clauseNo: string; question: string; expectedEvidence: string | null; answer: string;
}
interface FindingRow {
  id: string; standardCode: string; clauseNo: string; severity: FindingSeverity; description: string;
  evidence: string | null; rootCause: string | null; correctiveAction: string | null; dueDateSuggestion: string | null; priority: number;
}
export interface AuditSessionDetail {
  id: string; standard: string; assessmentType: string; status: string; score: number | null;
  productName: string | null; summary: AuditSummary | null; createdAt: string; completedAt: string | null;
  questions: QuestionRow[]; findings: FindingRow[];
}

const SEV_BADGE: Record<FindingSeverity, "destructive" | "warning" | "muted" | "success"> = {
  MAJOR: "destructive", MINOR: "warning", OBSERVATION: "muted", POSITIVE: "success",
};

export function AuditDetailView({ session, canEdit }: { session: AuditSessionDetail; canEdit: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(session.questions.map((q) => [q.id, q.answer])),
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [language, setLanguage] = useState<"tr" | "en">("tr");
  const inProgress = session.status === "IN_PROGRESS";

  async function saveAnswer(questionId: string) {
    setSaving(questionId);
    try {
      await fetch(`/api/audit-simulator/${session.id}/answer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, answerText: answers[questionId] ?? "" }),
      });
    } finally {
      setSaving(null);
    }
  }

  async function complete() {
    setCompleting(true);
    try {
      // Persist all answers first.
      await Promise.all(session.questions.map((q) =>
        fetch(`/api/audit-simulator/${session.id}/answer`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: q.id, answerText: answers[q.id] ?? "" }),
        }),
      ));
      const res = await fetch(`/api/audit-simulator/${session.id}/complete`, { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setCompleting(false);
    }
  }

  async function exportReport(format: string) {
    setExporting(format);
    try {
      const res = await fetch(`/api/audit-simulator/${session.id}/export`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ format, language }),
      });
      if (res.ok) router.push("/exports");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div>
      <Link href="/audit-simulator" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("auditSim.back")}
      </Link>
      <PageHeader
        title={`${session.standard.replace("_", " ")} ${t("auditSim.auditSuffix")}`}
        description={`${session.productName ?? t("auditSim.companyWide")} · ${session.assessmentType}`}
        actions={
          session.status === "COMPLETED" ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "tr" | "en")}
                className="rounded-lg border border-input bg-card px-2 py-2 text-sm"
                aria-label={t("auditSim.docLanguage")}
              >
                <option value="tr">TR</option>
                <option value="en">EN (rev …e)</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => exportReport("pdf")} disabled={!!exporting}>{exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} PDF</Button>
              <Button variant="outline" size="sm" onClick={() => exportReport("docx")} disabled={!!exporting}>DOCX</Button>
              <Button variant="outline" size="sm" onClick={() => exportReport("findings")} disabled={!!exporting}>Findings XLSX</Button>
              <Button variant="outline" size="sm" onClick={() => exportReport("capa")} disabled={!!exporting}>CAPA XLSX</Button>
            </div>
          ) : undefined
        }
      />
      <Disclaimer />

      {session.status === "COMPLETED" && (
        <div className="mt-4 space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row">
              <ScoreRing score={session.score ?? 0} size={120} label={t("auditSim.auditLabel")} />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{session.summary?.narrative}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <Badge variant="destructive">{session.summary?.major ?? 0} {t("auditSim.major")}</Badge>
                  <Badge variant="warning">{session.summary?.minor ?? 0} {t("auditSim.minor")}</Badge>
                  <Badge variant="muted">{session.summary?.observations ?? 0} {t("auditSim.observations")}</Badge>
                  <Badge variant="success">{session.summary?.positive ?? 0} {t("auditSim.positive")}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">{t("auditSim.detailedFindings")} ({session.findings.length})</h3>
              <div className="space-y-3">
                {session.findings.map((f) => (
                  <div key={f.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={SEV_BADGE[f.severity]}>{t(`findingSev.${f.severity}`)}</Badge>
                      <span className="text-sm font-medium">{f.description}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{displayStandardCode(f.standardCode)} · {f.clauseNo}</span>
                    </div>
                    {f.severity !== "POSITIVE" && (
                      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                        {f.rootCause && <p><span className="font-medium text-muted-foreground">{t("auditSim.rootCause")}: </span>{f.rootCause}</p>}
                        {f.correctiveAction && <p><span className="font-medium text-muted-foreground">{t("auditSim.correctiveAction")}: </span>{f.correctiveAction}</p>}
                        {f.dueDateSuggestion && <p><span className="font-medium text-muted-foreground">{t("auditSim.dueShort")}: </span>{f.dueDateSuggestion.slice(0, 10)}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {session.summary?.capaSuggestions && session.summary.capaSuggestions.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold">{t("auditSim.suggestedCapa")}</h3>
                <div className="space-y-2">
                  {session.summary.capaSuggestions.map((c, i) => (
                    <div key={i} className="rounded-lg border border-border p-3 text-xs">
                      <p className="font-medium">{c.title}</p>
                      <p className="mt-1 text-muted-foreground">{c.correctiveAction}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{displayStandardCode(c.standardCode)} {c.clauseNo} · {t("auditSim.due")} {c.dueDate?.slice(0, 10)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Interview */}
      <Card className="mt-4">
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">{inProgress ? t("auditSim.auditorQuestions") : t("auditSim.auditInterview")}</h3>
          <div className="space-y-4">
            {session.questions.map((q) => (
              <div key={q.id} className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{q.order}</span>
                  <p className="text-sm font-medium">{q.question}</p>
                  <span className="ml-auto text-xs text-muted-foreground">{displayStandardCode(q.standardCode)} · {q.clauseNo}</span>
                </div>
                {q.expectedEvidence && <p className="mt-1 pl-8 text-xs text-muted-foreground">{t("auditSim.expectedEvidence")}: {q.expectedEvidence}</p>}
                <div className="mt-2 pl-8">
                  {inProgress && canEdit ? (
                    <div className="flex items-start gap-2">
                      <textarea
                        value={answers[q.id] ?? ""}
                        onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                        onBlur={() => saveAnswer(q.id)}
                        rows={2}
                        placeholder={t("auditSim.answerPlaceholder")}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                      />
                      {saving === q.id && <Loader2 className="mt-2 h-4 w-4 animate-spin text-muted-foreground" />}
                      {saving !== q.id && (answers[q.id] ?? "").trim() && <Save className="mt-2 h-4 w-4 text-muted-foreground" />}
                    </div>
                  ) : (
                    <p className="text-sm">{answers[q.id] || <span className="text-muted-foreground">{t("auditSim.noAnswer")}</span>}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {inProgress && canEdit && (
            <div className="mt-4 flex justify-end">
              <Button onClick={complete} disabled={completing}>
                {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {t("auditSim.completeAudit")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
