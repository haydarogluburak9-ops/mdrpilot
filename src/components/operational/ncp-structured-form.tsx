"use client";

import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { NcpFormData } from "@/lib/operational/ncp-form-model";
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

export function NcpStructuredForm({
  data,
  onChange,
  disabled,
  onCreateCapa,
}: {
  data: NcpFormData;
  onChange: (data: NcpFormData) => void;
  disabled?: boolean;
  onCreateCapa?: () => Promise<{ capaRef: string; capaLinkedId: string } | null>;
}) {
  const { t } = useI18n();
  const [creatingCapa, setCreatingCapa] = useState(false);

  function patch(partial: Partial<NcpFormData>) {
    onChange({ ...data, ...partial });
  }

  async function handleCreateCapa() {
    if (!onCreateCapa || disabled) return;
    setCreatingCapa(true);
    try {
      const result = await onCreateCapa();
      if (result) {
        patch({
          capaNeeded: true,
          capaRef: result.capaRef,
          capaLinkedId: result.capaLinkedId,
        });
      }
    } finally {
      setCreatingCapa(false);
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <FormSection title={t("operational.ncp.sectionNc")}>
        <FormRow label={t("operational.ncp.recordNo")}>
          <FieldInput value={data.recordNo} disabled={disabled} onChange={(v) => patch({ recordNo: v })} />
        </FormRow>
        <FormRow label={t("operational.ncp.productLot")}>
          <FieldInput value={data.productLot} disabled={disabled} onChange={(v) => patch({ productLot: v })} />
        </FormRow>
        <FormRow label={t("operational.ncp.quantity")}>
          <FieldInput value={data.quantity} disabled={disabled} onChange={(v) => patch({ quantity: v })} />
        </FormRow>
        <FormRow label={t("operational.ncp.ncDescription")}>
          <FieldInput
            value={data.ncDescription}
            disabled={disabled}
            multiline
            onChange={(v) => patch({ ncDescription: v })}
          />
        </FormRow>
        <FormRow label={t("operational.ncp.segregation")}>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  disabled={disabled}
                  checked={data.segregationDone === true}
                  onChange={() =>
                    patch({
                      segregationDone: true,
                      segregationNote: data.segregationNote,
                    })
                  }
                />
                {t("operational.ncp.segregationDone")}
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  disabled={disabled}
                  checked={data.segregationDone === false}
                  onChange={() =>
                    patch({
                      segregationDone: false,
                      segregationNote: "",
                    })
                  }
                />
                {t("operational.ncp.segregationNotDone")}
              </label>
              <button
                type="button"
                disabled={disabled}
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => patch({ segregationDone: null, segregationNote: "" })}
              >
                {t("operational.clear")}
              </button>
            </div>
            {data.segregationDone === true && (
              <FieldInput
                value={data.segregationNote}
                disabled={disabled}
                placeholder={t("operational.ncp.segregationNotePlaceholder")}
                onChange={(v) => patch({ segregationNote: v })}
              />
            )}
          </div>
        </FormRow>
        <FormRow label={t("operational.ncp.decision")}>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                disabled={disabled}
                checked={data.decisionRepair}
                onChange={(e) => patch({ decisionRepair: e.target.checked })}
              />
              {t("operational.ncp.decisionRepair")}
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                disabled={disabled}
                checked={data.decisionScrap}
                onChange={(e) => patch({ decisionScrap: e.target.checked })}
              />
              {t("operational.ncp.decisionScrap")}
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                disabled={disabled}
                checked={data.decisionReturn}
                onChange={(e) => patch({ decisionReturn: e.target.checked })}
              />
              {t("operational.ncp.decisionReturn")}
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                disabled={disabled}
                checked={data.decisionRework}
                onChange={(e) => patch({ decisionRework: e.target.checked })}
              />
              {t("operational.ncp.decisionRework")}
            </label>
          </div>
        </FormRow>
      </FormSection>

      <FormSection title={t("operational.ncp.sectionCapa")}>
        <YesNoNoteRow
          label={t("operational.complaint.capaNeeded")}
          value={data.capaNeeded}
          note={data.capaNeededNote}
          disabled={disabled}
          onChange={(value, note) =>
            patch({
              capaNeeded: value,
              capaNeededNote: note,
              capaRef: value === false ? "" : data.capaRef,
              capaLinkedId: value === false ? "" : data.capaLinkedId,
            })
          }
        />
        {data.capaNeeded === true && (
          <>
            <FormRow label={t("operational.ncp.capaRef")}>
              <div className="space-y-2">
                <FieldInput
                  value={data.capaRef}
                  disabled={disabled}
                  onChange={(v) => patch({ capaRef: v })}
                  placeholder={t("operational.ncp.capaRefPlaceholder")}
                />
                {data.capaLinkedId && (
                  <Link
                    href={`/operational/capa`}
                    className="text-xs text-primary hover:underline"
                  >
                    {t("operational.ncp.openCapa")} →
                  </Link>
                )}
              </div>
            </FormRow>
            {onCreateCapa && !disabled && (
              <div className="px-3 py-2.5 bg-background/80">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={creatingCapa}
                  onClick={handleCreateCapa}
                >
                  {creatingCapa ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  {t("operational.ncp.createCapa")}
                </Button>
              </div>
            )}
          </>
        )}
        {data.capaNeeded === false && (
          <div className="px-3 py-2.5 text-xs text-muted-foreground bg-background/80">
            {t("operational.ncp.capaNotRequired")}
          </div>
        )}
      </FormSection>
    </div>
  );
}
