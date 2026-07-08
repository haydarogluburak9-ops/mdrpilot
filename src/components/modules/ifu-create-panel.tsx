"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { useI18n } from "@/components/providers/i18n-provider";
import { ifuAiInput } from "@/lib/domain/ai-input";
import { flattenLabelModels } from "@/lib/domain/label-models";
import { downloadExportJob } from "@/lib/exports/download-client";
import type { Product } from "@/lib/domain/types";
import { IfuContentPreview, type IfuPreviewContent } from "./ifu-content-preview";
import { ExportResultCard } from "./export-result-card";

interface ExportJobResult {
  id: string;
  fileName: string | null;
  sizeBytes: number | null;
}

function parseIfuBlock(block: Record<string, unknown>): IfuPreviewContent {
  const str = (k: string) => (typeof block[k] === "string" ? block[k] : undefined) as string | undefined;
  const arr = (k: string) => (Array.isArray(block[k]) ? (block[k] as unknown[]).filter((w): w is string => typeof w === "string") : undefined);
  return {
    productDescription: str("productDescription"),
    technicalSpecifications: str("technicalSpecifications"),
    intendedPurpose: str("intendedPurpose"),
    intendedUsers: str("intendedUsers"),
    patientPopulation: str("patientPopulation"),
    clinicalBenefits: str("clinicalBenefits"),
    indications: str("indications"),
    contraindications: str("contraindications"),
    warnings: arr("warnings"),
    precautions: arr("precautions"),
    instructions: str("instructions"),
    biocompatibility: str("biocompatibility"),
    storage: str("storage"),
    shelfLifeDetail: str("shelfLifeDetail"),
    sterilityInfo: str("sterilityInfo"),
    disposal: str("disposal"),
    wasteSeparation: str("wasteSeparation"),
    mdrAnnexIDeclaration: str("mdrAnnexIDeclaration"),
    incidentReporting: str("incidentReporting"),
    troubleshooting: arr("troubleshooting"),
    symbolsGlossary: arr("symbolsGlossary"),
    regulatoryInfo: str("regulatoryInfo"),
    revisionHistory: str("revisionHistory"),
  };
}

function parseAiPayload(data: unknown): { ifuContent?: IfuPreviewContent; labelCaution?: string } {
  if (!data || typeof data !== "object") return {};
  const d = data as Record<string, unknown>;
  const labelCaution = typeof d.labelCaution === "string" ? d.labelCaution : undefined;

  const ifuRaw = d.ifu;
  if (ifuRaw && typeof ifuRaw === "object") {
    return { labelCaution, ifuContent: parseIfuBlock(ifuRaw as Record<string, unknown>) };
  }

  return { labelCaution };
}

function parseAiResponse(json: unknown): { ifuContent?: IfuPreviewContent; labelCaution?: string } {
  if (!json || typeof json !== "object") return {};
  const body = json as Record<string, unknown>;
  const fromData = parseAiPayload(body.result && typeof body.result === "object" ? (body.result as Record<string, unknown>).data : null);
  if (fromData.ifuContent) return fromData;
  const fromResult = parseAiPayload(body.result);
  if (fromResult.ifuContent) return fromResult;
  return fromData;
}

