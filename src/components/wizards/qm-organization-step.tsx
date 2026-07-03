"use client";

import { useRef, useState } from "react";
import {
  Upload,
  Loader2,
  FileText,
  AlertCircle,
  Download,
  RefreshCw,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DownloadSelectButton } from "@/components/ui/download-select-button";
import { useI18n } from "@/components/providers/i18n-provider";
import type { WizardField } from "@/lib/wizards/quality-manual/steps";

const AUTO_ROLE_KEYS = new Set([
  "generalManager",
  "managementRepresentative",
  "qualityManager",
  "regulatoryResponsible",
  "productionResponsible",
  "purchasingResponsible",
  "complaintHandlingResponsible",
  "internalAuditResponsible",
  "managementReviewOwner",
]);

export function QmOrganizationStep({
  sessionId,
  fields,
  answers,
  setAnswers,
  locked,
  hasSopOrg = false,
}: {
  sessionId: string;
  fields: WizardField[];
  answers: Record<string, unknown>;
  setAnswers: (patch: Record<string, unknown>) => void;
  locked: boolean;
  hasSopOrg?: boolean;
}) {
  const { t, lang } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileId = String(answers.organizationRolesUploadedFileId ?? "");
  const fileName = String(answers.organizationRolesFileName ?? "");
  const fromWord = Boolean(fileId);
  const fromAi = Boolean(answers.organizationGeneratedByAi) && !fromWord;
  const structureText = String(answers.organizationStructureText ?? "");
  const chartText = String(answers.organizationChartText ?? "");
  const matrixText = String(answers.organizationRolesMatrixText ?? "");
  const hasContent = Boolean(structureText.trim() || chartText.trim() || matrixText.trim());
  const canExportDocx =
    hasContent || [...AUTO_ROLE_KEYS].some((k) => String(answers[k] ?? "").trim());

  const roleFields = fields.filter((f) => f.key !== "organizationStructureText");
  const canGenerateAi =
    !locked &&
    !fromWord &&
    String(answers.generalManager ?? "").trim() &&
    String(answers.managementRepresentative ?? "").trim() &&
    String(answers.qualityManager ?? "").trim();

  async function applyPatch(patch: Record<string, unknown>) {
    setAnswers(patch);
  }

  async function syncFromApi(body: { uploadedFileId?: string; syncFromCompany?: boolean }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/wizards/quality-manual/${sessionId}/organization-doc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("qmWizard.org.syncFailed"));
        return;
      }
      if (data.answers && typeof data.answers === "object") {
        await applyPatch(data.answers as Record<string, unknown>);
      }
    } catch {
      setError(t("qmWizard.networkError"));
    } finally {
      setBusy(false);
    }
  }

  async function generateWithAi() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/wizards/quality-manual/${sessionId}/organization-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: lang === "en" ? "en" : "tr",
          answers,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("qmWizard.org.aiFailed"));
        return;
      }
      if (data.answers && typeof data.answers === "object") {
        await applyPatch(data.answers as Record<string, unknown>);
      }
    } catch {
      setError(t("qmWizard.networkError"));
    } finally {
      setBusy(false);
    }
  }

  async function onFileChange(file: File | null) {
    if (!file || locked) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("documentKind", "OTHER");
      const up = await fetch("/api/files/upload", { method: "POST", body: form });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) {
        setError(typeof upData.error === "string" ? upData.error : t("qmWizard.org.uploadFailed"));
        return;
      }
      await syncFromApi({ uploadedFileId: upData.file?.id });
    } catch {
      setError(t("qmWizard.networkError"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const rolesLocked = locked || fromWord;

  return (
    <div className="space-y-5">
      {hasSopOrg && (
        <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          {t("qmWizard.org.fromSopOrg")}
        </p>
      )}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">{t("qmWizard.org.wordHint")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".doc,.docx,.pdf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            disabled={locked || busy}
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            size="sm"
            variant="default"
            className="gap-1.5"
            disabled={locked || busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {t("qmWizard.org.uploadWord")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={locked || busy}
            onClick={() => syncFromApi({ syncFromCompany: true })}
          >
            <RefreshCw className="h-4 w-4" />
            {t("qmWizard.org.syncCompany")}
          </Button>
          {fileId && (
            <a
              href={`/api/files/${fileId}/download`}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              {fileName || t("qmWizard.org.downloadWord")}
            </a>
          )}
        </div>
        {fromWord && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            {t("qmWizard.org.syncedFromWord")}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-dashed border-border p-4">
        <p className="text-sm font-medium">{t("qmWizard.org.aiSectionTitle")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("qmWizard.org.aiSectionHint")}</p>
        <div className="mt-3">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="gap-1.5"
            disabled={!canGenerateAi || busy}
            onClick={generateWithAi}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t("qmWizard.org.generateAi")}
          </Button>
        </div>
        {fromAi && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            {t("qmWizard.org.generatedByAi")}
          </p>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {(hasContent || canExportDocx) && (
        <div className="flex flex-wrap items-center gap-2">
          <DownloadSelectButton
            label={t("qmWizard.org.downloadDocx")}
            formatOptions={[{ value: "docx", label: t("qms.download.formatDocx") }]}
            onDownload={({ lang: exportLang }) => {
              const a = document.createElement("a");
              a.href = `/api/wizards/quality-manual/${sessionId}/organization-docx?lang=${exportLang}`;
              a.rel = "noopener";
              a.click();
            }}
          />
        </div>
      )}

      {hasContent && (
        <div className="space-y-4">
          {structureText.trim() && (
            <div>
              <label className="mb-1 block text-sm font-medium">{t("qmWizard.org.previewStructure")}</label>
              <pre className="max-h-40 overflow-y-auto rounded-lg border border-border bg-card p-3 text-xs leading-relaxed whitespace-pre-wrap">
                {structureText.slice(0, 4000)}
                {structureText.length > 4000 ? "\n…" : ""}
              </pre>
            </div>
          )}
          {chartText.trim() && (
            <div>
              <label className="mb-1 block text-sm font-medium">{t("qmWizard.org.previewChart")}</label>
              <pre className="max-h-40 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {chartText}
              </pre>
            </div>
          )}
          {matrixText.trim() && (
            <div>
              <label className="mb-1 block text-sm font-medium">{t("qmWizard.org.previewRoles")}</label>
              <pre className="max-h-48 overflow-y-auto rounded-lg border border-border bg-card p-3 text-xs leading-relaxed whitespace-pre-wrap">
                {matrixText}
              </pre>
            </div>
          )}
        </div>
      )}

      {!hasContent && !fromWord && !canExportDocx && (
        <p className="text-sm text-muted-foreground">{t("qmWizard.org.noStructure")}</p>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium">{t("qmWizard.org.rolesTitle")}</p>
        <p className="text-xs text-muted-foreground">
          {fromWord ? t("qmWizard.org.rolesReadonly") : t("qmWizard.org.rolesFillHint")}
        </p>
        {roleFields.map((f) => {
          const value = String(answers[f.key] ?? "");
          return (
            <div key={f.key}>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                {t(`qmField.${f.key}`)}
                {f.critical && <span className="text-destructive">*</span>}
              </label>
              <input
                value={value}
                readOnly={rolesLocked}
                onChange={(e) => !rolesLocked && setAnswers({ [f.key]: e.target.value })}
                placeholder={t("qmWizard.org.rolePlaceholder")}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm read-only:bg-muted/20 read-only:opacity-80 disabled:opacity-60"
              />
            </div>
          );
        })}
      </div>

      {!fromWord && !locked && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t("qmWizard.org.aiOrWord")}
        </p>
      )}
    </div>
  );
}
