"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Lock, RotateCcw, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { CER_TRANSITIONS } from "@/lib/domain/clinical-evaluation";
import type { ClinicalEvaluationData } from "@/lib/domain/clinical-evaluation";
import type { DocStatus } from "@/lib/domain/types";

export function ClinicalWorkflowPanel({
  productId,
  evaluation,
  canEdit,
  canApprove,
  onUpdated,
}: {
  productId: string;
  evaluation: ClinicalEvaluationData;
  canEdit: boolean;
  canApprove: boolean;
  onUpdated: (ev: ClinicalEvaluationData) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const status = evaluation.status;
  const locked = status === "APPROVED" || status === "IN_REVIEW";

  function canTransition(to: DocStatus) {
    return CER_TRANSITIONS[status]?.includes(to) ?? false;
  }

  function resolveError(msg: string) {
    return msg.startsWith("cer.") ? t(msg) : msg;
  }

  async function transition(action: string) {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/clinical-evaluation/${action}`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(resolveError(typeof data.error === "string" ? data.error : t("cer.status.err.generic")));
        return;
      }
      if (data.evaluation) onUpdated(data.evaluation);
    } catch {
      setError(t("cer.status.err.generic"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 text-sm">
          <p className="font-medium">{t("clinical.workflow.title")}</p>
          <p className="mt-0.5 text-muted-foreground">
            {status === "APPROVED" && evaluation.approvedBy
              ? `${t("clinical.workflow.approvedLabel")}: ${evaluation.approvedBy.name ?? evaluation.approvedBy.email}${evaluation.approvedAt ? ` · ${evaluation.approvedAt.slice(0, 10)}` : ""}`
              : status === "IN_REVIEW" && evaluation.submittedBy
                ? `${t("clinical.workflow.submittedLabel")}: ${evaluation.submittedBy.name ?? evaluation.submittedBy.email}`
                : t("clinical.workflow.hint")}
          </p>
          {locked && canEdit && status !== "APPROVED" && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              {t("clinical.workflow.locked")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {canEdit && canTransition("IN_REVIEW") && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={!!busy}
              onClick={() => transition("submit-review")}
            >
              {busy === "submit-review" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {t("clinical.workflow.submit")}
            </Button>
          )}
          {canApprove && canTransition("APPROVED") && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-success"
              disabled={!!busy}
              onClick={() => transition("approve")}
            >
              {busy === "approve" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {t("clinical.workflow.approve")}
            </Button>
          )}
          {canApprove && canTransition("REJECTED") && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-destructive"
              disabled={!!busy}
              onClick={() => transition("reject")}
            >
              {busy === "reject" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {t("clinical.workflow.reject")}
            </Button>
          )}
          {canEdit && canTransition("DRAFT") && status === "REJECTED" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={!!busy}
              onClick={() => transition("reopen")}
            >
              {busy === "reopen" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              {t("clinical.workflow.reopen")}
            </Button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
