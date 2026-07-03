"use client";

import { useEffect, useState } from "react";
import { GitCompare, History, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";

interface RevisionRow {
  id: string;
  revisionNo: number;
  version: string;
  changeNote: string | null;
  preparedBy: string | null;
  createdAt: string;
}

interface DiffLine {
  kind: "same" | "add" | "remove";
  text: string;
}

export function QmsRevisionHistoryPanel({ documentId }: { documentId: string }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<RevisionRow[]>([]);
  const [currentVersion, setCurrentVersion] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewRev, setPreviewRev] = useState<number | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [diffRev, setDiffRev] = useState<number | null>(null);
  const [diffLines, setDiffLines] = useState<DiffLine[] | null>(null);
  const [diffBusy, setDiffBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/qms/${documentId}/revisions`);
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) {
          setRows(data.revisions ?? []);
          setCurrentVersion(data.currentVersion ?? "");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  async function loadPreview(rev: number) {
    if (previewRev === rev && previewText) {
      setPreviewRev(null);
      setPreviewText(null);
      return;
    }
    setPreviewBusy(true);
    try {
      const res = await fetch(`/api/qms/${documentId}/revisions?rev=${rev}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPreviewRev(rev);
        setPreviewText(data.content ?? "");
        setDiffRev(null);
        setDiffLines(null);
      }
    } finally {
      setPreviewBusy(false);
    }
  }

  async function loadDiff(rev: number) {
    const prev = rows.find((r) => r.revisionNo < rev);
    if (!prev) return;
    if (diffRev === rev && diffLines) {
      setDiffRev(null);
      setDiffLines(null);
      return;
    }
    setDiffBusy(true);
    try {
      const res = await fetch(
        `/api/qms/${documentId}/revisions?rev=${rev}&against=${prev.revisionNo}`,
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDiffRev(rev);
        setDiffLines(data.diff ?? []);
        setPreviewRev(null);
        setPreviewText(null);
      }
    } finally {
      setDiffBusy(false);
    }
  }

  if (loading) {
    return (
      <Card className="p-4 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("eqms.revision.loading")}
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <History className="h-4 w-4" />
          {t("eqms.revision.title")}
        </div>
        <p className="mt-2 text-xs">{t("eqms.revision.empty")}</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <History className="h-4 w-4 text-primary" />
        {t("eqms.revision.title")}
        {currentVersion && (
          <span className="text-xs font-mono text-muted-foreground">({currentVersion})</span>
        )}
      </div>
      <ul className="mt-3 space-y-2">
        {rows.map((r, idx) => {
          const hasPrev = idx > 0;
          return (
            <li key={r.id} className="rounded-md border border-border p-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-semibold">{r.version}</span>
                <span className="text-muted-foreground">
                  {r.createdAt.slice(0, 10)}
                  {r.preparedBy ? ` · ${r.preparedBy}` : ""}
                </span>
              </div>
              {r.changeNote && <p className="mt-1 text-muted-foreground">{r.changeNote}</p>}
              <div className="mt-1 flex flex-wrap gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={previewBusy}
                  onClick={() => loadPreview(r.revisionNo)}
                >
                  {previewRev === r.revisionNo ? t("eqms.revision.hide") : t("eqms.revision.view")}
                </Button>
                {hasPrev && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    disabled={diffBusy}
                    onClick={() => loadDiff(r.revisionNo)}
                  >
                    <GitCompare className="h-3 w-3" />
                    {diffRev === r.revisionNo ? t("eqms.revision.hideDiff") : t("eqms.revision.compare")}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {previewText != null && previewRev != null && (
        <div className="mt-3 max-h-48 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs whitespace-pre-wrap font-mono">
          {previewText.slice(0, 4000)}
          {previewText.length > 4000 ? "…" : ""}
        </div>
      )}
      {diffLines != null && diffRev != null && (
        <div className="mt-3 max-h-56 overflow-auto rounded-md border border-border bg-muted/20 p-2 text-xs font-mono">
          {diffLines.map((line, i) => (
            <div
              key={`${i}-${line.kind}`}
              className={
                line.kind === "add"
                  ? "bg-green-500/15 text-green-900 dark:text-green-100"
                  : line.kind === "remove"
                    ? "bg-red-500/15 text-red-900 dark:text-red-100 line-through"
                    : "text-muted-foreground"
              }
            >
              {line.kind === "add" ? "+ " : line.kind === "remove" ? "- " : "  "}
              {line.text || " "}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
