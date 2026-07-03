"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Link2, Loader2, PenLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useI18n } from "@/components/providers/i18n-provider";
import { localizeEvidenceDocument } from "@/lib/domain/gspr-evidence-i18n";
import { translateGsprApiError } from "@/lib/domain/gspr-api-errors";
import type { EvidenceFile, FileOption } from "@/components/modules/evidence-panel";

export function GsprEvidenceModal({
  productId,
  itemId,
  gsprNo,
  fileOptions,
  recommendedFileIds,
  alreadyLinked,
  currentHint,
  onClose,
  onFileLinked,
  onHintSaved,
}: {
  productId: string;
  itemId: string;
  gsprNo: string;
  fileOptions: FileOption[];
  recommendedFileIds: string[];
  alreadyLinked: string[];
  currentHint?: string;
  onClose: () => void;
  onFileLinked: (file: EvidenceFile) => void;
  onHintSaved: (text: string) => void;
}) {
  const { t, lang } = useI18n();
  const available = fileOptions.filter((f) => !alreadyLinked.includes(f.id));
  const sorted = [...available].sort((a, b) => {
    const ra = recommendedFileIds.includes(a.id) ? 0 : 1;
    const rb = recommendedFileIds.includes(b.id) ? 0 : 1;
    return ra - rb;
  });

  const [mode, setMode] = useState<"file" | "text">(available.length ? "file" : "text");
  const [fileId, setFileId] = useState(sorted[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [hint, setHint] = useState(
    () => localizeEvidenceDocument(currentHint, lang, gsprNo) ?? currentHint ?? "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHint(localizeEvidenceDocument(currentHint, lang, gsprNo) ?? currentHint ?? "");
  }, [currentHint, lang, gsprNo]);

  async function linkFile() {
    if (!fileId) {
      setError(t("evidence.selectFile"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/evidence/gspr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gsprItemId: itemId, uploadedFileId: fileId, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(translateGsprApiError(data.error, t));
        return;
      }
      const file = fileOptions.find((f) => f.id === fileId)!;
      onFileLinked({
        linkId: data.link.id,
        fileId,
        fileName: file.fileName,
        documentKind: file.documentKind,
        note: note || null,
      });
      onClose();
    } catch {
      setError(t("evidence.networkError"));
    } finally {
      setLoading(false);
    }
  }

  async function saveHint() {
    const text = hint.trim();
    if (!text) {
      setError(t("gspr.evidenceManualRequired"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/gspr/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidenceDocument: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(translateGsprApiError(data.error, t));
        return;
      }
      onHintSaved(text);
      onClose();
    } catch {
      setError(t("evidence.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("gspr.addEvidence")}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">{t("gspr.col.gspr")} {gsprNo}</p>

        <div className="mb-4 flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${mode === "text" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setMode("text")}
          >
            <PenLine className="mr-1 inline h-3.5 w-3.5" />
            {t("gspr.evidenceTabText")}
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${mode === "file" ? "bg-card shadow-sm" : "text-muted-foreground"} ${!available.length ? "opacity-50" : ""}`}
            onClick={() => available.length && setMode("file")}
            disabled={!available.length}
          >
            <Link2 className="mr-1 inline h-3.5 w-3.5" />
            {t("gspr.evidenceTabFile")}
          </button>
        </div>

        {mode === "text" ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("gspr.evidenceManualLabel")}</label>
              <Textarea
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder={t("gspr.evidenceManualPlaceholder")}
                className="min-h-[88px] text-sm"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">{t("gspr.evidenceManualHint")}</p>
            </div>
            {error && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                {t("common.cancel")}
              </Button>
              <Button className="gap-1.5" onClick={saveHint} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                {t("gspr.evidenceSave")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("evidence.file")}</label>
              <select
                value={fileId}
                onChange={(e) => setFileId(e.target.value)}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
              >
                {sorted.map((f) => (
                  <option key={f.id} value={f.id}>
                    {recommendedFileIds.includes(f.id) ? "★ " : ""}
                    {f.fileName} ({f.documentKind})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("evidence.note")}</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                placeholder={t("evidence.notePlaceholder")}
              />
            </div>
            {error && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                {t("common.cancel")}
              </Button>
              <Button className="gap-1.5" onClick={linkFile} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                {t("evidence.link")}
              </Button>
            </div>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t("gspr.evidenceFileCenter")}{" "}
          <Link href="/files" className="text-primary underline-offset-2 hover:underline">
            {t("nav.files")}
          </Link>
        </p>
      </div>
    </div>
  );
}
