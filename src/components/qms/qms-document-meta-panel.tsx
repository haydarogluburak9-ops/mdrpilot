"use client";

import { useState } from "react";
import { Calendar, Loader2, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import type { DocStatus } from "@/lib/domain/types";
import { isQmsContentLocked } from "@/lib/qms/content-lock";

function toInputDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function fmtDisplay(d: Date | string | null | undefined, lang: string): string {
  const raw = toInputDate(d);
  if (!raw) return "—";
  const [y, m, day] = raw.split("-");
  return lang === "tr" ? `${day}.${m}.${y}` : `${m}/${day}/${y}`;
}

export function QmsDocumentMetaPanel({
  docId,
  status,
  issueDate,
  reviewDueDate,
  canEdit,
}: {
  docId: string;
  status: DocStatus;
  issueDate?: Date | string | null;
  reviewDueDate?: Date | string | null;
  canEdit: boolean;
}) {
  const { t, lang } = useI18n();
  const [review, setReview] = useState(toInputDate(reviewDueDate));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const locked = isQmsContentLocked(status);

  async function saveReviewDue() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/qms/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewDueDate: review.trim() ? review.trim() : null,
        }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-4 text-sm">
      <div className="flex items-center gap-2 font-medium">
        <Calendar className="h-4 w-4 text-primary" />
        {t("eqms.meta.title")}
      </div>

      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">{t("eqms.meta.issueDate")}</dt>
          <dd className="font-mono text-xs mt-0.5">{fmtDisplay(issueDate, lang)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("eqms.meta.reviewDue")}</dt>
          {canEdit ? (
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={review}
                onChange={(e) => {
                  setReview(e.target.value);
                  setSaved(false);
                }}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={saving}
                onClick={saveReviewDue}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("eqms.meta.saveReview")}
              </Button>
              {saved && <span className="text-xs text-green-600">{t("eqms.meta.saved")}</span>}
            </dd>
          ) : (
            <dd className="font-mono text-xs mt-0.5">{fmtDisplay(reviewDueDate, lang)}</dd>
          )}
        </div>
      </dl>

      {locked && (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t("eqms.meta.lockedHint")}
        </p>
      )}
    </Card>
  );
}
