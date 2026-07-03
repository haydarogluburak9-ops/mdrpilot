"use client";

import { type ButtonProps } from "@/components/ui/button";
import { DownloadSelectButton } from "@/components/ui/download-select-button";

export function OperationalExportButton({
  exportBaseUrl,
  disabled,
  size = "sm",
  variant = "outline",
  className,
  label,
  onBeforeExport,
}: {
  /** e.g. `/api/operational/ncp/abc123/export` */
  exportBaseUrl: string;
  disabled?: boolean;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
  label?: string;
  onBeforeExport?: () => Promise<void>;
}) {
  return (
    <DownloadSelectButton
      disabled={disabled}
      size={size}
      variant={variant}
      className={className}
      label={label}
      onBeforeDownload={onBeforeExport}
      onDownload={({ lang, format }) => {
        const a = document.createElement("a");
        a.href = `${exportBaseUrl}?lang=${lang}&format=${format}`;
        a.rel = "noopener";
        a.click();
      }}
    />
  );
}
