"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, FileText, AlertCircle } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type UploadKind = "IFU" | "LABEL";

interface UploadResult {
  fileName: string;
  documentKind: string;
  analysisSummary: string | null;
  analysisJson: {
    complianceGaps?: string[];
    summary?: string;
  } | null;
}

export function IfuUploadAudit({ productId }: { productId: string }) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<UploadKind>("IFU");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);

  async function onFile(file: File) {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("productId", productId);
      form.append("documentKind", kind);
      const res = await fetch("/api/files/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t("ifu.uploadError"));
      setResult({
        fileName: data.file.fileName,
        documentKind: data.file.documentKind,
        analysisSummary: data.file.analysisSummary,
        analysisJson: data.file.analysisJson ?? null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ifu.uploadError"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const gaps = result?.analysisJson?.complianceGaps ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("ifu.uploadTitle")}</CardTitle>
        <p className="text-xs text-muted-foreground">{t("ifu.uploadDesc")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {(["IFU", "LABEL"] as const).map((k) => (
            <Button
              key={k}
              type="button"
              size="sm"
              variant={kind === k ? "default" : "outline"}
              onClick={() => setKind(k)}
            >
              {k === "IFU" ? t("ifu.uploadIfu") : t("ifu.uploadLabel")}
            </Button>
          ))}
        </div>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
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
          {t("ifu.uploadBtn")}
        </Button>

        {error && (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        {result && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <FileText className="h-4 w-4" />
              {result.fileName}
              <Badge variant="outline">{result.documentKind}</Badge>
            </p>
            {result.analysisSummary && (
              <p className="mt-2 text-muted-foreground">{result.analysisSummary}</p>
            )}
            {gaps.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {gaps.map((g, i) => (
                  <li key={i}>• {g}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
