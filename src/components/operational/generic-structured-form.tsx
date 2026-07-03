"use client";

import { useMemo } from "react";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  applyEditableFormRows,
  parseEditableFormRows,
  type EditableFormRow,
} from "@/lib/operational/generic-form-model";

export function GenericStructuredForm({
  formContent,
  onChange,
}: {
  formContent: string;
  onChange: (content: string) => void;
}) {
  const { t } = useI18n();

  const rows = useMemo(() => parseEditableFormRows(formContent), [formContent]);

  function updateRow(index: number, value: string) {
    const next: EditableFormRow[] = rows.map((r, i) =>
      i === index ? { ...r, value } : r,
    );
    onChange(applyEditableFormRows(formContent, next));
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("operational.generic.noEditableFields")}</p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={`${row.lineIndex}-${row.label}`} className="grid gap-1 sm:grid-cols-[minmax(140px,220px)_1fr] sm:items-center">
          <label className="text-xs font-medium text-muted-foreground">{row.label}</label>
          <input
            type="text"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={row.value.replace(/^_+$/g, "")}
            onChange={(e) => updateRow(index, e.target.value)}
            disabled={row.label.toLowerCase().includes("form kodu") || row.label.toLowerCase().includes("form code")}
          />
        </div>
      ))}
    </div>
  );
}
