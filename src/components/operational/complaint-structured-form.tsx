"use client";

import type {
  ComplaintCh01FormData,
  ComplaintCh02FormData,
  EffectivenessVerified,
} from "@/lib/operational/complaint-form-model";
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

function YesNoNoteRow({
  label,
  value,
  note,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean | null;
  note: string;
  onChange: (value: boolean | null, note: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(9rem,32%)_1fr] gap-2 px-3 py-2.5 text-sm bg-background/80">
      <div className="font-medium text-foreground/90">{label}</div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              disabled={disabled}
              checked={value === true}
              onChange={() => onChange(true, note)}
            />
            {t("operational.yes")}
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              disabled={disabled}
              checked={value === false}
              onChange={() => onChange(false, note)}
            />
            {t("operational.no")}
          </label>
          <button
            type="button"
            disabled={disabled}
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onChange(null, note)}
          >
            {t("operational.clear")}
          </button>
        </div>
        <FieldInput
          value={note}
          disabled={disabled}
          onChange={(v) => onChange(value, v)}
          placeholder={t("operational.complaint.note")}
        />
      </div>
    </div>
  );
}

function StaticInfoSection({
  formCode,
  procedureCode,
  children,
}: {
  formCode: string;
  procedureCode: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <FormSection title={t("operational.complaint.sectionInfo")}>
      <FormRow label={t("operational.complaint.formCode")}>
        <span className="text-sm text-foreground/80">{formCode}</span>
      </FormRow>
      <FormRow label={t("operational.complaint.revision")}>
        <span className="text-sm text-foreground/80">00</span>
      </FormRow>
      <FormRow label={t("operational.complaint.relatedProcedure")}>
        <span className="text-sm text-foreground/80">{procedureCode}</span>
      </FormRow>
      {children}
    </FormSection>
  );
}

