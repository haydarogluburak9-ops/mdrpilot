"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Loader2, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { OperationalExportButton } from "@/components/operational/operational-export-button";
import { CapaStructuredForm } from "@/components/operational/capa-structured-form";
import { ComplaintCh01StructuredForm } from "@/components/operational/complaint-structured-form";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  parseCapaFormMarkdown,
  serializeCapaFormMarkdown,
  type CapaFormData,
} from "@/lib/operational/capa-form-model";
import {
  parseComplaintCh01Markdown,
  serializeComplaintCh01Markdown,
  type ComplaintCh01FormData,
} from "@/lib/operational/complaint-form-model";
import { procedureChildHintPlaceholder } from "@/lib/qms/procedure-hint-examples";
import { inferQmsLayerFromCode } from "@/lib/qms/kys-structure";

export function OperationalRecordPanel({
  module,
  recordId,
  title,
  formContent: initialFormContent,
  qmsDocumentId,
  complaintNo,
  canEdit,
  defaultExpanded,
}: {
  module: "capa" | "complaint";
  recordId: string;
  title: string;
  formContent?: string | null;
  qmsDocumentId?: string | null;
  complaintNo?: string | null;
  canEdit: boolean;
  defaultExpanded?: boolean;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const locale = lang === "en" ? "en" : "tr";
  const apiBase = module === "capa" ? "/api/capa" : "/api/complaints";
  const formCode = module === "capa" ? "FORM-CAPA-01" : "FORM-CH-01";
  const sopCode = module === "capa" ? "SOP-CAPA" : "SOP-CH";

  const initialTrimmed = (initialFormContent ?? "").trim();
  const [open, setOpen] = useState(defaultExpanded ?? (module === "complaint" || !initialTrimmed));
  const [formContent, setFormContent] = useState(initialFormContent ?? "");
  const [hint, setHint] = useState(title);
  const [capaData, setCapaData] = useState<CapaFormData | null>(null);
  const [complaintData, setComplaintData] = useState<ComplaintCh01FormData | null>(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serializedCapa = useMemo(() => {
    if (module !== "capa" || !capaData) return "";
    return serializeCapaFormMarkdown(capaData, locale);
  }, [module, capaData, locale]);

  const serializedComplaint = useMemo(() => {
    if (module !== "complaint" || !complaintData) return "";
    return serializeComplaintCh01Markdown(complaintData, locale);
  }, [module, complaintData, locale]);

  const dirty =
    module === "capa" && capaData
      ? serializedCapa.trim() !== initialTrimmed
      : module === "complaint" && complaintData
        ? serializedComplaint.trim() !== initialTrimmed
        : formContent.trim() !== initialTrimmed;

  useEffect(() => {
    setFormContent(initialFormContent ?? "");
    setHint(title);
    if (module === "capa") {
      setCapaData(parseCapaFormMarkdown(initialFormContent ?? "", locale));
      setComplaintData(null);
    } else {
      const parsed = parseComplaintCh01Markdown(initialFormContent ?? "", locale);
      if (complaintNo && !parsed.complaintNo) parsed.complaintNo = complaintNo;
      setComplaintData(parsed);
      setCapaData(null);
    }
    if (defaultExpanded) setOpen(true);
  }, [initialFormContent, recordId, module, locale, complaintNo, title, defaultExpanded]);

  useEffect(() => {
    if (!open || initialTrimmed) return;
    let cancelled = false;
    setLoadingForm(true);
    fetch(`${apiBase}/${recordId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const content = data.capa?.formContent ?? data.complaint?.formContent ?? "";
        if (content.trim()) {
          setFormContent(content);
          if (module === "capa") setCapaData(parseCapaFormMarkdown(content, locale));
          if (module === "complaint") setComplaintData(parseComplaintCh01Markdown(content, locale));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingForm(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, apiBase, recordId, initialTrimmed, module, locale]);

  function handleCapaChange(data: CapaFormData) {
    setCapaData(data);
    setFormContent(serializeCapaFormMarkdown(data, locale));
    setSaveOk(false);
  }

  function handleComplaintChange(data: ComplaintCh01FormData) {
    setComplaintData(data);
    setFormContent(serializeComplaintCh01Markdown(data, locale));
    setSaveOk(false);
  }

  async function saveRecord() {
    const payload =
      module === "capa" && capaData
        ? serializeCapaFormMarkdown(capaData, locale)
        : module === "complaint" && complaintData
          ? serializeComplaintCh01Markdown(complaintData, locale)
          : formContent.trim();

    if (!payload) {
      setError(t("qms.edit.contentRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    setSaveOk(false);
    try {
      const res = await fetch(`${apiBase}/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formContent: payload, locale: lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("operational.saveError"));
        return;
      }
      setSaveOk(true);
      router.refresh();
    } catch {
      setError(t("operational.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    setSaveOk(false);
    try {
      const res = await fetch(`${apiBase}/${recordId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: lang, userContext: hint.trim() || title }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("qms.generate.error"));
        return;
      }
      const content = typeof data.content === "string" ? data.content : "";
      if (content.trim()) {
        setFormContent(content);
        if (module === "capa") setCapaData(parseCapaFormMarkdown(content, locale));
        if (module === "complaint") setComplaintData(parseComplaintCh01Markdown(content, locale));
      }
      router.refresh();
    } catch {
      setError(t("qms.generate.error"));
    } finally {
      setGenerating(false);
    }
  }

  const hasContent =
    module === "capa"
      ? Boolean(capaData && serializedCapa.trim())
      : module === "complaint"
        ? Boolean(complaintData && serializedComplaint.trim())
        : formContent.trim().length > 0;

  const hintPlaceholder = procedureChildHintPlaceholder(
    sopCode,
    inferQmsLayerFromCode(formCode),
    formCode,
    lang,
  );

  return (
    <div className="mt-2 rounded-md border border-border/60 bg-muted/10">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-primary hover:bg-muted/40"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {t("operational.openFormPanel")} — {formCode}
      </button>

      {open && (
        <div className="space-y-3 border-t border-border/60 px-3 py-3">
          <p className="text-xs text-muted-foreground">{t("operational.formPanelHint")}</p>

          {canEdit && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("qms.procedure.childHintLabel")}</label>
              <textarea
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder={hintPlaceholder}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={generating}
              />
            </div>
          )}

          {loadingForm ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("operational.loadingForm")}
            </p>
          ) : module === "capa" && capaData ? (
            <CapaStructuredForm data={capaData} onChange={handleCapaChange} disabled={!canEdit || generating} />
          ) : module === "complaint" && complaintData ? (
            <ComplaintCh01StructuredForm
              data={complaintData}
              onChange={handleComplaintChange}
              disabled={!canEdit || generating}
            />
          ) : (
            <textarea
              value={formContent}
              onChange={(e) => {
                setFormContent(e.target.value);
                setSaveOk(false);
              }}
              readOnly={!canEdit}
              rows={16}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono leading-relaxed"
              placeholder={t("qms.edit.contentPlaceholder")}
            />
          )}

          {generating && <AiAnalyzingHint />}

          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={generating || saving}
                  onClick={generate}
                >
                  {generating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {t("qms.generate.btn")}
                </Button>
                <Button size="sm" className="gap-1.5" disabled={saving || generating || !dirty} onClick={saveRecord}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {saving ? t("qms.edit.saving") : t("operational.saveRecord")}
                </Button>
              </>
            )}
            <OperationalExportButton
              exportBaseUrl={`${apiBase}/${recordId}/export`}
              disabled={generating || saving}
              onBeforeExport={dirty ? saveRecord : undefined}
            />
          </div>

          {saveOk && <p className="text-xs text-green-600 dark:text-green-400">{t("operational.saveOk")}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
          {!hasContent && !loadingForm && !generating && (
            <p className="text-xs text-muted-foreground">
              {t("operational.noFormYet")} — {title}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
