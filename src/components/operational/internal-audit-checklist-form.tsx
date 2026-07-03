"use client";

import { useI18n } from "@/components/providers/i18n-provider";
import type { InternalAuditChecklistData, InternalAuditChecklistItem } from "@/lib/operational/internal-audit-checklist-model";

function CheckCell({
  checked,
  label,
  onChange,
  disabled,
}: {
  checked: boolean;
  label: string;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-1 text-xs whitespace-nowrap">
      <input
        type="checkbox"
        className="rounded border-input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function InternalAuditChecklistForm({
  data,
  onChange,
  disabled,
}: {
  data: InternalAuditChecklistData;
  onChange: (data: InternalAuditChecklistData) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();

  function patch(patch: Partial<InternalAuditChecklistData>) {
    onChange({ ...data, ...patch });
  }

  function patchItem(index: number, patch: Partial<InternalAuditChecklistItem>) {
    const items = data.items.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange({ ...data, items });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {t("operational.internalAudit.checklist.auditNo")}
          </label>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={data.auditNo}
            onChange={(e) => patch({ auditNo: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {t("operational.internalAudit.checklist.date")}
          </label>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={data.date}
            onChange={(e) => patch({ date: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {t("operational.internalAudit.checklist.auditor")}
          </label>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={data.leadAuditor}
            onChange={(e) => patch({ leadAuditor: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {t("operational.internalAudit.checklist.scope")}
          </label>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={data.scope}
            onChange={(e) => patch({ scope: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">{t("operational.internalAudit.checklist.item")}</th>
              <th className="px-2 py-2 font-medium">{t("operational.internalAudit.checklist.ok")}</th>
              <th className="px-2 py-2 font-medium">{t("operational.internalAudit.checklist.nc")}</th>
              <th className="px-2 py-2 font-medium">{t("operational.internalAudit.checklist.minor")}</th>
              <th className="px-2 py-2 font-medium">{t("operational.internalAudit.checklist.major")}</th>
              <th className="px-3 py-2 font-medium min-w-[120px]">{t("operational.internalAudit.checklist.note")}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((row, index) => (
              <tr key={`${row.item}-${index}`} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2 align-top text-xs font-medium">{row.item}</td>
                <td className="px-2 py-2 align-top">
                  <CheckCell
                    checked={row.ok}
                    label=""
                    disabled={disabled}
                    onChange={(ok) => patchItem(index, { ok, nonConforming: ok ? false : row.nonConforming })}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <CheckCell
                    checked={row.nonConforming}
                    label=""
                    disabled={disabled}
                    onChange={(nc) =>
                      patchItem(index, { nonConforming: nc, ok: nc ? false : row.ok })
                    }
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <CheckCell
                    checked={row.minor}
                    label=""
                    disabled={disabled}
                    onChange={(minor) => patchItem(index, { minor, major: minor ? false : row.major })}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <CheckCell
                    checked={row.major}
                    label=""
                    disabled={disabled}
                    onChange={(major) => patchItem(index, { major, minor: major ? false : row.minor })}
                  />
                </td>
                <td className="px-3 py-2 align-top">
                  <input
                    className="w-full min-w-[100px] rounded-md border border-input bg-background px-2 py-1 text-xs"
                    value={row.note}
                    onChange={(e) => patchItem(index, { note: e.target.value })}
                    disabled={disabled}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
