"use client";

import { type ButtonProps } from "@/components/ui/button";
import { DownloadSelectButton } from "@/components/ui/download-select-button";

export function QmsDownloadButton({
  docId,
  disabled,
  size = "sm",
  variant = "outline",
  className,
  label,
  defaultFormat,
}: {
  docId: string;
  disabled?: boolean;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
  label?: string;
  defaultFormat?: string;
}) {
  return (
    <DownloadSelectButton
      disabled={disabled}
      size={size}
      variant={variant}
      className={className}
      label={label}
      defaultFormat={defaultFormat}
      onDownload={({ lang, format }) => {
        const a = document.createElement("a");
        a.href = `/api/qms/${docId}/export?lang=${lang}&format=${format}`;
        a.rel = "noopener";
        a.click();
      }}
    />
  );
}
