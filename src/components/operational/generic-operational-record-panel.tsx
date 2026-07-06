"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Loader2, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { GenericStructuredForm } from "@/components/operational/generic-structured-form";
import { NcpStructuredForm } from "@/components/operational/ncp-structured-form";
import { TrainingStructuredForm } from "@/components/operational/training-structured-form";
import { CalibrationStructuredForm } from "@/components/operational/calibration-structured-form";
import { OperationalExportButton } from "@/components/operational/operational-export-button";
import { useI18n } from "@/components/providers/i18n-provider";
import type { OperationalModuleDef } from "@/lib/operational/modules";
import { initGenericFormContent } from "@/lib/operational/generic-form-model";
import {
  parseNcpFormMarkdown,
  serializeNcpFormMarkdown,
  type NcpFormData,
} from "@/lib/operational/ncp-form-model";
import {
  parseTrainingFormMarkdown,
  serializeTrainingFormMarkdown,
  type TrainingFormData,
} from "@/lib/operational/training-form-model";
import {
  parseCalibrationFormMarkdown,
  serializeCalibrationFormMarkdown,
  type CalibrationFormData,
} from "@/lib/operational/calibration-form-model";
import {
  parseCapaFormMarkdown,
  serializeCapaFormMarkdown,
} from "@/lib/operational/capa-form-model";
import { buildFormCapa01 } from "@/lib/qms/form-templates";
import { inferQmsLayerFromCode } from "@/lib/qms/kys-structure";
import { procedureChildHintPlaceholder } from "@/lib/qms/procedure-hint-examples";

type StructuredFormKind = "ncp" | "training" | "calibration" | null;

function structuredFormKind(formCode: string): StructuredFormKind {
  if (formCode === "FORM-NCP-01") return "ncp";
  if (formCode === "FORM-HR-01") return "training";
  if (formCode === "FORM-ME-01") return "calibration";
  return null;
}

