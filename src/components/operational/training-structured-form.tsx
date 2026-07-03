"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TrainingFormData, TrainingParticipant } from "@/lib/operational/training-form-model";
import { defaultTrainingParticipants } from "@/lib/operational/training-form-model";
import { useI18n } from "@/components/providers/i18n-provider";

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-primary border-b border-primary/25 pb-1">{title}</h4>
      <div className="rounded-md border border-border overflow-hidden divide-y divide-border bg-card">
        {children}
      </div>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(9rem,32%)_1fr] gap-2 px-3 py-2.5 text-sm bg-background/80">
      <div className="font-medium text-foreground/90">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function FieldInput({
  value,
  onChange,
  disabled,
  multiline,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  multiline?: boolean;
  placeholder?: string;
}) {
  if (multiline) {
    return (
      <textarea
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
    />
  );
}

export function TrainingStructuredForm({
  data,
  onChange,
  disabled,
}: {
  data: TrainingFormData;
  onChange: (data: TrainingFormData) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();

  function patch(partial: Partial<TrainingFormData>) {
    onChange({ ...data, ...partial });
  }

  function patchParticipant(index: number, partial: Partial<TrainingParticipant>) {
    const next = data.participants.map((p, i) => (i === index ? { ...p, ...partial } : p));
    patch({ participants: next });
  }

  function addParticipant() {
    const nextNo = data.participants.length + 1;
    patch({
      participants: [...data.participants, { no: String(nextNo), name: "", department: "", attended: false, assessmentResult: "", signature: "" }],
    });
  }

  function removeParticipant(index: number) {
    if (data.participants.length <= 1) {
      patch({ participants: defaultTrainingParticipants(1) });
      return;
    }
    const next = data.participants.filter((_, i) => i !== index).map((p, i) => ({ ...p, no: String(i + 1) }));
    patch({ participants: next });
  }

  return (
    <div className="space-y-4 text-sm">
      <FormSection title={t("operational.training.sectionInfo")}>
        <FormRow label={t("operational.training.recordNo")}>
          <FieldInput value={data.recordNo} disabled={disabled} onChange={(v) => patch({ recordNo: v })} />
        </FormRow>
        <FormRow label={t("operational.training.trainingDate")}>
          <FieldInput value={data.trainingDate} disabled={disabled} onChange={(v) => patch({ trainingDate: v })} />
        </FormRow>
        <FormRow label={t("operational.training.topic")}>
          <FieldInput value={data.topic} disabled={disabled} multiline onChange={(v) => patch({ topic: v })} />
        </FormRow>
        <FormRow label={t("operational.training.duration")}>
          <FieldInput value={data.duration} disabled={disabled} onChange={(v) => patch({ duration: v })} />
        </FormRow>
        <FormRow label={t("operational.training.location")}>
          <FieldInput value={data.location} disabled={disabled} onChange={(v) => patch({ location: v })} />
        </FormRow>
        <FormRow label={t("operational.training.trainer")}>
          <FieldInput value={data.trainer} disabled={disabled} onChange={(v) => patch({ trainer: v })} />
        </FormRow>
        <FormRow label={t("operational.training.trainingMethod")}>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" disabled={disabled} checked={data.methodFaceToFace} onChange={(e) => patch({ methodFaceToFace: e.target.checked })} />
                {t("operational.training.methodFaceToFace")}
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" disabled={disabled} checked={data.methodOnline} onChange={(e) => patch({ methodOnline: e.target.checked })} />
                {t("operational.training.methodOnline")}
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" disabled={disabled} checked={data.methodOjt} onChange={(e) => patch({ methodOjt: e.target.checked })} />
                {t("operational.training.methodOjt")}
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" disabled={disabled} checked={data.methodOther} onChange={(e) => patch({ methodOther: e.target.checked })} />
                {t("operational.training.methodOther")}
              </label>
            </div>
            {data.methodOther && (
              <FieldInput
                value={data.methodOtherNote}
                disabled={disabled}
                placeholder={t("operational.training.methodOtherPlaceholder")}
                onChange={(v) => patch({ methodOtherNote: v })}
              />
            )}
          </div>
        </FormRow>
        <FormRow label={t("operational.training.relatedDocuments")}>
          <FieldInput value={data.relatedDocuments} disabled={disabled} onChange={(v) => patch({ relatedDocuments: v })} />
        </FormRow>
      </FormSection>

      <FormSection title={t("operational.training.sectionParticipants")}>
        <div className="overflow-x-auto bg-background/80">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-2 py-2 font-medium">#</th>
                <th className="px-2 py-2 font-medium">{t("operational.training.participantName")}</th>
                <th className="px-2 py-2 font-medium">{t("operational.training.department")}</th>
                <th className="px-2 py-2 font-medium">{t("operational.training.attended")}</th>
                <th className="px-2 py-2 font-medium">{t("operational.training.assessmentResult")}</th>
                <th className="px-2 py-2 font-medium">{t("operational.training.signature")}</th>
                {!disabled && <th className="px-2 py-2 w-8" />}
              </tr>
            </thead>
            <tbody>
              {data.participants.map((p, index) => (
                <tr key={`${p.no}-${index}`} className="border-b border-border/60">
                  <td className="px-2 py-1.5 text-muted-foreground">{index + 1}</td>
                  <td className="px-2 py-1.5">
                    <FieldInput value={p.name} disabled={disabled} onChange={(v) => patchParticipant(index, { name: v })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <FieldInput value={p.department} disabled={disabled} onChange={(v) => patchParticipant(index, { department: v })} />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={p.attended}
                      onChange={(e) => patchParticipant(index, { attended: e.target.checked })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <FieldInput
                      value={p.assessmentResult}
                      disabled={disabled}
                      placeholder={t("operational.training.assessmentPlaceholder")}
                      onChange={(v) => patchParticipant(index, { assessmentResult: v })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <FieldInput value={p.signature} disabled={disabled} onChange={(v) => patchParticipant(index, { signature: v })} />
                  </td>
                  {!disabled && (
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeParticipant(index)}
                        aria-label={t("operational.training.removeParticipant")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!disabled && (
          <div className="px-3 py-2 bg-background/80">
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={addParticipant}>
              <Plus className="h-3.5 w-3.5" />
              {t("operational.training.addParticipant")}
            </Button>
          </div>
        )}
      </FormSection>

      <FormSection title={t("operational.training.sectionEvaluation")}>
        <FormRow label={t("operational.training.evaluationMethod")}>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" disabled={disabled} checked={data.evalQuiz} onChange={(e) => patch({ evalQuiz: e.target.checked })} />
                {t("operational.training.evalQuiz")}
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" disabled={disabled} checked={data.evalObservation} onChange={(e) => patch({ evalObservation: e.target.checked })} />
                {t("operational.training.evalObservation")}
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" disabled={disabled} checked={data.evalOral} onChange={(e) => patch({ evalOral: e.target.checked })} />
                {t("operational.training.evalOral")}
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" disabled={disabled} checked={data.evalPractical} onChange={(e) => patch({ evalPractical: e.target.checked })} />
                {t("operational.training.evalPractical")}
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" disabled={disabled} checked={data.evalOther} onChange={(e) => patch({ evalOther: e.target.checked })} />
                {t("operational.training.evalOther")}
              </label>
            </div>
            {data.evalOther && (
              <FieldInput
                value={data.evalOtherNote}
                disabled={disabled}
                placeholder={t("operational.training.methodOtherPlaceholder")}
                onChange={(v) => patch({ evalOtherNote: v })}
              />
            )}
          </div>
        </FormRow>
        <FormRow label={t("operational.training.evaluationSummary")}>
          <FieldInput value={data.evaluationSummary} disabled={disabled} multiline onChange={(v) => patch({ evaluationSummary: v })} />
        </FormRow>
        <FormRow label={t("operational.training.trainingEffective")}>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  disabled={disabled}
                  checked={data.trainingEffective === true}
                  onChange={() => patch({ trainingEffective: true })}
                />
                {t("operational.yes")}
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  disabled={disabled}
                  checked={data.trainingEffective === false}
                  onChange={() => patch({ trainingEffective: false })}
                />
                {t("operational.no")}
              </label>
              <button
                type="button"
                disabled={disabled}
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => patch({ trainingEffective: null })}
              >
                {t("operational.clear")}
              </button>
            </div>
            <FieldInput
              value={data.effectivenessNote}
              disabled={disabled}
              placeholder={t("operational.training.effectivenessNotePlaceholder")}
              onChange={(v) => patch({ effectivenessNote: v })}
            />
          </div>
        </FormRow>
        <FormRow label={t("operational.training.approvedBy")}>
          <FieldInput value={data.approvedBy} disabled={disabled} onChange={(v) => patch({ approvedBy: v })} />
        </FormRow>
        <FormRow label={t("operational.training.approvalDate")}>
          <FieldInput value={data.approvalDate} disabled={disabled} onChange={(v) => patch({ approvalDate: v })} />
        </FormRow>
      </FormSection>
    </div>
  );
}
