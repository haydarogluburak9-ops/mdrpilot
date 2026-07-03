"use client";

import type { CapaFormData } from "@/lib/operational/capa-form-model";
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
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  multiline?: boolean;
}) {
  if (multiline) {
    return (
      <textarea
        value={value}
        disabled={disabled}
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
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
    />
  );
}

function YesNoRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(9rem,32%)_1fr] gap-2 px-3 py-2.5 text-sm bg-background/80">
      <div className="font-medium text-foreground/90">{label}</div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" disabled={disabled} checked={value === true} onChange={() => onChange(true)} />
          {t("operational.yes")}
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" disabled={disabled} checked={value === false} onChange={() => onChange(false)} />
          {t("operational.no")}
        </label>
        <button
          type="button"
          disabled={disabled}
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onChange(null)}
        >
          {t("operational.clear")}
        </button>
      </div>
    </div>
  );
}

export function CapaStructuredForm({
  data,
  onChange,
  disabled,
  procedureCode = "SOP-CAPA",
}: {
  data: CapaFormData;
  onChange: (data: CapaFormData) => void;
  disabled?: boolean;
  procedureCode?: string;
}) {
  const { t } = useI18n();

  function patch(partial: Partial<CapaFormData>) {
    onChange({ ...data, ...partial });
  }

  const sourceOptions = t("operational.capa.sources").split("|").map((s) => s.trim());
  const sourceKeys: (keyof CapaFormData)[] = [
    "sourceInternalAudit",
    "sourceComplaint",
    "sourceProduction",
    "sourceSupplier",
    "sourcePms",
    "sourceOther",
  ];

  return (
    <div className="space-y-4 text-sm">
      <FormSection title={t("operational.capa.sectionInfo")}>
        <FormRow label={t("operational.capa.formCode")}>
          <span className="text-sm text-foreground/80">FORM-CAPA-01</span>
        </FormRow>
        <FormRow label={t("operational.capa.revision")}>
          <span className="text-sm text-foreground/80">00</span>
        </FormRow>
        <FormRow label={t("operational.capa.relatedProcedure")}>
          <span className="text-sm text-foreground/80">{procedureCode}</span>
        </FormRow>
        <FormRow label={t("operational.capa.formDate")}>
          <FieldInput value={data.formDate} disabled={disabled} onChange={(v) => patch({ formDate: v })} />
        </FormRow>
        <FormRow label={t("operational.capa.referenceNo")}>
          <FieldInput value={data.referenceNo} disabled={disabled} onChange={(v) => patch({ referenceNo: v })} />
        </FormRow>
      </FormSection>

      <FormSection title={t("operational.capa.sectionEvent")}>
        <FormRow label={t("operational.capa.capaNo")}>
          <FieldInput value={data.capaNo} disabled={disabled} onChange={(v) => patch({ capaNo: v })} />
        </FormRow>
        <FormRow label={t("operational.capa.source")}>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {sourceOptions.map((label, i) => (
              <label key={label} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={Boolean(data[sourceKeys[i]])}
                  onChange={(e) => patch({ [sourceKeys[i]]: e.target.checked } as Partial<CapaFormData>)}
                />
                {label}
              </label>
            ))}
          </div>
        </FormRow>
        <FormRow label={t("operational.capa.sourceRef")}>
          <FieldInput value={data.sourceRef} disabled={disabled} onChange={(v) => patch({ sourceRef: v })} />
        </FormRow>
        <FormRow label={t("operational.capa.eventDate")}>
          <FieldInput value={data.eventDate} disabled={disabled} onChange={(v) => patch({ eventDate: v })} />
        </FormRow>
        <FormRow label={t("operational.capa.description")}>
          <FieldInput
            multiline
            value={data.description}
            disabled={disabled}
            onChange={(v) => patch({ description: v })}
          />
        </FormRow>
      </FormSection>

      <FormSection title={t("operational.capa.sectionAction")}>
        <FormRow label={t("operational.capa.rootCause")}>
          <FieldInput multiline value={data.rootCause} disabled={disabled} onChange={(v) => patch({ rootCause: v })} />
        </FormRow>
        <FormRow label={t("operational.capa.correctiveAction")}>
          <FieldInput
            multiline
            value={data.correctiveAction}
            disabled={disabled}
            onChange={(v) => patch({ correctiveAction: v })}
          />
        </FormRow>
        <FormRow label={t("operational.capa.preventiveAction")}>
          <FieldInput
            multiline
            value={data.preventiveAction}
            disabled={disabled}
            onChange={(v) => patch({ preventiveAction: v })}
          />
        </FormRow>
        <FormRow label={t("operational.capa.owner")}>
          <FieldInput value={data.owner} disabled={disabled} onChange={(v) => patch({ owner: v })} />
        </FormRow>
        <FormRow label={t("operational.capa.targetDate")}>
          <FieldInput value={data.targetDate} disabled={disabled} onChange={(v) => patch({ targetDate: v })} />
        </FormRow>
      </FormSection>

      <FormSection title={t("operational.capa.sectionEffectiveness")}>
        <YesNoRow
          label={t("operational.capa.effActionCompleted")}
          value={data.effActionCompleted}
          disabled={disabled}
          onChange={(v) => patch({ effActionCompleted: v })}
        />
        <YesNoRow
          label={t("operational.capa.effNoRecurrence")}
          value={data.effNoRecurrence}
          disabled={disabled}
          onChange={(v) => patch({ effNoRecurrence: v })}
        />
        <YesNoRow
          label={t("operational.capa.effRecordsUpdated")}
          value={data.effRecordsUpdated}
          disabled={disabled}
          onChange={(v) => patch({ effRecordsUpdated: v })}
        />
        <FormRow label={t("operational.capa.closureApproval")}>
          <FieldInput
            value={data.closureApproval}
            disabled={disabled}
            onChange={(v) => patch({ closureApproval: v })}
          />
        </FormRow>
        <FormRow label={t("operational.capa.closureDate")}>
          <FieldInput value={data.closureDate} disabled={disabled} onChange={(v) => patch({ closureDate: v })} />
        </FormRow>
      </FormSection>
    </div>
  );
}