export function IfuCreatePanel({
  product,
  selectedModelIds,
  onSelectedModelIdsChange,
}: {
  product: Product;
  selectedModelIds: string[];
  onSelectedModelIdsChange: (ids: string[]) => void;
}) {
  const { t, lang } = useI18n();
  const [busy, setBusy] = useState<"IFU_DOCX" | "LABEL_PDF" | null>(null);
  const [phase, setPhase] = useState<"ai" | "export" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ifuPreview, setIfuPreview] = useState<IfuPreviewContent | null>(null);
  const [lastIfuJob, setLastIfuJob] = useState<ExportJobResult | null>(null);
  const [lastLabelJob, setLastLabelJob] = useState<ExportJobResult | null>(null);

  const allModelIds = useMemo(
    () => flattenLabelModels(product.variants, product.brand, product.model).map((m) => m.id),
    [product.variants, product.brand, product.model],
  );

  useEffect(() => {
    if (ifuPreview || lastIfuJob) {
      window.requestAnimationFrame(() => {
        document.getElementById("ifu-result")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }, [ifuPreview, lastIfuJob]);

  useEffect(() => {
    setIfuPreview(null);
    setLastIfuJob(null);
    setLastLabelJob(null);
    setError(null);
  }, [product.id]);

  async function fetchAiContent(): Promise<{ ifuContent?: IfuPreviewContent; labelCaution?: string }> {
    const res = await fetch("/api/ai/ifu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...ifuAiInput(product), productId: product.id, _locale: lang }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? t("exports.failed"));
    return parseAiResponse(data);
  }

  async function runExport(type: "IFU_DOCX" | "LABEL_PDF", modelRefs?: string[]) {
    setBusy(type);
    setPhase("ai");
    setError(null);
    try {
      const ai = await fetchAiContent();
      if (ai.ifuContent) {
        setIfuPreview(ai.ifuContent);
      }

      const refs = type === "LABEL_PDF" ? (modelRefs?.length ? modelRefs : allModelIds) : undefined;
      if (type === "LABEL_PDF" && !refs?.length) {
        setError(t("ifu.modelSelectDesc"));
        return;
      }

      setPhase("export");
      const res = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          productId: product.id,
          language: lang,
          modelRefs: refs,
          ifuContent: ai.ifuContent,
          labelCaution: ai.labelCaution,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("exports.failed"));
        return;
      }

      const job = data.job as ExportJobResult;
      if (type === "IFU_DOCX") {
        setLastIfuJob(job);
      } else {
        setLastLabelJob(job);
      }

      try {
        await downloadExportJob(job.id, job.fileName);
      } catch {
        // Card below offers a manual retry button.
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("exports.networkError"));
    } finally {
      setBusy(null);
      setPhase(null);
    }
  }

  const selectedCount = selectedModelIds.length;
  const statusText =
    busy === "IFU_DOCX"
      ? phase === "ai"
        ? t("ifu.generatingAi")
        : t("ifu.generatingDocx")
      : busy === "LABEL_PDF"
        ? phase === "ai"
          ? t("ifu.generatingAi")
          : t("ifu.generatingPdf")
        : null;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold">{t("ifu.createIfuSection")}</p>
        <Button
          type="button"
          variant="accent"
          className="gap-2"
          disabled={busy !== null}
          onClick={() => runExport("IFU_DOCX")}
        >
          {busy === "IFU_DOCX" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {t("ifu.createIfuAiBtn")}
          {busy !== "IFU_DOCX" && <Download className="h-3.5 w-3.5 opacity-80" />}
        </Button>
        {busy === "IFU_DOCX" && statusText && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{statusText}</p>
            {phase === "ai" && <AiAnalyzingHint />}
          </div>
        )}
        {!busy && !ifuPreview && !lastIfuJob && (
          <p className="text-xs text-muted-foreground">{t("ifu.noGeneratedYet")}</p>
        )}
      </div>

      {(ifuPreview || lastIfuJob) && (
        <div id="ifu-result" className="scroll-mt-4 space-y-4">
          {lastIfuJob && (
            <ExportResultCard
              jobId={lastIfuJob.id}
              fileName={lastIfuJob.fileName}
              sizeBytes={lastIfuJob.sizeBytes}
              downloadLabel={t("ifu.downloadDocx")}
            />
          )}
          {ifuPreview && (
            <div className="rounded-lg border border-primary/30 bg-muted/20 p-4">
              <p className="mb-1 text-sm font-semibold">{t("ifu.previewTitle")}</p>
              <p className="mb-4 text-xs text-muted-foreground">{t("ifu.previewDesc")}</p>
              <IfuContentPreview content={ifuPreview} />
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 border-t border-border pt-4">
        <div>
          <p className="text-sm font-semibold">{t("ifu.createLabelSection")}</p>
          <p className="text-xs text-muted-foreground">{t("ifu.modelSelectDesc")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => onSelectedModelIdsChange(allModelIds)}>
            {t("ifu.modelSelectAll")}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onSelectedModelIdsChange([])}>
            {t("ifu.modelClearAll")}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t("ifu.modelSelectedCount").replace("{n}", String(selectedCount))}
          </span>
        </div>
        <Button
          type="button"
          variant="accent"
          className="gap-2"
          disabled={busy !== null || selectedCount === 0}
          onClick={() => runExport("LABEL_PDF", selectedModelIds)}
        >
          {busy === "LABEL_PDF" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {t("ifu.createLabelAiBtn")}
          {busy !== "LABEL_PDF" && <Download className="h-3.5 w-3.5 opacity-80" />}
        </Button>
        {busy === "LABEL_PDF" && statusText && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{statusText}</p>
            {phase === "ai" && <AiAnalyzingHint />}
          </div>
        )}
        {lastLabelJob && (
          <ExportResultCard
            jobId={lastLabelJob.id}
            fileName={lastLabelJob.fileName}
            sizeBytes={lastLabelJob.sizeBytes}
            downloadLabel={t("ifu.downloadPdf")}
          />
        )}
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}
    </div>
  );
}