export function ComplaintCh01StructuredForm({
  data,
  onChange,
  disabled,
  procedureCode = "SOP-CH",
}: {
  data: ComplaintCh01FormData;
  onChange: (data: ComplaintCh01FormData) => void;
  disabled?: boolean;
  procedureCode?: string;
}) {
  const { t } = useI18n();

  function patch(partial: Partial<ComplaintCh01FormData>) {
    onChange({ ...data, ...partial });
  }

  const sourceOptions = t("operational.complaint.sources").split("|").map((s) => s.trim());
  const sourceKeys: (keyof ComplaintCh01FormData)[] = [
    "sourceCustomer",
    "sourceDistributor",
    "sourceHealthcare",
    "sourcePms",
    "sourceInternal",
    "sourceOther",
  ];

  return (
    <div className="space-y-4 text-sm">
      <StaticInfoSection formCode="FORM-CH-01" procedureCode={procedureCode}>
        <FormRow label={t("operational.complaint.formDate")}>
          <FieldInput value={data.formDate} disabled={disabled} onChange={(v) => patch({ formDate: v })} />
        </FormRow>
        <FormRow label={t("operational.complaint.referenceNo")}>
          <FieldInput value={data.referenceNo} disabled={disabled} onChange={(v) => patch({ referenceNo: v })} />
        </FormRow>
      </StaticInfoSection>

      <FormSection title={t("operational.complaint.sectionComplaintInfo")}>
        <FormRow label={t("operational.complaint.complaintNo")}>
          <FieldInput value={data.complaintNo} disabled={disabled} onChange={(v) => patch({ complaintNo: v })} />
        </FormRow>
        <FormRow label={t("operational.complaint.receivedDate")}>
          <FieldInput value={data.receivedDate} disabled={disabled} onChange={(v) => patch({ receivedDate: v })} />
        </FormRow>
        <FormRow label={t("operational.complaint.source")}>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {sourceOptions.map((label, i) => (
              <label key={label} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={Boolean(data[sourceKeys[i]])}
                  onChange={(e) => patch({ [sourceKeys[i]]: e.target.checked } as Partial<ComplaintCh01FormData>)}
                />
                {label}
              </label>
            ))}
          </div>
        </FormRow>
        <FormRow label={t("operational.complaint.customerInstitution")}>
          <FieldInput
            value={data.customerInstitution}
            disabled={disabled}
            onChange={(v) => patch({ customerInstitution: v })}
          />
        </FormRow>
        <FormRow label={t("operational.complaint.contact")}>
          <FieldInput value={data.contact} disabled={disabled} onChange={(v) => patch({ contact: v })} />
        </FormRow>
        <FormRow label={t("operational.complaint.productModel")}>
          <FieldInput value={data.productModel} disabled={disabled} onChange={(v) => patch({ productModel: v })} />
        </FormRow>
        <FormRow label={t("operational.complaint.lotSerial")}>
          <FieldInput value={data.lotSerial} disabled={disabled} onChange={(v) => patch({ lotSerial: v })} />
        </FormRow>
        <FormRow label={t("operational.complaint.udiDi")}>
          <FieldInput value={data.udiDi} disabled={disabled} onChange={(v) => patch({ udiDi: v })} />
        </FormRow>
        <FormRow label={t("operational.complaint.description")}>
          <FieldInput
            multiline
            value={data.description}
            disabled={disabled}
            onChange={(v) => patch({ description: v })}
          />
        </FormRow>
      </FormSection>

      <FormSection title={t("operational.complaint.sectionAssessment")}>
        <YesNoNoteRow
          label={t("operational.complaint.safetyRisk")}
          value={data.safetyRisk}
          note={data.safetyRiskNote}
          disabled={disabled}
          onChange={(value, note) => patch({ safetyRisk: value, safetyRiskNote: note })}
        />
        <YesNoNoteRow
          label={t("operational.complaint.vigilanceNeeded")}
          value={data.vigilanceNeeded}
          note={data.vigilanceNote}
          disabled={disabled}
          onChange={(value, note) => patch({ vigilanceNeeded: value, vigilanceNote: note })}
        />
        <YesNoNoteRow
          label={t("operational.complaint.fscaNeeded")}
          value={data.fscaNeeded}
          note={data.fscaNote}
          disabled={disabled}
          onChange={(value, note) => patch({ fscaNeeded: value, fscaNote: note })}
        />
        <YesNoNoteRow
          label={t("operational.complaint.capaNeeded")}
          value={data.capaNeeded}
          note={data.capaNeededNote}
          disabled={disabled}
          onChange={(value, note) => patch({ capaNeeded: value, capaNeededNote: note })}
        />
        <FormRow label={t("operational.complaint.assessedBy")}>
          <FieldInput value={data.assessedBy} disabled={disabled} onChange={(v) => patch({ assessedBy: v })} />
        </FormRow>
        <FormRow label={t("operational.complaint.assessedDate")}>
          <FieldInput value={data.assessedDate} disabled={disabled} onChange={(v) => patch({ assessedDate: v })} />
        </FormRow>
      </FormSection>

      <p className="text-xs text-muted-foreground px-1">{t("operational.complaint.capaHint")}</p>

      <FormSection title={t("operational.complaint.sectionClosure")}>
        <FormRow label={t("operational.complaint.customerResponseDate")}>
          <FieldInput
            value={data.customerResponseDate}
            disabled={disabled}
            onChange={(v) => patch({ customerResponseDate: v })}
          />
        </FormRow>
        <FormRow label={t("operational.complaint.status")}>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                disabled={disabled}
                checked={data.statusOpen}
                onChange={(e) => patch({ statusOpen: e.target.checked })}
              />
              {t("operational.complaint.statusOpen")}
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                disabled={disabled}
                checked={data.statusClosed}
                onChange={(e) => patch({ statusClosed: e.target.checked })}
              />
              {t("operational.complaint.statusClosed")}
            </label>
          </div>
        </FormRow>
      </FormSection>
    </div>
  );
}

