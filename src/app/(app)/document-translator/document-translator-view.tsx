"use client";

import { useRef, useState } from "react";
import { UploadCloud, Languages, Loader2, Download, AlertCircle, FileText } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/ui/disclaimer";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import {
  TRANSLATOR_LOCALES,
  TRANSLATOR_LOCALE_LABELS,
  type TranslatorLocale,
} from "@/lib/document-translator/locales";

function parseFileNameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star?.[1]) return decodeURIComponent(star[1]);
  const plain = /filename="([^"]+)"/i.exec(header);
  return plain?.[1] ?? null;
}

export function DocumentTranslatorView({ canTranslate }: { canTranslate: boolean }) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sourceLang, setSourceLang] = useState<TranslatorLocale | "auto">("auto");
  const [targetLang, setTargetLang] = useState<TranslatorLocale>("en");
  const [pdfOutputFormat, setPdfOutputFormat] = useState<"pdf" | "docx">("pdf");
  const isPdfInput = Boolean(file?.name.toLowerCase().endsWith(".pdf"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ name: string; truncated: boolean; outputKind: string } | null>(null);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);

  function onPick(list: FileList | null) {
    if (!list?.[0]) return;
    setFile(list[0]);
    setError(null);
    setLastResult(null);
    setDownloadBlob(null);
  }

  async function translate() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setLastResult(null);
    setDownloadBlob(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("sourceLang", sourceLang);
      form.append("targetLang", targetLang);
      if (file.name.toLowerCase().endsWith(".pdf")) {
        form.append("pdfOutputFormat", pdfOutputFormat);
      }

      const res = await fetch("/api/document-translator/translate", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : t("docTranslator.error"));
        return;
      }

      const blob = await res.blob();
      const outName =
        parseFileNameFromDisposition(res.headers.get("Content-Disposition")) ??
        `translated_${targetLang.toUpperCase()}.${
          file.name.toLowerCase().endsWith(".xlsx")
            ? "xlsx"
            : file.name.toLowerCase().endsWith(".pdf") && pdfOutputFormat === "pdf"
              ? "pdf"
              : "docx"
        }`;
      const truncated = res.headers.get("X-Translation-Truncated") === "1";
      const outputKind = res.headers.get("X-Translation-Output-Kind") ?? "docx";

      setDownloadBlob(blob);
      setLastResult({ name: outName, truncated, outputKind });
    } catch {
      setError(t("docTranslator.error"));
    } finally {
      setBusy(false);
    }
  }

  function downloadResult() {
    if (!downloadBlob || !lastResult) return;
    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = lastResult.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("docTranslator.title")} description={t("docTranslator.desc")} />

      <Disclaimer text={t("docTranslator.disclaimer")} />

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">{t("docTranslator.sourceLang")}</span>
              <select
                value={sourceLang}
                onChange={(e) => {
                  const v = e.target.value;
                  setSourceLang(v === "auto" ? "auto" : (v as TranslatorLocale));
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canTranslate || busy}
              >
                <option value="auto">{t("docTranslator.langAuto")}</option>
                {TRANSLATOR_LOCALES.map((code) => (
                  <option key={code} value={code}>
                    {TRANSLATOR_LOCALE_LABELS[code]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">{t("docTranslator.targetLang")}</span>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value as TranslatorLocale)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canTranslate || busy}
              >
                {TRANSLATOR_LOCALES.map((code) => (
                  <option key={code} value={code}>
                    {TRANSLATOR_LOCALE_LABELS[code]}
                  </option>
                ))}
              </select>
            </label>
            {isPdfInput && (
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground">{t("docTranslator.pdfOutput")}</span>
                <select
                  value={pdfOutputFormat}
                  onChange={(e) => setPdfOutputFormat(e.target.value as "pdf" | "docx")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={!canTranslate || busy}
                >
                  <option value="pdf">{t("docTranslator.pdfOutputPdf")}</option>
                  <option value="docx">{t("docTranslator.pdfOutputDocx")}</option>
                </select>
                <p className="text-xs text-muted-foreground">{t("docTranslator.pdfLayoutNote")}</p>
              </label>
            )}
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => canTranslate && inputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && canTranslate && inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (canTranslate) onPick(e.dataTransfer.files);
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-6 py-10 text-center transition-colors ${
              canTranslate ? "cursor-pointer hover:border-primary/50 hover:bg-muted/30" : "opacity-60"
            }`}
          >
            <UploadCloud className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">{t("docTranslator.dropTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("docTranslator.dropHint")}</p>
            {file && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-foreground">
                <FileText className="h-4 w-4" />
                {file.name}
              </p>
            )}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".docx,.pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => onPick(e.target.files)}
            />
          </div>

          {!canTranslate && (
            <p className="text-sm text-muted-foreground">{t("docTranslator.roleHint")}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="gap-1.5"
              disabled={!canTranslate || !file || busy}
              onClick={translate}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
              {busy ? t("docTranslator.translating") : t("docTranslator.translateBtn")}
            </Button>
            {busy && <AiAnalyzingHint />}
          </div>

          {lastResult && downloadBlob && (
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
              <p className="text-sm font-medium">{t("docTranslator.ready")}</p>
              <p className="text-xs text-muted-foreground">
                {lastResult.name}
                {lastResult.outputKind === "pdf" && isPdfInput
                  ? ` — ${t("docTranslator.pdfLayoutNoteShort")}`
                  : ""}
              </p>
              {lastResult.truncated && (
                <p className="text-xs text-amber-700 dark:text-amber-400">{t("docTranslator.truncated")}</p>
              )}
              <Button size="sm" variant="outline" className="gap-1.5" onClick={downloadResult}>
                <Download className="h-4 w-4" />
                {t("docTranslator.download")}
              </Button>
            </div>
          )}

          {error && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
