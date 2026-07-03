"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { binaryContentLang } from "@/lib/i18n/locales";

interface ImportItemResult {
  fileId: string;
  fileName: string;
  inferredCode: string | null;
  documentId?: string;
  status: "imported" | "skipped" | "unmatched" | "failed";
  error?: string;
  revisionNote?: string;
}

export function QmsProcedureUploadPanel({
  procedureCode,
  targetCode,
  targetLabel,
  canEdit,
  compact,
}: {
  procedureCode: string;
  /** When set, file imports directly to this document code (e.g. FORM-AN-01). */
  targetCode?: string | null;
  targetLabel?: string;
  canEdit: boolean;
  compact?: boolean;
}) {
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

      const res = await fetch(
        `/api/qms/procedures/${encodeURIComponent(procedureCode)}/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadedFileIds: uploadedIds,
            locale: binaryContentLang(lang),
            overwrite,
            targetCode: targetCode?.trim() || undefined,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("eqms.upload.failed"));
        return;
      }
      setItems(data.items ?? []);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("eqms.upload.failed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      className={
        compact
          ? "rounded-md border border-dashed border-border bg-muted/10 p-3"
          : "rounded-lg border border-dashed border-border bg-muted/20 p-4"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {targetCode
              ? t("eqms.upload.targetTitle").replace("{code}", targetCode)
              : t("eqms.upload.procedureTitle").replace("{code}", procedureCode)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {targetLabel
              ? `${targetLabel} — ${t("eqms.upload.targetDesc")}`
              : t("eqms.upload.procedureDesc")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              disabled={busy}
            />
            {t("eqms.upload.overwrite")}
          </label>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple={!targetCode}
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
            {busy ? t("eqms.upload.running") : t("eqms.upload.btn")}
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
                  ? t("eqms.upload.status.imported")
                  : it.status === "skipped"
                    ? t("eqms.upload.status.skipped")
                    : it.status === "unmatched"
                      ? t("eqms.upload.status.unmatched")
                      : t("eqms.upload.status.failed")}
                {it.revisionNote ? ` (${it.revisionNote})` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
