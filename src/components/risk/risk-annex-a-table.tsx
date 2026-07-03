"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  annexAHasAnswers,
  emptyAnnexARows,
  parseAnnexARowsJson,
  type RiskAnnexARow,
} from "@/lib/domain/risk-annex-a";
import { formatRiskFormRef } from "@/lib/domain/risk-management-templates";

export function RiskAnnexATable({
  productId,
  initialRows,
  canEdit,
}: {
  productId: string;
  initialRows?: RiskAnnexARow[];
  canEdit: boolean;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const locale = lang === "tr" ? "tr" : "en";
  const [rows, setRows] = useState<RiskAnnexARow[]>(
    initialRows ?? emptyAnnexARows(locale),
  );
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  useEffect(() => {
    setRows(initialRows ?? emptyAnnexARows(locale));
  }, [initialRows, locale]);

  function updateAnswer(id: string, answer: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, answer, approved: r.answer === answer ? r.approved : false } : r,
      ),
    );
    setSaved(false);
  }

  async function saveRows(nextRows: RiskAnnexARow[]) {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/products/${productId}/risk-management`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annexARows: nextRows }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("evidence.networkError"));
        return false;
      }
      setSaved(true);
      router.refresh();
      return true;
    } catch {
      setError(t("evidence.networkError"));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    await saveRows(rows);
  }

  async function toggleApprove(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;

    const nextApproved = !row.approved;
    const nextRows = rows.map((r) => (r.id === id ? { ...r, approved: nextApproved } : r));
    setRows(nextRows);
    setApprovingId(id);
    setError(null);
    const ok = await saveRows(nextRows);
    setApprovingId(null);
    if (!ok) {
      setRows(rows);
    }
  }

  async function fillWithAi() {
    setAiLoading(true);
    setError(null);
    setAiMessage(null);
    try {
      const res = await fetch(`/api/products/${productId}/risk-management/annex-a-fill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: lang, overwrite: annexAHasAnswers(rows) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("risk.annexA.aiError"));
        return;
      }
      if (Array.isArray(data.rows)) {
        setRows(parseAnnexARowsJson(data.rows, locale));
      }
      setAiMessage(
        data.source === "ai"
          ? t("risk.annexA.aiDone")
          : t("risk.annexA.aiDoneRules"),
      );
      router.refresh();
    } catch {
      setError(t("risk.annexA.aiError"));
    } finally {
      setAiLoading(false);
    }
  }

  const approvedCount = rows.filter((r) => r.approved).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{t("risk.mgmt.annexA.title")}</h3>
          <p className="text-xs font-medium text-muted-foreground">
            {formatRiskFormRef("annexA", locale)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t("risk.mgmt.annexA.desc")}</p>
          {approvedCount > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("risk.annexA.approvedCount").replace("{n}", String(approvedCount))}
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex flex-col items-end gap-1">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={aiLoading || saving}
              onClick={fillWithAi}
            >
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {aiLoading ? t("risk.annexA.aiRunning") : t("risk.annexA.aiFill")}
            </Button>
            {aiLoading && <AiAnalyzingHint className="text-right" />}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[900px] table-fixed text-sm">
          <colgroup>
            <col className="w-14" />
            <col className="w-[12%]" />
            <col className="w-[22%]" />
            <col />
            <col className="w-20" />
          </colgroup>
          <thead>
            <tr className="bg-cyan-600/90 text-left text-xs uppercase tracking-wide text-white">
              <th className="px-2 py-2">{t("risk.annexA.col.no")}</th>
              <th className="px-2 py-2">{t("risk.annexA.col.characteristic")}</th>
              <th className="px-2 py-2">{t("risk.annexA.col.question")}</th>
              <th className="px-2 py-2">{t("risk.annexA.col.answer")}</th>
              <th className="px-2 py-2 text-center">{t("risk.annexA.col.approve")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isApproving = approvingId === row.id;
              return (
                <tr key={row.id} className="border-b border-border align-top last:border-0">
                  <td className="px-2 py-3 font-medium text-muted-foreground">{row.no}</td>
                  <td className="px-2 py-3 font-medium">{row.characteristic}</td>
                  <td className="px-2 py-3 text-muted-foreground">{row.question}</td>
                  <td className="px-2 py-3">
                    {canEdit ? (
                      <Textarea
                        value={row.answer}
                        onChange={(e) => updateAnswer(row.id, e.target.value)}
                        rows={3}
                        className="min-h-[72px] w-full min-w-0 text-sm"
                        placeholder={t("risk.annexA.answerPlaceholder")}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        {row.answer || "—"}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {canEdit ? (
                      <Button
                        type="button"
                        size="sm"
                        variant={row.approved ? "default" : "outline"}
                        className="h-8 w-full gap-1 px-2"
                        disabled={saving || aiLoading || isApproving || !row.answer.trim()}
                        title={
                          !row.answer.trim()
                            ? t("risk.annexA.approveNeedsAnswer")
                            : row.approved
                              ? t("risk.annexA.revokeApprove")
                              : t("risk.annexA.approve")
                        }
                        onClick={() => toggleApprove(row.id)}
                      >
                        {isApproving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : row.approved ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <span className="text-xs">{t("risk.annexA.approve")}</span>
                        )}
                      </Button>
                    ) : row.approved ? (
                      <CheckCircle2 className="mx-auto h-5 w-5 text-primary" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" className="gap-1.5" onClick={save} disabled={saving || aiLoading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("risk.mgmt.save")}
          </Button>
          {saved && <span className="text-sm text-muted-foreground">{t("risk.mgmt.saved")}</span>}
          {aiMessage && <span className="text-sm text-muted-foreground">{aiMessage}</span>}
        </div>
      )}

      {error && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
