"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";

interface ImportItemResult {
  fileId: string;
  fileName: string;
  inferredCode: string | null;
  documentId?: string;
  status: "imported" | "skipped" | "unmatched" | "failed";
  error?: string;
  revisionNote?: string;
}

export function QmsImportPanel({ canEdit }: { canEdit: boolean }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ImportItemResult[] | null>(null);

  if (!canEdit) return null;

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    setItems(null);

    const uploadedIds: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        form.append("documentKind", "OTHER");
        const up = await fetch("/api/files/upload", { method: "POST", body: form });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) {
          throw new Error(typeof upData.error === "string" ? upData.error : "upload failed");
        }
        if (upData.file?.id) uploadedIds.push(upData.file.id);
      }

      const res = await fetch("/api/qms/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadedFileIds: uploadedIds,
          locale: lang,
          overwrite,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("qms.import.failed"));
        return;
      }
      setItems(data.items ?? []);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("qms.import.failed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{t("qms.import.title")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("qms.import.desc")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              disabled={busy}
            />
            {t("qms.import.overwrite")}
          </label>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {busy ? t("qms.import.running") : t("qms.import.btn")}
          </Button>
        </div>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

      {items && items.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs">
          {items.map((it) => (
            <li key={it.fileId} className="flex items-center gap-2">
              {it.status === "imported" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="truncate font-mono">{it.inferredCode ?? "—"}</span>
              <span className="truncate text-muted-foreground">{it.fileName}</span>
              <span className="text-muted-foreground">
                {it.status === "imported"
                  ? t("qms.import.status.imported")
                  : it.status === "skipped"
                    ? t("qms.import.status.skipped")
                    : it.status === "unmatched"
                      ? t("qms.import.status.unmatched")
                      : t("qms.import.status.failed")}
                {it.revisionNote ? ` (${it.revisionNote})` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
