"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/components/providers/i18n-provider";
import type { ClinicalSectionKey } from "@/lib/domain/clinical-evaluation";
import type { DocStatus } from "@/lib/domain/types";

const SECTION_I18N: Record<ClinicalSectionKey, string> = {
  plan: "cer.s.plan",
  stateOfTheArt: "cer.s.sota",
  equivalentDevices: "cer.s.equiv",
  literatureStrategy: "cer.s.literature",
  clinicalDataSummary: "cer.s.dataSummary",
  benefitRiskConclusion: "cer.s.benefitRisk",
  pmsPmcfInputs: "cer.s.pmsInputs",
  report: "cer.s.report",
};

function formatSectionSaveError(message: string, t: (key: string) => string): string {
  if (message.startsWith("cer.")) return t(message);
  if (/at most \d+ character/i.test(message)) return t("clinical.saveTooLarge");
  return message;
}

export function ClinicalSectionPanel({
  productId,
  sectionKey,
  content,
  status,
  canEdit,
}: {
  productId: string;
  sectionKey: ClinicalSectionKey;
  content?: string;
  status: DocStatus;
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState(content ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/clinical-evaluation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [sectionKey]: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          formatSectionSaveError(
            typeof data.error === "string" ? data.error : t("clinical.saveError"),
            t,
          ),
        );
        return;
      }
      router.refresh();
    } catch {
      setError(t("clinical.saveError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t(SECTION_I18N[sectionKey])}</h3>
        <StatusBadge status={status} />
      </div>
      {canEdit ? (
        <>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
            placeholder={t("clinical.sectionPlaceholder")}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={loading} onClick={save} className="gap-1.5">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("clinical.save")}
            </Button>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {content?.trim() ? content : t("clinical.emptySection")}
        </p>
      )}
    </div>
  );
}