export function ComplaintCh02StructuredForm({
  data,
  onChange,
  disabled,
  procedureCode = "SOP-CH",
}: {
  data: ComplaintCh02FormData;
  onChange: (data: ComplaintCh02FormData) => void;
  disabled?: boolean;
  procedureCode?: string;
}) {
  const { t } = useI18n();

  function patch(partial: Partial<ComplaintCh02FormData>) {
    onChange({ ...data, ...partial });
  }

  const effOptions: { value: EffectivenessVerified; label: string }[] = [
    { value: "yes", label: t("operational.yes") },
    { value: "no", label: t("operational.no") },
    { value: "pending", label: t("operational.complaint.pending") },
  ];

  return (
    <div className="space-y-4 text-sm">
      <p className="text-xs text-muted-foreground px-1">{t("operational.complaint.ch02Intro")}</p>

      <StaticInfoSection formCode="FORM-CH-02" procedureCode={procedureCode}>
        <FormRow label={t("operational.complaint.formDate")}>
          <FieldInput value={data.formDate} disabled={disabled} onChange={(v) => patch({ formDate: v })} />
        </FormRow>
        <FormRow label={t("operational.complaint.referenceNo")}>
          <FieldInput value={data.referenceNo} disabled={disabled} onChange={(v) => patch({ referenceNo: v })} />
        </FormRow>
      </StaticInfoSection>

      <FormSection title={t("operational.complaint.sectionComplaintRef")}>
        <FormRow label={t("operational.complaint.complaintNoCh01")}>
          <FieldInput value={data.complaintNo} disabled={disabled} onChange={(v) => patch({ complaintNo: v })} />
        </FormRow>
        <FormRow label={t("operational.complaint.assessmentDate")}>
          <FieldInput value={data.assessmentDate} disabled={disabled} onChange={(v) => patch({ assessmentDate: v })} />
        </FormRow>
        <FormRow label={t("operational.complaint.productLot")}>
          <FieldInput value={data.productLot} disabled={disabled} onChange={(v) => patch({ productLot: v })} />
        </FormRow>
      </FormSection>

      <FormSection title={t("operational.complaint.sectionCapaLink")}>
        <FormRow label={t("operational.complaint.capaNo")}>
          <FieldInput value={data.capaNo} disabled={disabled} onChange={(v) => patch({ capaNo: v })} />
        </FormRow>
        <FormRow label={t("operational.complaint.capaOpenedDate")}>
          <FieldInput value={data.capaOpenedDate} disabled={disabled} onChange={(v) => patch({ capaOpenedDate: v })} />
        </FormRow>
        <FormRow label={t("operational.complaint.capaStatus")}>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                disabled={disabled}
                checked={data.capaStatusOpen}
                onChange={(e) => patch({ capaStatusOpen: e.target.checked })}
              />
              {t("operational.complaint.capaStatusOpen")}
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                disabled={disabled}
                checked={data.capaStatusClosed}
                onChange={(e) => patch({ capaStatusClosed: e.target.checked })}
              />
              {t("operational.complaint.capaStatusClosed")}
            </label>
          </div>
        </FormRow>
        <FormRow label={t("operational.complaint.capaOwner")}>
          <FieldInput value={data.capaOwner} disabled={disabled} onChange={(v) => patch({ capaOwner: v })} />
        </FormRow>
        <FormRow label={t("operational.complaint.rootCauseSummary")}>
          <FieldInput
            multiline
            value={data.rootCauseSummary}
            disabled={disabled}
            onChange={(v) => patch({ rootCauseSummary: v })}
          />
        </FormRow>
        <FormRow label={t("operational.complaint.actionSummary")}>
          <FieldInput
            multiline
            value={data.actionSummary}
            disabled={disabled}
            onChange={(v) => patch({ actionSummary: v })}
          />
        </FormRow>
        <FormRow label={t("operational.complaint.capaTargetDate")}>
          <FieldInput value={data.capaTargetDate} disabled={disabled} onChange={(v) => patch({ capaTargetDate: v })} />
        </FormRow>
        <FormRow label={t("operational.complaint.effectivenessVerified")}>
          <div className="flex flex-wrap items-center gap-4">
            {effOptions.map((opt) => (
              <label key={opt.value ?? "null"} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  disabled={disabled}
                  checked={data.effectivenessVerified === opt.value}
                  onChange={() => patch({ effectivenessVerified: opt.value })}
                />
                {opt.label}
              </label>
            ))}
            <button
              type="button"
              disabled={disabled}
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => patch({ effectivenessVerified: null })}
            >
              {t("operational.clear")}
            </button>
          </div>
        </FormRow>
      </FormSection>

      <FormSection title={t("operational.complaint.sectionClosureWithCapa")}>
        <FormRow label={t("operational.complaint.complaintStatus")}>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                disabled={disabled}
                checked={data.complaintStatusMonitoring}
                onChange={(e) => patch({ complaintStatusMonitoring: e.target.checked })}
              />
              {t("operational.complaint.statusMonitoring")}
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                disabled={disabled}
                checked={data.complaintStatusClosed}
                onChange={(e) => patch({ complaintStatusClosed: e.target.checked })}
              />
              {t("operational.complaint.statusClosedCapa")}
            </label>
          </div>
        </FormRow>
        <FormRow label={t("operational.complaint.customerNotificationDate")}>
          <FieldInput
            value={data.customerNotificationDate}
            disabled={disabled}
            onChange={(v) => patch({ customerNotificationDate: v })}
          />
        </FormRow>
      </FormSection>
    </div>
  );
}
