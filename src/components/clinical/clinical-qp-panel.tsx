"use client";

import { useState } from "react";
import { Loader2, Save, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { qpDocumentsComplete } from "@/lib/domain/clinical-qp-documents";
import type { ClinicalEvaluationData } from "@/lib/domain/clinical-evaluation";
import type { ClinicalQpDocuments } from "@/lib/domain/clinical-qp-documents";

export function ClinicalQpPanel({
  productId,
  evaluation,
  canEdit,
  onSaved,
}: {
  productId: string;
  evaluation: ClinicalEvaluationData | null;
  canEdit: boolean;
  onSaved: (ev: ClinicalEvaluationData) => void;
}) {
  const { t } = useI18n();
  const initial = evaluation?.qpDocuments ?? {};
  const [form, setForm] = useState<ClinicalQpDocuments>({
    evaluatorName: initial.evaluatorName ?? "",
    qualifications: initial.qualifications ?? "",
    cvSummary: initial.cvSummary ?? "",
    cvFileKey: initial.cvFileKey,
    cvFileName: initial.cvFileName,
    coiDeclared: initial.coiDeclared ?? false,
    coiStatement: initial.coiStatement ?? "",
    coiFileKey: initial.coiFileKey,
    coiFileName: initial.coiFileName,
  });
  const [loading, setLoading] = useState(false);
  const [uploadingKind, setUploadingKind] = useState<"cv" | "coi" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const complete = qpDocumentsComplete({ ...initial, ...form });

  function update<K extends keyof ClinicalQpDocuments>(key: K, value: ClinicalQpDocuments[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function qpFileUrl(key: string) {
    return `/api/products/${productId}/clinical-evaluation/qp/evidence?key=${encodeURIComponent(key)}`;
  }

  async function uploadFile(kind: "cv" | "coi", file: File) {
    setUploadingKind(kind);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("kind", kind);
      formData.append("file", file);
      const res = await fetch(`/api/products/${productId}/clinical-evaluation/qp/evidence`, {
        method: "POST",
        body: formData,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : t("clinical.qp.uploadError"));
        return;
      }
      if (!body.file) return;
      if (kind === "cv") {
        update("cvFileKey", body.file.storageKey);
        update("cvFileName", body.file.fileName);
      } else {
        update("coiFileKey", body.file.storageKey);
        update("coiFileName", body.file.fileName);
      }
    } catch {
      setError(t("clinical.qp.uploadError"));
    } finally {
      setUploadingKind(null);
    }
  }

  function clearFile(kind: "cv" | "coi") {
    if (kind === "cv") {
      update("cvFileKey", undefined);
      update("cvFileName", undefined);
    } else {
      update("coiFileKey", undefined);
      update("coiFileName", undefined);
    }
  }

  async function save() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/clinical-evaluation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qpDocuments: form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : t("clinical.qp.saveError");
        setError(msg.startsWith("cer.") ? t(msg) : msg);
        return;
      }
      if (data.evaluation) onSaved(data.evaluation);
    } catch {
      setError(t("clinical.qp.saveError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{t("clinical.qp.title")}</h3>
        <p className="text-xs text-muted-foreground">{t("clinical.qp.desc")}</p>
        {complete && (
          <p className="mt-1 text-xs text-success">{t("clinical.qp.complete")}</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">{t("clinical.qp.evaluatorName")}</span>
          <input
            className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
            value={form.evaluatorName ?? ""}
            disabled={!canEdit}
            onChange={(e) => update("evaluatorName", e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">{t("clinical.qp.qualifications")}</span>
          <input
            className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
            value={form.qualifications ?? ""}
            disabled={!canEdit}
            onChange={(e) => update("qualifications", e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">{t("clinical.qp.cvSummary")}</span>
          <textarea
            rows={5}
            className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
            value={form.cvSummary ?? ""}
            disabled={!canEdit}
            onChange={(e) => update("cvSummary", e.target.value)}
            placeholder={t("clinical.qp.cvSummaryPlaceholder")}
          />
        </label>
        <div className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">{t("clinical.qp.cvFile")}</span>
          <p className="text-xs text-muted-foreground">{t("clinical.qp.cvFileHint")}</p>
          {form.cvFileKey && form.cvFileName && (
            <div className="flex items-center gap-2 rounded border border-border px-2 py-1 text-xs">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <a href={qpFileUrl(form.cvFileKey)} target="_blank" rel="noopener noreferrer" className="truncate text-primary underline">
                {form.cvFileName}
              </a>
              {canEdit && (
                <button type="button" className="ml-auto text-destructive" onClick={() => clearFile("cv")}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          {canEdit && (
            <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-primary underline">
              {uploadingKind === "cv" ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
              {t("clinical.qp.uploadCv")}
              <input
                type="file"
                accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                disabled={uploadingKind !== null}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFile("cv", file);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={form.coiDeclared ?? false}
            disabled={!canEdit}
            onChange={(e) => update("coiDeclared", e.target.checked)}
          />
          <span>{t("clinical.qp.coiDeclared")}</span>
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">{t("clinical.qp.coiStatement")}</span>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
            value={form.coiStatement ?? ""}
            disabled={!canEdit}
            onChange={(e) => update("coiStatement", e.target.value)}
            placeholder={t("clinical.qp.coiPlaceholder")}
          />
        </label>
        <div className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">{t("clinical.qp.coiFile")}</span>
          <p className="text-xs text-muted-foreground">{t("clinical.qp.coiFileHint")}</p>
          {form.coiFileKey && form.coiFileName && (
            <div className="flex items-center gap-2 rounded border border-border px-2 py-1 text-xs">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <a href={qpFileUrl(form.coiFileKey)} target="_blank" rel="noopener noreferrer" className="truncate text-primary underline">
                {form.coiFileName}
              </a>
              {canEdit && (
                <button type="button" className="ml-auto text-destructive" onClick={() => clearFile("coi")}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          {canEdit && (
            <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-primary underline">
              {uploadingKind === "coi" ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
              {t("clinical.qp.uploadCoi")}
              <input
                type="file"
                accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                disabled={uploadingKind !== null}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFile("coi", file);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {canEdit && (
        <Button size="sm" disabled={loading} onClick={save} className="gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {t("clinical.qp.save")}
        </Button>
      )}
    </div>
  );
}
