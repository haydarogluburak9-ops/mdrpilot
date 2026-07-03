"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/components/providers/i18n-provider";
import { EXPORT_LANGUAGES, isExportLanguage } from "@/lib/exports/i18n";

export interface DownloadSelectOption {
  value: string;
  label: string;
}

export interface DownloadSelectButtonProps {
  disabled?: boolean;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
  label?: string;
  dialogTitle?: string;
  /** `false` hides language select. `undefined` uses all seven export locales. */
  langOptions?: false | DownloadSelectOption[];
  /** `false` hides format select. `undefined` uses Word/PDF defaults. */
  formatOptions?: false | DownloadSelectOption[];
  defaultLang?: string;
  defaultFormat?: string;
  showEnDocNoHint?: boolean;
  hint?: string;
  menuAlign?: "left" | "right";
  /** Hide language when selected format matches (e.g. ZIP = both languages). */
  hideLangWhenFormat?: string | string[];
  onDownload: (params: { lang: string; format: string }) => void | Promise<void>;
  onBeforeDownload?: () => void | Promise<void>;
}

export function DownloadSelectButton({
  disabled,
  size = "sm",
  variant = "outline",
  className,
  label,
  dialogTitle,
  langOptions,
  formatOptions,
  defaultLang,
  defaultFormat,
  showEnDocNoHint = true,
  hint,
  menuAlign = "right",
  hideLangWhenFormat,
  onDownload,
  onBeforeDownload,
}: DownloadSelectButtonProps) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const resolvedLangOptions = useMemo((): DownloadSelectOption[] | false => {
    if (langOptions === false) return false;
    if (langOptions) return langOptions;
    return EXPORT_LANGUAGES;
  }, [langOptions]);

  const resolvedFormatOptions = useMemo((): DownloadSelectOption[] | false => {
    if (formatOptions === false) return false;
    if (formatOptions) return formatOptions;
    return [
      { value: "docx", label: t("qms.download.formatDocx") },
      { value: "pdf", label: t("qms.download.formatPdf") },
    ];
  }, [formatOptions, t]);

  const formatOpts = resolvedFormatOptions === false ? [] : resolvedFormatOptions;
  const langOpts = resolvedLangOptions === false ? [] : resolvedLangOptions;

  const [exportLang, setExportLang] = useState(
    defaultLang ?? (isExportLanguage(lang) ? lang : "tr"),
  );
  const [format, setFormat] = useState(
    defaultFormat ?? formatOpts[0]?.value ?? "docx",
  );

  const hideLangSet = useMemo(() => {
    if (!hideLangWhenFormat) return new Set<string>();
    const raw = Array.isArray(hideLangWhenFormat) ? hideLangWhenFormat : [hideLangWhenFormat];
    return new Set(raw);
  }, [hideLangWhenFormat]);

  const showLangSelect =
    langOpts.length > 0 &&
    !hideLangSet.has(format);
  const showFormatSelect =
    formatOpts.length > 1 ||
    (resolvedLangOptions === false && formatOpts.length >= 1);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (defaultLang) return;
    setExportLang(isExportLanguage(lang) ? lang : "tr");
  }, [lang, defaultLang]);

  useEffect(() => {
    if (defaultFormat) return;
    if (resolvedFormatOptions !== false && resolvedFormatOptions[0]) {
      setFormat(resolvedFormatOptions[0].value);
    }
  }, [defaultFormat, resolvedFormatOptions]);

  async function runDownload() {
    setBusy(true);
    try {
      if (onBeforeDownload) await onBeforeDownload();
      const langParam = showLangSelect ? exportLang : langOpts[0]?.value ?? "tr";
      await onDownload({ lang: langParam, format });
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const menuPos = menuAlign === "left" ? "left-0" : "right-0";

  return (
    <div ref={wrapRef} className={`relative inline-flex ${className ?? ""}`}>
      <Button
        type="button"
        size={size}
        variant={variant}
        className="gap-1.5"
        disabled={disabled || busy}
        onClick={() => setOpen((v) => !v)}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        {label ?? t("qms.download")}
      </Button>

      {open && (
        <Card
          className={`absolute ${menuPos} top-full z-50 mt-1 w-72 border border-border p-3 shadow-lg space-y-3`}
        >
          <p className="text-sm font-medium">{dialogTitle ?? t("qms.download.dialogTitle")}</p>

          {showFormatSelect && (
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">{t("qms.download.format")}</span>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {formatOpts.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
              </select>
            </label>
          )}

          {showLangSelect && (
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">{t("qms.download.lang")}</span>
              <select
                value={exportLang}
                onChange={(e) => setExportLang(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {langOpts.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
              </select>
            </label>
          )}

          {hideLangSet.has(format) && hint && (
            <p className="text-xs text-muted-foreground">{hint}</p>
          )}

          {showEnDocNoHint && showLangSelect && exportLang !== "tr" && (
            <p className="text-xs text-muted-foreground">{t("qms.download.enDocNoHint")}</p>
          )}

          <Button type="button" size="sm" className="w-full gap-1.5" disabled={busy} onClick={runDownload}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {t("qms.download.confirm")}
          </Button>
        </Card>
      )}
    </div>
  );
}