export function GenericOperationalRecordPanel({
  moduleSlug,
  def,
  recordId,
  title,
  formContent: initialFormContent,
  referenceNo,
  canEdit,
  defaultExpanded,
}: {
  moduleSlug: string;
  def: OperationalModuleDef;
  recordId: string;
  title: string;
  formContent?: string | null;
  referenceNo?: string | null;
  canEdit: boolean;
  defaultExpanded?: boolean;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const locale = lang === "en" ? "en" : "tr";
  const apiBase = `/api/operational/${moduleSlug}`;
  const formKind = structuredFormKind(def.formCode);

  const initialTrimmed = (initialFormContent ?? "").trim();
  const [open, setOpen] = useState(defaultExpanded ?? !initialTrimmed);
  const [formContent, setFormContent] = useState(
    initialTrimmed || initGenericFormContent(def.formCode, locale, referenceNo ?? undefined),
  );
  const [ncpData, setNcpData] = useState<NcpFormData | null>(
    formKind === "ncp" ? parseNcpFormMarkdown(formContent, locale) : null,
  );
  const [trainingData, setTrainingData] = useState<TrainingFormData | null>(
    formKind === "training" ? parseTrainingFormMarkdown(formContent, locale) : null,
  );
  const [calibrationData, setCalibrationData] = useState<CalibrationFormData | null>(
    formKind === "calibration" ? parseCalibrationFormMarkdown(formContent, locale) : null,
  );
  const [hint, setHint] = useState(title);
  const [loadingForm, setLoadingForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serializedStructured = useMemo(() => {
    if (formKind === "ncp" && ncpData) return serializeNcpFormMarkdown(ncpData, locale);
    if (formKind === "training" && trainingData) return serializeTrainingFormMarkdown(trainingData, locale);
    if (formKind === "calibration" && calibrationData) {
      return serializeCalibrationFormMarkdown(calibrationData, locale);
    }
    return "";
  }, [formKind, ncpData, trainingData, calibrationData, locale]);

  const dirty = formKind
    ? serializedStructured.trim() !== initialTrimmed
    : formContent.trim() !== initialTrimmed;

  function applyStructuredContent(content: string) {
    setFormContent(content);
    if (formKind === "ncp") setNcpData(parseNcpFormMarkdown(content, locale));
    if (formKind === "training") setTrainingData(parseTrainingFormMarkdown(content, locale));
    if (formKind === "calibration") setCalibrationData(parseCalibrationFormMarkdown(content, locale));
  }

  useEffect(() => {
    const next = (initialFormContent ?? "").trim();
    const content = next || initGenericFormContent(def.formCode, locale, referenceNo ?? undefined);
    setFormContent(content);
    applyStructuredContent(content);
    setOpen(defaultExpanded ?? !next);
    setHint(title);
  }, [initialFormContent, recordId, def.formCode, locale, referenceNo, title, defaultExpanded, formKind]);

  useEffect(() => {
    if (!open || initialTrimmed) return;
    let cancelled = false;
    setLoadingForm(true);
    fetch(`${apiBase}/${recordId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const content = data.record?.formContent ?? "";
        if (content.trim()) applyStructuredContent(content);
      })
      .finally(() => {
        if (!cancelled) setLoadingForm(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, apiBase, recordId, initialTrimmed, formKind, locale]);

  function handleNcpChange(data: NcpFormData) {
    setNcpData(data);
    setFormContent(serializeNcpFormMarkdown(data, locale));
    setSaveOk(false);
  }

  function handleTrainingChange(data: TrainingFormData) {
    setTrainingData(data);
    setFormContent(serializeTrainingFormMarkdown(data, locale));
    setSaveOk(false);
  }

  function handleCalibrationChange(data: CalibrationFormData) {
    setCalibrationData(data);
    setFormContent(serializeCalibrationFormMarkdown(data, locale));
    setSaveOk(false);
  }

  async function saveRecord() {
    const payload = formKind ? serializedStructured.trim() : formContent.trim();
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

  async function createLinkedCapa(): Promise<{ capaRef: string; capaLinkedId: string } | null> {
    const ncp = ncpData ?? parseNcpFormMarkdown(formContent, locale);
    const capaTitle = ncp.ncDescription.trim() || title;
    try {
      const res = await fetch("/api/capa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `NCP: ${capaTitle.slice(0, 200)}`,
          rootCause: ncp.ncDescription.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("operational.ncp.createCapaError"));
        return null;
      }
      const capa = data.capa as { id?: string; referenceNo?: string | null };
      if (!capa?.id) return null;

      const capaNo = `CAPA-${capa.id.slice(-6).toUpperCase()}`;
      const capaForm = parseCapaFormMarkdown(buildFormCapa01(locale), locale);
      capaForm.capaNo = capaNo;
      capaForm.sourceProduction = true;
      capaForm.sourceRef = ncp.recordNo || referenceNo || recordId.slice(0, 8);
      capaForm.description = ncp.ncDescription;
      const capaFormContent = serializeCapaFormMarkdown(capaForm, locale);

      await fetch(`/api/capa/${capa.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceNo: capaNo,
          formContent: capaFormContent,
          locale: lang,
        }),
      });

      return { capaRef: capaNo, capaLinkedId: capa.id };
    } catch {
      setError(t("operational.ncp.createCapaError"));
      return null;
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
      if (typeof data.content === "string" && data.content.trim()) {
        applyStructuredContent(data.content);
      }
      router.refresh();
    } catch {
      setError(t("qms.generate.error"));
    } finally {
      setGenerating(false);
    }
  }

  const hintPlaceholder = procedureChildHintPlaceholder(
    def.sopCode,
    inferQmsLayerFromCode(def.formCode),
    def.formCode,
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
        {t("operational.openFormPanel")} — {def.formCode}
      </button>

      {open && (
        <div className="space-y-3 border-t border-border/60 p-3">
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("operational.loadingForm")}
            </div>
          ) : formKind === "ncp" && ncpData ? (
            <NcpStructuredForm
              data={ncpData}
              onChange={handleNcpChange}
              disabled={!canEdit || generating}
              onCreateCapa={canEdit ? createLinkedCapa : undefined}
            />
          ) : formKind === "training" && trainingData ? (
            <TrainingStructuredForm
              data={trainingData}
              onChange={handleTrainingChange}
              disabled={!canEdit || generating}
            />
          ) : formKind === "calibration" && calibrationData ? (
            <CalibrationStructuredForm
              data={calibrationData}
              onChange={handleCalibrationChange}
              disabled={!canEdit || generating}
            />
          ) : (
            <GenericStructuredForm
              formContent={formContent}
              onChange={(next) => {
                setFormContent(next);
                setSaveOk(false);
              }}
            />
          )}

          {generating && <AiAnalyzingHint />}

          {error && <p className="text-xs text-destructive">{error}</p>}
          {saveOk && <p className="text-xs text-emerald-600">{t("operational.saveOk")}</p>}

          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={generate}
                  disabled={generating || saving}
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {t("qms.generate.btn")}
                </Button>
                <Button size="sm" onClick={saveRecord} disabled={saving || generating || !dirty}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {t("operational.saveRecord")}
                </Button>
              </>
            )}
            <OperationalExportButton
              exportBaseUrl={`${apiBase}/${recordId}/export`}
              disabled={generating || saving}
              onBeforeExport={dirty ? saveRecord : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}
