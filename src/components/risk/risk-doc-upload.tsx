"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, FileText, AlertCircle, Download, Trash2, CheckCircle2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  detectRiskDocSubtype,
  extractRiskDocumentIdentity,
  formatRiskDocumentLabel,
  subtypeForUploadField,
  RISK_DOC_SUBTYPE_LABEL,
  type RiskDocSubtype,
} from "@/lib/domain/risk-document-meta";
import type { RiskManagementLinkedFile } from "@/lib/domain/types";

type UploadField = "planUploadedFileId" | "reportUploadedFileId" | "policyUploadedFileId";

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function labelFromAnalysis(
  fileName: string,
  analysisJson: Record<string, unknown> | null | undefined,
  locale: "tr" | "en",
) {
  const identity =
    (analysisJson?.riskDocumentIdentity as { docCode?: string; revision?: string; documentDate?: string }) ??
    extractRiskDocumentIdentity(fileName);
  const subtype =
    (analysisJson?.riskDocSubtype as RiskDocSubtype | undefined) ??
    detectRiskDocSubtype(fileName);
  return {
    documentLabel: formatRiskDocumentLabel(identity, fileName, locale),
    detectedSubtype: subtype,
  };
}

export function RiskDocUpload({
  productId,
  field,
  title,
  description,
  formRef,
  file,
  canEdit,
}: {
  productId: string;
  field: UploadField;
  title: string;
  description?: string;
  formRef?: string;
  file?: RiskManagementLinkedFile;
  canEdit: boolean;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState<string | null>(null);
  const expectedSubtype = subtypeForUploadField(field);
  const langKey = lang === "tr" ? "tr" : "en";

  async function linkFile(uploadedFileId: string | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/risk-management`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: uploadedFileId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("evidence.networkError"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("evidence.networkError"));
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(fileToUpload: File) {
    setBusy(true);
    setError(null);
    setMismatch(null);
    try {
      const form = new FormData();
      form.append("file", fileToUpload);
      form.append("productId", productId);
      form.append("documentKind", "RISK_FILE");
      const res = await fetch("/api/files/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("risk.mgmt.upload.error"));
        setBusy(false);
        return;
      }

      const analysisJson = data.file?.analysisJson as Record<string, unknown> | undefined;
      const meta = labelFromAnalysis(fileToUpload.name, analysisJson, langKey);
      if (meta.detectedSubtype && meta.detectedSubtype !== expectedSubtype) {
        const detected = RISK_DOC_SUBTYPE_LABEL[meta.detectedSubtype][langKey];
        const expected = RISK_DOC_SUBTYPE_LABEL[expectedSubtype][langKey];
        setMismatch(
          t("risk.mgmt.upload.typeMismatch")
            .replace("{detected}", detected)
            .replace("{expected}", expected),
        );
      }

      await linkFile(data.file.id as string);
    } catch {
      setError(t("risk.mgmt.upload.error"));
      setBusy(false);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const recognizedLabel = file?.documentLabel;
  const recognizedSubtype = file?.detectedSubtype;

  return (
    <div className="space-y-4">
      <div>
        {title && <h3 className="text-base font-semibold">{title}</h3>}
        {!file && formRef && (
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">{formRef}</p>
        )}
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>

      {file ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="h-8 w-8 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate font-medium">{file.fileName}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={`/api/files/${file.id}/download`}
                className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5" })}
              >
                <Download className="h-4 w-4" />
                {t("risk.mgmt.upload.download")}
              </a>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-destructive"
                  disabled={busy}
                  onClick={() => linkFile(null)}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {t("risk.mgmt.upload.remove")}
                </Button>
              )}
            </div>
          </div>
          {recognizedLabel && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              <span>
                {t("risk.mgmt.upload.recognized")}: <span className="font-medium text-foreground">{recognizedLabel}</span>
                {recognizedSubtype && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({RISK_DOC_SUBTYPE_LABEL[recognizedSubtype][langKey]})
                  </span>
                )}
              </span>
            </p>
          )}
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center"
        >
          <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("risk.mgmt.upload.empty")}</p>
        </div>
      )}

      {canEdit && (
        <>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUpload(f);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {file ? t("risk.mgmt.upload.replace") : t("risk.mgmt.upload.btn")}
          </Button>
        </>
      )}

      {mismatch && (
        <p className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {mismatch}
        </p>
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
