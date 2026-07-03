"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DownloadSelectButton } from "@/components/ui/download-select-button";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { useI18n } from "@/components/providers/i18n-provider";
import { RiskDocUpload } from "@/components/risk/risk-doc-upload";
import { RiskSectionFileCard } from "@/components/risk/risk-section-file-card";
import type { RiskDocKind } from "@/lib/domain/risk-document-outlines";

type UploadField = "planUploadedFileId" | "reportUploadedFileId" | "policyUploadedFileId";

const UPLOAD_FIELD: Record<RiskDocKind, UploadField> = {
  plan: "planUploadedFileId",
  report: "reportUploadedFileId",
  policy: "policyUploadedFileId",
};

export function RiskDocGenerate({
  productId,
  kind,
  title,
  description,
  formRef,
  content,
  uploadedFile,
  canEdit,
}: {
  productId: string;
  kind: RiskDocKind;
  title: string;
  description?: string;
  formRef?: string;
  content?: string;
  uploadedFile?: { id: string; fileName: string; mimeType: string; sizeBytes: number; documentLabel?: string };
  canEdit: boolean;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [draftSource, setDraftSource] = useState("");
  const [missing, setMissing] = useState<string[]>([]);

  const hasContent = Boolean(content?.trim());
  const hasUpload = Boolean(uploadedFile);

  function sourceLabel(source: string): string {
    const key = `risk.mgmt.generate.source.${source}` as const;
    const translated = t(key);
    if (translated !== key) return translated;
    return source === "rules" || source === "mock" ? t("risk.mgmt.generate.source.rules") : source;
  }

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/risk-management/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, locale: lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("risk.mgmt.generate.error"));
        return;
      }
      setDraftContent(data.content ?? "");
      setDraftSource(data.source ?? "rules");
      setMissing(data.missingInformation ?? []);
      if (!data.liveAiUsed) {
        setError(data.aiFallbackReason ? `${t("risk.mgmt.generate.aiFallback")} (${data.aiFallbackReason})` : t("risk.mgmt.generate.aiFallback"));
      }
      setDraftOpen(true);
      router.refresh();
    } catch {
      setError(t("risk.mgmt.generate.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <RiskSectionFileCard
        productId={productId}
        section={kind}
        content={content}
        uploadedFile={uploadedFile}
      />

      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {formRef && <p className="mt-0.5 text-xs font-medium text-muted-foreground">{formRef}</p>}
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>

      {loading && <AiAnalyzingHint />}

      {error && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <Button type="button" variant="default" size="sm" className="gap-1.5" disabled={loading} onClick={generate}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? t("risk.mgmt.generate.running") : t("risk.mgmt.generate.btn")}
          </Button>
        )}
        {hasContent && (
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t("risk.mgmt.generate.ready")}
          </Badge>
        )}
      </div>

      {hasContent && (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">{t("risk.mgmt.generate.preview")}</p>
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
            {content}
          </pre>
        </div>
      )}

      <div className="border-t border-border pt-4">
        <p className="mb-3 text-sm font-medium text-muted-foreground">{t("risk.mgmt.upload.orOwn")}</p>
        <RiskDocUpload
          productId={productId}
          field={UPLOAD_FIELD[kind]}
          title=""
          description={t("risk.mgmt.upload.ownDesc")}
          file={hasUpload ? uploadedFile : undefined}
          canEdit={canEdit}
        />
      </div>

      {draftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDraftOpen(false)}>
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border p-5">
              <div>
                <h2 className="text-base font-semibold">{title}</h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge variant="success">
                    <CheckCircle2 className="h-3 w-3" />
                    {t("risk.mgmt.generate.saved")}
                  </Badge>
                  <Badge variant="outline">{sourceLabel(draftSource)}</Badge>
                </div>
              </div>
              <button type="button" onClick={() => setDraftOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              {missing.length > 0 && (
                <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-muted-foreground">
                  <p className="mb-1 font-semibold text-warning">{t("risk.mgmt.generate.missing")}</p>
                  <ul className="space-y-1">
                    {missing.map((m, i) => (
                      <li key={i}>• {m}</li>
                    ))}
                  </ul>
                </div>
              )}
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{draftContent}</pre>
            </div>
            <div className="flex justify-end gap-2 border-t border-border p-4">
              <DownloadSelectButton
                formatOptions={[{ value: "docx", label: t("qms.download.formatDocx") }]}
                onDownload={({ lang }) => {
                  const a = document.createElement("a");
                  a.href = `/api/products/${productId}/risk-management/docx?kind=${kind}&lang=${lang}`;
                  a.rel = "noopener";
                  a.click();
                }}
              />
              <Button size="sm" onClick={() => setDraftOpen(false)}>{lang === "tr" ? "Kapat" : "Close"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
