"use client";

import { useState } from "react";
import { Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  emptyClinicalStudy,
  type ClinicalStudyQuality,
  type ClinicalStudyRecord,
} from "@/lib/domain/clinical-study-model";
import type { ClinicalEvaluationData } from "@/lib/domain/clinical-evaluation";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-muted-foreground">{children}</label>;
}

export function ClinicalStudiesPanel({
  productId,
  initial,
  canEdit,
  onSaved,
}: {
  productId: string;
  initial?: ClinicalStudyRecord[];
  canEdit: boolean;
  onSaved: (evaluation: ClinicalEvaluationData) => void;
}) {
  const { t, lang } = useI18n();
  const locale = lang === "tr" ? "tr" : "en";
  const [studies, setStudies] = useState<ClinicalStudyRecord[]>(() => initial ?? []);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateStudy(id: string, patch: Partial<ClinicalStudyRecord>) {
    setStudies((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addStudy() {
    setStudies((rows) => [...rows, emptyClinicalStudy()]);
  }

  function removeStudy(id: string) {
    setStudies((rows) => rows.filter((r) => r.id !== id));
  }

  async function prepareFindings(merge: boolean) {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/clinical-evaluation/studies/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, merge }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : t("clinical.studies.generateError"));
        return;
      }
      if (body.evaluation?.clinicalStudies) {
        setStudies(body.evaluation.clinicalStudies);
        onSaved(body.evaluation);
      }
    } catch {
      setError(t("clinical.studies.generateError"));
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/clinical-evaluation/studies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, studies }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : t("clinical.studies.saveError"));
        return;
      }
      if (body.evaluation) onSaved(body.evaluation);
    } catch {
      setError(t("clinical.studies.saveError"));
    } finally {
      setLoading(false);
    }
  }

  if (!canEdit && studies.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("clinical.studies.empty")}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("clinical.studies.hint")}</p>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="accent"
            disabled={generating || loading}
            onClick={() => prepareFindings(false)}
            className="gap-1.5"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t("clinical.studies.prepare")}
          </Button>
          {studies.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={generating || loading}
              onClick={() => prepareFindings(true)}
              className="gap-1"
            >
              {t("clinical.studies.refreshPrepared")}
            </Button>
          )}
        </div>
      )}

      {studies.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("clinical.studies.empty")}</p>
      )}

      {studies.map((s, idx) => (
        <div key={s.id} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">
              {s.registryId?.startsWith("lit-included-")
                ? t("clinical.studies.includedStudy").replace(
                    "{n}",
                    String(s.registryId.replace("lit-included-", "")),
                  )
                : `${t("clinical.studies.row")} ${idx + 1}`}
            </span>
            {canEdit && (
              <Button type="button" size="sm" variant="ghost" onClick={() => removeStudy(s.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <FieldLabel>{t("clinical.studies.source")}</FieldLabel>
              <Input
                disabled={!canEdit}
                value={s.source}
                onChange={(e) => updateStudy(s.id, { source: e.target.value })}
                placeholder={t("clinical.studies.sourcePlaceholder")}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel>{t("clinical.studies.design")}</FieldLabel>
              <Input
                disabled={!canEdit}
                value={s.design}
                onChange={(e) => updateStudy(s.id, { design: e.target.value })}
                placeholder="RCT / cohort"
              />
            </div>
            <div className="space-y-1">
              <FieldLabel>{t("clinical.studies.n")}</FieldLabel>
              <p className="text-[10px] text-muted-foreground">{t("clinical.studies.nHelp")}</p>
              <Input
                disabled={!canEdit}
                value={s.n}
                onChange={(e) => updateStudy(s.id, { n: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel>{t("clinical.studies.quality")}</FieldLabel>
              <select
                disabled={!canEdit}
                value={s.quality}
                onChange={(e) =>
                  updateStudy(s.id, { quality: e.target.value as ClinicalStudyQuality })
                }
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
              >
                <option value="HIGH">{t("clinical.studies.qualityHigh")}</option>
                <option value="MED">{t("clinical.studies.qualityMed")}</option>
                <option value="LOW">{t("clinical.studies.qualityLow")}</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <FieldLabel>{t("clinical.studies.outcomes")}</FieldLabel>
              <textarea
                disabled={!canEdit}
                value={s.outcomes}
                onChange={(e) => updateStudy(s.id, { outcomes: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                disabled={!canEdit}
                checked={s.deviceSpecific}
                onChange={(e) => updateStudy(s.id, { deviceSpecific: e.target.checked })}
              />
              {t("clinical.studies.deviceSpecific")}
            </label>
            <div className="space-y-1 sm:col-span-2">
              <FieldLabel>{t("clinical.studies.notes")}</FieldLabel>
              <Input
                disabled={!canEdit}
                value={s.notes}
                onChange={(e) => updateStudy(s.id, { notes: e.target.value })}
              />
            </div>
            {(s.cerComment || s.evidenceUrl) && (
              <div className="sm:col-span-2 space-y-2 rounded-md border border-dashed border-border bg-muted/20 p-3">
                {s.cerComment && (
                  <div className="space-y-1">
                    <FieldLabel>{t("clinical.studies.cerComment")}</FieldLabel>
                    <p className="text-xs text-muted-foreground">{s.cerComment}</p>
                  </div>
                )}
                {s.evidenceUrl && (
                  <div className="space-y-1">
                    <FieldLabel>{t("clinical.studies.evidenceUrl")}</FieldLabel>
                    <a
                      href={s.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary underline break-all"
                    >
                      {s.evidenceUrl}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={addStudy} className="gap-1">
            <Plus className="h-4 w-4" />
            {t("clinical.studies.add")}
          </Button>
          <Button size="sm" disabled={loading} onClick={save} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("clinical.studies.save")}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
