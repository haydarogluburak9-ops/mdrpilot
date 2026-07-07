"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, Loader2, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DownloadSelectButton } from "@/components/ui/download-select-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { useI18n } from "@/components/providers/i18n-provider";
import type { TechnicalSection, DocStatus } from "@/lib/domain/types";
import { isTechnicalFileSectionKey } from "@/lib/domain/constants";
import { formatDate } from "@/lib/utils";

interface DraftState {
  sectionId: string;
  title: string;
  content: string;
  source: string;
  missingInformation: string[];
}

export function TechnicalFileTable({
  sections: initialSections,
  productId,
  canEdit = false,
}: {
  sections: TechnicalSection[];
  productId?: string;
  canEdit?: boolean;
}) {
  const { t, lang } = useI18n();
  const sectionFingerprint = useMemo(
    () => initialSections.map((s) => s.id).join(","),
    [initialSections],
  );
  const [sections, setSections] = useState<TechnicalSection[]>(
    initialSections.filter((s) => isTechnicalFileSectionKey(s.key)),
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);

  useEffect(() => {
    setSections(initialSections.filter((s) => isTechnicalFileSectionKey(s.key)));
    setError(null);
    setDraft(null);
    setLoadingId(null);
  }, [productId, sectionFingerprint, initialSections]);

  function localizedTitle(s: TechnicalSection): string {
    const k = `tf.section.${s.key}`;
    const lbl = t(k);
    return lbl === k ? s.title : lbl;
  }

  async function generate(s: TechnicalSection) {
    if (!productId) return;
    setLoadingId(s.id);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/generate-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: s.id, _locale: lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "Not found" ? t("tf.generateNotFound") : (data.error ?? t("tf.generateError")));
        return;
      }
      setSections((prev) =>
        prev.map((x) =>
          x.id === s.id ? { ...x, status: data.status as DocStatus, content: data.content, updatedAt: new Date().toISOString() } : x,
        ),
      );
      setDraft({
        sectionId: s.id,
        title: localizedTitle(s),
        content: data.content,
        source: data.source,
        missingInformation: data.missingInformation ?? [],
      });
    } catch {
      setError(t("tf.generateError"));
    } finally {
      setLoadingId(null);
    }
  }

  function downloadSection(sectionId: string, exportLang: string) {
    if (!productId) return;
    const a = document.createElement("a");
    a.href = `/api/products/${productId}/section-docx?sectionId=${encodeURIComponent(sectionId)}&lang=${exportLang}`;
    a.rel = "noopener";
    a.click();
  }

  return (
    <Card className="overflow-hidden">
      {loadingId && (
        <div className="border-b border-border bg-muted/30 px-4 py-2">
          <AiAnalyzingHint />
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 border-b border-border bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t("tf.col.section")}</th>
              <th className="px-4 py-3 font-medium">{t("tf.col.annexRef")}</th>
              <th className="px-4 py-3 font-medium">{t("tf.col.owner")}</th>
              <th className="px-4 py-3 font-medium">{t("tf.col.updated")}</th>
              <th className="px-4 py-3 font-medium">{t("tf.col.status")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("tf.col.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => {
              const isLoading = loadingId === s.id;
              const notApplicable = s.applicable === false;
              return (
                <tr key={s.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${notApplicable ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3 font-medium">{localizedTitle(s)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.annexRef}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.ownerName ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(s.updatedAt)}</td>
                  <td className="px-4 py-3">
                    {notApplicable ? (
                      <Badge variant="outline" title={s.naReason ?? undefined}>{t("tf.na")}</Badge>
                    ) : (
                      <StatusBadge status={s.status} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {productId && canEdit && !notApplicable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          disabled={isLoading || loadingId !== null}
                          onClick={() => generate(s)}
                          title={t("tf.generate")}
                        >
                          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          {isLoading ? t("tf.generating") : t("tf.generate")}
                        </Button>
                      )}
                      {s.content && productId && (
                        <DownloadSelectButton
                          size="sm"
                          formatOptions={[{ value: "docx", label: t("qms.download.formatDocx") }]}
                          menuAlign="left"
                          onDownload={({ lang: exportLang }) => downloadSection(s.id, exportLang)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {draft && productId && (
        <DraftModal
          draft={draft}
          productId={productId}
          onClose={() => setDraft(null)}
        />
      )}
    </Card>
  );
}

function DraftModal({
  draft,
  productId,
  onClose,
}: {
  draft: DraftState;
  productId: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="text-base font-semibold">{t("tf.draftTitle")} — {draft.title}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> {t("tf.draftSaved")}</Badge>
              <Badge variant="outline">{t("tf.engine")}: {draft.source}</Badge>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {draft.missingInformation.length > 0 && (
            <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-warning">
                <AlertCircle className="h-4 w-4" /> {t("tf.draftMissing")}
              </p>
              <ul className="space-y-1">
                {draft.missingInformation.map((m, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {m}</li>
                ))}
              </ul>
            </div>
          )}
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">
            {draft.content}
          </pre>
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-4">
          <DownloadSelectButton
            formatOptions={[{ value: "docx", label: t("qms.download.formatDocx") }]}
            onDownload={({ lang: exportLang }) => {
              const a = document.createElement("a");
              a.href = `/api/products/${productId}/section-docx?sectionId=${encodeURIComponent(draft.sectionId)}&lang=${exportLang}`;
              a.rel = "noopener";
              a.click();
            }}
          />
          <Button onClick={onClose}>{t("tf.close")}</Button>
        </div>
      </div>
    </div>
  );
}
