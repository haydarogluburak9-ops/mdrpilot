"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DownloadSelectButton } from "@/components/ui/download-select-button";
import { useI18n } from "@/components/providers/i18n-provider";
import { StatusBadge } from "@/components/ui/status-badge";
import type { DocStatus } from "@/lib/domain/types";

type Record = {
  id: string;
  phase: string;
  title: string;
  description: string | null;
  reference: string | null;
  status: DocStatus;
  ownerName: string | null;
};

export function DesignControlPanel({ productId, canEdit }: { productId: string; canEdit: boolean }) {
  const { t, lang } = useI18n();
  const [records, setRecords] = useState<Record[]>([]);
  const [traceabilityMd, setTraceabilityMd] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  function downloadDhf({ lang, format }: { lang: string; format: string }) {
    const a = document.createElement("a");
    a.href = `/api/products/${productId}/design-control/export?lang=${lang}&format=${format}`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  useEffect(() => {
    fetch(`/api/products/${productId}/design-control?locale=${lang}`)
      .then((r) => r.json())
      .then((d) => {
        setRecords(d.records ?? []);
        setTraceabilityMd(d.traceabilityMarkdown ?? "");
      })
      .finally(() => setLoading(false));
  }, [productId, lang]);

  async function save(record: Record) {
    setSaving(record.id);
    await fetch(`/api/products/${productId}/design-control`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordId: record.id,
        title: record.title,
        description: record.description,
        reference: record.reference,
        status: record.status,
        ownerName: record.ownerName,
      }),
    });
    setSaving(null);
  }

  function update(id: string, patch: Partial<Record>) {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("dhf.desc")}</p>
        <DownloadSelectButton
          label={t("dhf.export")}
          dialogTitle={t("dhf.exportDialog")}
          onDownload={downloadDhf}
        />
      </div>
      {records.map((r) => (
        <Card key={r.id}>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-base">{t(`dhf.phase.${r.phase}`)}</CardTitle>
            <StatusBadge status={r.status} />
          </CardHeader>
          <CardContent className="space-y-2">
            <input
              className="w-full rounded-md border border-input px-3 py-1.5 text-sm"
              value={r.title}
              disabled={!canEdit}
              onChange={(e) => update(r.id, { title: e.target.value })}
            />
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input px-3 py-2 text-xs"
              value={r.description ?? ""}
              disabled={!canEdit}
              onChange={(e) => update(r.id, { description: e.target.value })}
            />
            <input
              className="w-full rounded-md border border-input px-3 py-1.5 text-xs"
              placeholder={t("dhf.reference")}
              value={r.reference ?? ""}
              disabled={!canEdit}
              onChange={(e) => update(r.id, { reference: e.target.value })}
            />
            {canEdit && (
              <div className="flex gap-2 items-center">
                <select
                  className="rounded-md border border-input px-2 py-1 text-xs"
                  value={r.status}
                  onChange={(e) => update(r.id, { status: e.target.value as DocStatus })}
                >
                  {(["DRAFT", "IN_REVIEW", "APPROVED"] as DocStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => save(r)}>
                  {saving === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  {t("common.save")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {traceabilityMd && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">{t("dhf.traceability")}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono overflow-x-auto">
              {traceabilityMd}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
