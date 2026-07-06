"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CalibrationFormData, CalibrationMeasurementPoint } from "@/lib/operational/calibration-form-model";
import { computeTotalDeviation, defaultCalibrationMeasurementPoints } from "@/lib/operational/calibration-form-model";
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
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
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

export function CalibrationStructuredForm({
  data,
  onChange,
  disabled,
}: {
  data: CalibrationFormData;
  onChange: (data: CalibrationFormData) => void;
  disabled?: boolean;
}) {
  const { t, lang } = useI18n();
  const locale = lang === "en" ? "en" : "tr";

  function patch(partial: Partial<CalibrationFormData>) {
    onChange({ ...data, ...partial });
  }

  function updatePoint(index: number, partial: Partial<CalibrationMeasurementPoint>) {
    const next = data.measurementPoints.map((p, i) => (i === index ? { ...p, ...partial } : p));
    patch({ measurementPoints: next });
  }

  function addPoint() {
    patch({ measurementPoints: [...data.measurementPoints, ...defaultCalibrationMeasurementPoints(1)] });
  }

  function removePoint(index: number) {
    if (data.measurementPoints.length <= 1) return;
    patch({ measurementPoints: data.measurementPoints.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-4">
      <FormSection title={t("operational.calibration.sectionDevice")}>
        <FormRow label={t("operational.calibration.deviceCode")}>
          <FieldInput
            value={data.deviceCode}
            disabled={disabled}
            placeholder="C-01"
            onChange={(v) => patch({ deviceCode: v })}
          />
        </FormRow>
        <FormRow label={t("operational.calibration.deviceName")}>
          <FieldInput
            value={data.deviceName}
            disabled={disabled}
            placeholder={t("operational.calibration.deviceNamePlaceholder")}
            onChange={(v) => patch({ deviceName: v })}
          />
        </FormRow>
        <FormRow label={t("operational.calibration.responsible")}>
          <FieldInput
            value={data.responsiblePerson}
            disabled={disabled}
            onChange={(v) => patch({ responsiblePerson: v })}
          />
        </FormRow>
        <FormRow label={t("operational.calibration.brandSerial")}>
          <FieldInput
            value={data.brandSerialNo}
            disabled={disabled}
            placeholder="ASIMETO 307-06-4 / 150628376"
            onChange={(v) => patch({ brandSerialNo: v })}
          />
        </FormRow>
        <FormRow label={t("operational.calibration.measurementRange")}>
          <FieldInput
            value={data.measurementRange}
            disabled={disabled}
            placeholder="0-150 µm"
            onChange={(v) => patch({ measurementRange: v })}
          />
        </FormRow>
      </FormSection>

      <FormSection title={t("operational.calibration.sectionCalibration")}>
        <FormRow label={t("operational.calibration.calDateCert")}>
          <FieldInput
            value={data.calibrationDateCertNo}
            disabled={disabled}
            placeholder="03-2025/ K695815"
            onChange={(v) => patch({ calibrationDateCertNo: v })}
          />
        </FormRow>
        <FormRow label={t("operational.calibration.nextDate")}>
          <FieldInput
            value={data.nextCalibrationDate}
            disabled={disabled}
            placeholder="03-2026"
            onChange={(v) => patch({ nextCalibrationDate: v })}
          />
        </FormRow>
        <FormRow label={t("operational.calibration.tolerance")}>
          <FieldInput
            value={data.tolerance}
            disabled={disabled}
            placeholder="±0,1mm"
            onChange={(v) => patch({ tolerance: v })}
          />
        </FormRow>
        <FormRow label={t("operational.calibration.compliance")}>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={data.compliancePass}
                disabled={disabled}
                onChange={(e) =>
                  patch({
                    compliancePass: e.target.checked,
                    complianceFail: e.target.checked ? false : data.complianceFail,
                  })
                }
              />
              {t("operational.calibration.compliant")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={data.complianceFail}
                disabled={disabled}
                onChange={(e) =>
                  patch({
                    complianceFail: e.target.checked,
                    compliancePass: e.target.checked ? false : data.compliancePass,
                  })
                }
              />
              {t("operational.calibration.nonCompliant")}
            </label>
          </div>
        </FormRow>
        <FormRow label="CAPA ref">
          <FieldInput
            value={data.capaRef}
            disabled={disabled}
            onChange={(v) => patch({ capaRef: v })}
          />
        </FormRow>
      </FormSection>

      <FormSection title={t("operational.calibration.measurements")}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium">{t("operational.calibration.pointLabel")}</th>
                <th className="px-3 py-2 font-medium">{t("operational.calibration.deviation")}</th>
                <th className="px-3 py-2 font-medium">{t("operational.calibration.uncertainty")}</th>
                <th className="px-3 py-2 font-medium">
                  {t("operational.calibration.totalDeviation")}
                  <span className="ml-1 font-normal text-muted-foreground text-xs">
                    ({t("operational.calibration.totalDeviationAuto")})
                  </span>
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {data.measurementPoints.map((p, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="px-2 py-1.5">
                    <FieldInput
                      value={p.label}
                      disabled={disabled}
                      placeholder={t("operational.calibration.pointPlaceholder")}
                      onChange={(v) => updatePoint(i, { label: v })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <FieldInput
                      value={p.deviation}
                      disabled={disabled}
                      placeholder={t("operational.calibration.deviationPlaceholder")}
                      onChange={(v) => updatePoint(i, { deviation: v })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <FieldInput
                      value={p.uncertainty}
                      disabled={disabled}
                      placeholder={t("operational.calibration.uncertaintyPlaceholder")}
                      onChange={(v) => updatePoint(i, { uncertainty: v })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="rounded-md border border-dashed border-border bg-muted/30 px-2 py-1.5 text-sm text-foreground/90 min-h-[34px]">
                      {computeTotalDeviation(p.deviation, p.uncertainty, locale) || "—"}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    {!disabled && data.measurementPoints.length > 1 && (
                      <Button type="button" size="icon" variant="ghost" onClick={() => removePoint(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!disabled && (
          <div className="px-3 py-2">
            <Button type="button" size="sm" variant="outline" onClick={addPoint}>
              <Plus className="h-4 w-4" />
              {t("operational.calibration.addMeasurement")}
            </Button>
          </div>
        )}
      </FormSection>
    </div>
  );
}
