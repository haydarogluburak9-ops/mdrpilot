"use client";

import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { DownloadSelectButton } from "@/components/ui/download-select-button";
import { EXPORT_LANGUAGES } from "@/lib/exports/i18n";

const BILINGUAL_EXPORT_LANGS = EXPORT_LANGUAGES.filter((l) => l.value === "tr" || l.value === "en");

type ExportType =
  | "TECHNICAL_FILE_DOCX"
  | "FULL_MDR_TECHNICAL_FILE_ZIP"
  | "GSPR_XLSX"
  | "RISK_XLSX"
  | "IFU_DOCX"
  | "LABEL_PDF"
  | "PMS_PMCF_DOCX"
  | "QMS_PACKAGE_ZIP"
  | "AUDIT_READINESS_PDF"
  | "PRODUCT_DOSSIER_ZIP";

export interface ExportItem {
  type: ExportType;
  label: string;
}

function triggerDownload(jobId: string) {
  const a = document.createElement("a");
  a.href = `/api/exports/${jobId}/download`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function ExportButtons({
  productId,
  items,
  disabled,
  onCreated,
  langOptions = BILINGUAL_EXPORT_LANGS,
}: {
  productId?: string;
  items: ExportItem[];
  disabled?: boolean;
  onCreated?: () => void;
  langOptions?: false | typeof BILINGUAL_EXPORT_LANGS;
}) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);

  const formatOptions = useMemo(
    () => items.map((it) => ({ value: it.type, label: it.label })),
    [items],
  );

  async function run(type: ExportType, language: string) {
    setError(null);
    const res = await fetch("/api/exports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, productId, language }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? t("exports.failed"));
      return;
    }
    triggerDownload(data.job.id);
    onCreated?.();
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <DownloadSelectButton
        disabled={disabled}
        dialogTitle={t("exports.selectTitle")}
        langOptions={langOptions}
        formatOptions={formatOptions}
        defaultFormat={items[0]?.type}
        showEnDocNoHint={false}
        onDownload={({ format, lang }) => run(format as ExportType, lang)}
      />
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  );
}
