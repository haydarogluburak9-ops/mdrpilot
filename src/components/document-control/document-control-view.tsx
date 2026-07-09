"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, CheckCircle2, Circle, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/providers/i18n-provider";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type ControlledDoc = {
  sourceType: string;
  sourceId: string;
  code: string;
  title: string;
  revisionNo: number;
  status: string;
  productName: string | null;
  href: string;
  canApprove: boolean;
  lastApproval: { approvedByName: string; approvedAt: string; intentText: string } | null;
};

type HistoryRow = {
  id: string;
  documentTitle: string;
  revisionNo: number;
  approvedByName: string;
  intentText: string;
  approvedAt: string;
};

type WorkflowStep = {
  stepOrder: number;
  stepRole: string;
  status: string;
  assignedRole: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  intentText: string | null;
};

const STEP_ROLE_KEYS: Record<string, string> = {
  REVIEWER: "docControl.step.reviewer",
  APPROVER: "docControl.step.approver",
  RELEASE: "docControl.step.release",
};

export function DocumentControlView({
  productId,
  canApprove,
  canWorkflow,
}: {
  productId?: string;
  canApprove: boolean;
  canWorkflow: boolean;
}) {
  const { t, lang } = useI18n();
  const [documents, setDocuments] = useState<ControlledDoc[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [intent, setIntent] = useState("");
  const [selected, setSelected] = useState<ControlledDoc | null>(null);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (productId) params.set("productId", productId);
    params.set("lang", lang);
    const q = `?${params.toString()}`;
    const [docsRes, histRes] = await Promise.all([
      fetch(`/api/document-control${q}`),
      fetch("/api/document-control?history=1"),
    ]);
    const docs = await docsRes.json();
    const hist = await histRes.json();
    setDocuments(docs.documents ?? []);
    setHistory(hist.history ?? []);
    setLoading(false);
  }

  const loadWorkflow = useCallback(async (doc: ControlledDoc) => {
    if (doc.sourceType !== "QMS") {
      setWorkflowSteps([]);
      return;
    }
    setWorkflowLoading(true);
    try {
      const res = await fetch(
        `/api/document-control/workflow?sourceType=${doc.sourceType}&sourceId=${encodeURIComponent(doc.sourceId)}&revisionNo=${doc.revisionNo}`,
      );
      const data = await res.json();
      setWorkflowSteps(res.ok ? (data.steps ?? []) : []);
    } finally {
      setWorkflowLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when product or UI language changes
  }, [productId, lang]);

  useEffect(() => {
    if (selected) {
      setIntent("");
      setError(null);
      void loadWorkflow(selected);
    } else {
      setWorkflowSteps([]);
    }
  }, [selected, loadWorkflow]);

  const pendingStep = workflowSteps.find((s) => s.status === "PENDING");
  const hasWorkflow = workflowSteps.length > 0;
  const isQms = selected?.sourceType === "QMS";

  async function submitForReview(doc: ControlledDoc) {
    setBusy(doc.sourceId);
    setError(null);
    try {
      const res = await fetch("/api/document-control/submit-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType: doc.sourceType, sourceId: doc.sourceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("docControl.submitReviewError"));
        return;
      }
      await load();
      const updated = documents.find((d) => d.sourceId === doc.sourceId);
      if (updated) setSelected({ ...updated, status: "IN_REVIEW", canApprove: true });
    } finally {
      setBusy(null);
    }
  }

  async function approveStep() {
    if (!selected || !pendingStep || intent.trim().length < 10) {
      setError(t("docControl.intentTooShort"));
      return;
    }
    setBusy(selected.sourceId);
    setError(null);
    try {
      const res = await fetch("/api/document-control/approve-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: selected.sourceType,
          sourceId: selected.sourceId,
          stepOrder: pendingStep.stepOrder,
          intentText: intent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("docControl.approveError"));
        return;
      }
      if (data.allApproved) {
        setSelected(null);
        setIntent("");
      } else {
        setIntent("");
        await loadWorkflow(selected);
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function legacyApprove() {
    if (!selected || intent.trim().length < 10) {
      setError(t("docControl.intentTooShort"));
      return;
    }
    setBusy(selected.sourceId);
    setError(null);
    try {
      const res = await fetch("/api/document-control/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: selected.sourceType,
          sourceId: selected.sourceId,
          intentText: intent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("docControl.approveError"));
        return;
      }
      setSelected(null);
      setIntent("");
      await load();
    } finally {
      setBusy(null);
    }
  }

  function stepIcon(step: WorkflowStep) {
    if (step.status === "APPROVED") {
      return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />;
    }
    if (step.status === "PENDING" && pendingStep?.stepOrder === step.stepOrder) {
      return <Clock className="h-4 w-4 text-amber-600 shrink-0" />;
    }
    return <Circle className="h-4 w-4 text-muted-foreground shrink-0" />;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t("docControl.title")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("docControl.desc")}</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("docControl.empty")}</p>
          ) : (
            documents.map((d) => (
              <div
                key={`${d.sourceType}-${d.sourceId}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {d.code} · {d.title}
                    {d.productName ? ` (${d.productName})` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    REV {d.revisionNo} · {t(`docControl.source.${d.sourceType}`)}
                    {d.lastApproval && ` · ${t("docControl.approvedBy")} ${d.lastApproval.approvedByName}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={d.status as "DRAFT"} />
                  <Link href={d.href} className="text-xs text-primary underline">
                    {t("common.open")}
                  </Link>
                  {canWorkflow && d.sourceType === "QMS" && d.status === "DRAFT" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === d.sourceId}
                      onClick={() => submitForReview(d)}
                    >
                      {busy === d.sourceId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t("docControl.submitReview")
                      )}
                    </Button>
                  )}
                  {d.status === "IN_REVIEW" && (canWorkflow || (canApprove && d.canApprove)) && (
                    <Button size="sm" variant="outline" onClick={() => setSelected(d)}>
                      {d.sourceType === "QMS" && canWorkflow
                        ? t("docControl.workflowAction")
                        : t("docControl.approve")}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isQms && canWorkflow && hasWorkflow
                ? t("docControl.workflowTitle")
                : t("docControl.approveTitle")}
            </CardTitle>
            <p className="text-sm">
              {selected.code} — {selected.title}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {isQms && canWorkflow && workflowLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("common.loading")}
              </div>
            )}

            {isQms && canWorkflow && !workflowLoading && !hasWorkflow && selected.status === "IN_REVIEW" && (
              <div className="rounded-md border border-dashed p-3 space-y-2">
                <p className="text-sm text-muted-foreground">{t("docControl.workflowStartHint")}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={Boolean(busy)}
                  onClick={() => submitForReview(selected)}
                >
                  {busy === selected.sourceId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("docControl.startWorkflow")
                  )}
                </Button>
              </div>
            )}

            {isQms && canWorkflow && hasWorkflow && (
              <ol className="space-y-2">
                {workflowSteps.map((step) => (
                  <li
                    key={step.stepOrder}
                    className={cn(
                      "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                      step.status === "APPROVED" && "border-emerald-500/30 bg-emerald-500/5",
                      pendingStep?.stepOrder === step.stepOrder && "border-amber-500/40 bg-amber-500/5",
                    )}
                  >
                    {stepIcon(step)}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {step.stepOrder}. {t(STEP_ROLE_KEYS[step.stepRole] ?? step.stepRole)}
                        {step.assignedRole && (
                          <span className="text-xs font-normal text-muted-foreground ml-1">
                            ({step.assignedRole})
                          </span>
                        )}
                      </p>
                      {step.status === "APPROVED" && step.reviewerName && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {step.reviewerName}
                          {step.reviewedAt ? ` · ${formatDate(step.reviewedAt)}` : ""}
                        </p>
                      )}
                      {step.intentText && (
                        <p className="text-xs italic mt-1 text-muted-foreground">{step.intentText}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {((isQms && canWorkflow && hasWorkflow && pendingStep) ||
              (!hasWorkflow && canApprove && selected.canApprove)) && (
              <>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={t("docControl.intentPlaceholder")}
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button
                    onClick={isQms && canWorkflow && hasWorkflow ? approveStep : legacyApprove}
                    disabled={Boolean(busy)}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isQms && canWorkflow && hasWorkflow && pendingStep ? (
                      `${t("docControl.confirmStep")} — ${t(STEP_ROLE_KEYS[pendingStep.stepRole] ?? pendingStep.stepRole)}`
                    ) : (
                      t("docControl.confirmApprove")
                    )}
                  </Button>
                  <Button variant="ghost" onClick={() => setSelected(null)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </>
            )}

            {isQms && canWorkflow && hasWorkflow && !pendingStep && (
              <p className="text-sm text-emerald-600">{t("docControl.workflowComplete")}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("docControl.historyTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("docControl.noHistory")}</p>
          ) : (
            history.slice(0, 20).map((h) => (
              <div key={h.id} className="border-b border-border py-2 last:border-0">
                <p className="text-sm font-medium">
                  {h.documentTitle} (REV {h.revisionNo})
                </p>
                <p className="text-xs text-muted-foreground">
                  {h.approvedByName} · {formatDate(h.approvedAt)}
                </p>
                <p className="text-xs mt-1 italic">{h.intentText}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
