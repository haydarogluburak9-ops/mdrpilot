"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, ExternalLink, Loader2, Plus, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QmsDownloadButton } from "@/components/qms/qms-download-button";
import { useI18n } from "@/components/providers/i18n-provider";
import { qmsDocTitle } from "@/lib/i18n/qms-doc-titles";
import { layerTitle, type QmsDocumentLayer } from "@/lib/qms/kys-structure";
import { PROCEDURE_CREATABLE_LAYERS } from "@/lib/qms/child-layer-guidance";
import { procedureExtraHintPlaceholder } from "@/lib/qms/procedure-hint-examples";
import { hasProcedurePack } from "@/lib/qms/procedure-packs/client";
import { prioritizeFormsToOpen, type GeneratedDocRef } from "@/lib/qms/open-forms";
import type { QmsDoc } from "@/lib/data/queries";

export function QmsProcedureWorkspace({
  procedure,
  childDocs,
  canEdit,
  onPickChild,
  onOpenDocuments,
}: {
  procedure: QmsDoc;
  childDocs: QmsDoc[];
  canEdit: boolean;
  onPickChild?: (doc: QmsDoc) => void;
  onOpenDocuments?: (codes: string[]) => void;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const procedureCode = procedure.code ?? "";

  const [contentOpen, setContentOpen] = useState<Record<string, boolean>>({});
  const [packRunning, setPackRunning] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [extraLayer, setExtraLayer] = useState<QmsDocumentLayer>("INSTRUCTION");
  const [extraTitle, setExtraTitle] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [extraBusy, setExtraBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canEdit || !procedureCode) return null;

  const emptyCount = childDocs.filter((c) => !c.hasContent).length;
  const packAvailable = hasProcedurePack(procedureCode);

  function openGenerated(generated: GeneratedDocRef[]) {
    if (!onOpenDocuments || generated.length === 0) return;
    const codes = prioritizeFormsToOpen(generated);
    onOpenDocuments(codes);
  }

  async function ensurePackAndGenerate() {
    setPackRunning(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/qms/procedures/${encodeURIComponent(procedureCode)}/ensure-pack`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: lang, generate: true, onlyEmpty: true }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : t("qms.generate.error"));
      const generated = (data.generate?.generated ?? []) as GeneratedDocRef[];
      router.refresh();
      openGenerated(generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("qms.generate.error"));
    } finally {
      setPackRunning(false);
    }
  }

  async function generateAllChildren() {
    setBulkRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/qms/procedures/${encodeURIComponent(procedureCode)}/documents`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: lang, onlyEmpty: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : t("qms.generate.error"));
      const generated = (data.generated ?? []) as GeneratedDocRef[];
      router.refresh();
      openGenerated(generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("qms.generate.error"));
    } finally {
      setBulkRunning(false);
    }
  }

  async function createExtra() {
    if (!extraTitle.trim() && !extraContext.trim()) {
      setError(t("qms.procedure.extra.needInput"));
      return;
    }
    setExtraBusy(true);
    setError(null);
    try {
      const title =
        extraTitle.trim() ||
        extraContext.trim().slice(0, 80) ||
        layerTitle(extraLayer, lang);
      const res = await fetch(`/api/qms/procedures/${encodeURIComponent(procedureCode)}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layer: extraLayer,
          title,
          userContext: extraContext.trim(),
          locale: lang,
          generate: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : t("qms.generate.error"));
      setExtraTitle("");
      setExtraContext("");
      router.refresh();
      if (data.documentId && data.code) {
        openGenerated([{ documentId: data.documentId, code: data.code }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("qms.generate.error"));
    } finally {
      setExtraBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-4 rounded-lg border border-primary/20 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            {t("qms.procedure.workspaceTitle")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("qms.procedure.workspaceDesc")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {packAvailable ? (
            <Button
              size="sm"
              className="gap-1.5"
              disabled={packRunning}
              onClick={ensurePackAndGenerate}
            >
              {packRunning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              {t("qms.procedure.ensurePack")}
            </Button>
          ) : (
            emptyCount > 0 && (
              <Button
                size="sm"
                className="gap-1.5"
                disabled={bulkRunning}
                onClick={generateAllChildren}
              >
                {bulkRunning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {t("qms.procedure.generateAllChildren").replace("{n}", String(emptyCount))}
              </Button>
            )
          )}
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {childDocs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("qms.procedure.linkedDocs")}
          </p>
          <p className="text-xs text-muted-foreground">{t("qms.procedure.linkedDocsHint")}</p>
          <div className="divide-y divide-border/60 rounded-md border border-border/60 bg-muted/10">
            {childDocs.map((child) => {
              const code = child.code ?? child.id;
              const body = (child.content ?? "").trim();
              const showContent = child.hasContent && body.length > 0;
              const isOpen = contentOpen[code] ?? false;

              return (
                <div key={child.id} className="p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-primary shrink-0">{child.code}</span>
                      <span className="text-sm truncate">{qmsDocTitle(child.code, child.title, lang)}</span>
                      <Badge variant={showContent ? "secondary" : "outline"} className="text-[10px] shrink-0">
                        {showContent ? t("qms.procedure.hasContent") : t("qms.procedure.noContent")}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {layerTitle(child.layer as QmsDocumentLayer, lang)}
                      </Badge>
                      {child.parentProcedureCode && child.parentProcedureCode !== procedureCode && (
                        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary shrink-0">
                          {t("qms.procedure.sharedDoc")} ({child.parentProcedureCode})
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      {showContent && <QmsDownloadButton docId={child.id} />}
                      {onPickChild && (
                        <Button
                          size="sm"
                          variant={showContent ? "secondary" : "outline"}
                          className="gap-1.5"
                          onClick={() => onPickChild(child)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {t("qms.procedure.openDoc")}
                        </Button>
                      )}
                    </div>
                  </div>

                  {showContent && (
                    <div className="rounded-md border border-border/50 bg-background">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-muted/40"
                        onClick={() => setContentOpen((p) => ({ ...p, [code]: !isOpen }))}
                      >
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        {t("qms.procedure.contentPreview")}
                      </button>
                      {isOpen && (
                        <div className={`border-t border-border/50 px-3 py-2 text-xs whitespace-pre-wrap max-h-48 overflow-auto text-foreground/90 ${child.layer === "DIAGRAM" ? "font-mono leading-snug" : ""}`}>
                          {body.length > 2000 ? `${body.slice(0, 2000)}…` : body}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-border pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("qms.procedure.extraTitle")}
        </p>
        <p className="text-xs text-muted-foreground">{t("qms.procedure.extraDesc")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">{t("qms.procedure.extra.layer")}</span>
            <select
              value={extraLayer}
              onChange={(e) => setExtraLayer(e.target.value as QmsDocumentLayer)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {PROCEDURE_CREATABLE_LAYERS.map((l) => (
                <option key={l} value={l}>{layerTitle(l, lang)}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">{t("qms.procedure.extra.docTitle")}</span>
            <input
              type="text"
              value={extraTitle}
              onChange={(e) => setExtraTitle(e.target.value)}
              placeholder={t("qms.procedure.extra.docTitlePlaceholder")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>
        <textarea
          value={extraContext}
          onChange={(e) => setExtraContext(e.target.value)}
          placeholder={procedureExtraHintPlaceholder(procedureCode, extraLayer, lang)}
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <Button size="sm" className="gap-1.5" disabled={extraBusy} onClick={createExtra}>
          {extraBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          {t("qms.procedure.extra.createBtn")}
        </Button>
      </div>
    </div>
  );
}
