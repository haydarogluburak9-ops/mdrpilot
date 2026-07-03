"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useI18n } from "@/components/providers/i18n-provider";
import { riskLevelFromScore } from "@/lib/domain/constants";
import { RiskBadge } from "@/components/ui/status-badge";
import {
  RISK_MITIGATION_CATEGORIES,
  resolveMitigations,
  riskScore,
  type RiskMitigationRow,
} from "@/lib/domain/risk-template";
import type { RiskItem } from "@/lib/domain/types";

const SCORES = [1, 2, 3, 4, 5] as const;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </label>
  );
}

function ScoreSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select
        className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {SCORES.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </div>
  );
}

function initForm(item?: RiskItem) {
  if (!item) {
    const mitigations = RISK_MITIGATION_CATEGORIES.map((category) => ({
      category,
      actions: "",
      residualSeverity: 3,
      residualProbability: 1,
    }));
    return {
      sequenceNo: "",
      riskNo: "",
      hazardousSituation: "",
      harm: "",
      riskSource: "",
      initialSeverity: 3,
      initialProbability: 2,
      mitigations,
      residualAssessment: "",
      benefitRiskJustification: "",
    };
  }
  const mitigations = resolveMitigations(item);
  return {
    sequenceNo: item.sequenceNo > 0 ? String(item.sequenceNo) : "",
    riskNo: item.riskNo ?? "",
    hazardousSituation: item.hazardousSituation ?? item.hazard,
    harm: item.harm ?? "",
    riskSource: item.riskSource ?? "",
    initialSeverity: item.initialSeverity,
    initialProbability: item.initialProbability,
    mitigations,
    residualAssessment: item.residualAssessment ?? "",
    benefitRiskJustification: item.benefitRiskJustification ?? "",
  };
}

export function AddRiskModal({
  productId,
  item,
  onClose,
}: {
  productId: string;
  item?: RiskItem;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const isEdit = Boolean(item);
  const initial = initForm(item);

  const [sequenceNo, setSequenceNo] = useState(initial.sequenceNo);
  const [riskNo, setRiskNo] = useState(initial.riskNo);
  const [hazardousSituation, setHazardousSituation] = useState(initial.hazardousSituation);
  const [harm, setHarm] = useState(initial.harm);
  const [riskSource, setRiskSource] = useState(initial.riskSource);
  const [initialSeverity, setInitialSeverity] = useState(initial.initialSeverity);
  const [initialProbability, setInitialProbability] = useState(initial.initialProbability);
  const [mitigations, setMitigations] = useState<RiskMitigationRow[]>(initial.mitigations);
  const [residualAssessment, setResidualAssessment] = useState(initial.residualAssessment);
  const [benefitRiskJustification, setBenefitRiskJustification] = useState(initial.benefitRiskJustification);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialLevel = riskLevelFromScore(initialSeverity, initialProbability);
  const lastMitigation = mitigations[mitigations.length - 1];
  const residualLevel = riskLevelFromScore(
    lastMitigation?.residualSeverity ?? 1,
    lastMitigation?.residualProbability ?? 1,
  );

  function updateMitigation(
    category: RiskMitigationRow["category"],
    patch: Partial<RiskMitigationRow>,
  ) {
    setMitigations((rows) =>
      rows.map((m) => (m.category === category ? { ...m, ...patch } : m)),
    );
  }

  async function submit() {
    const situation = hazardousSituation.trim();
    if (!situation) {
      setError(t("risk.api.err.hazardRequired"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body = {
        sequenceNo: sequenceNo ? Number(sequenceNo) : undefined,
        riskNo: riskNo.trim() || undefined,
        hazard: situation.slice(0, 500),
        hazardousSituation: situation,
        harm: harm.trim() || undefined,
        riskSource: riskSource.trim() || undefined,
        initialSeverity,
        initialProbability,
        mitigations,
        residualSeverity: lastMitigation?.residualSeverity,
        residualProbability: lastMitigation?.residualProbability,
        residualAssessment: residualAssessment.trim() || undefined,
        benefitRiskJustification: benefitRiskJustification.trim() || undefined,
      };
      const url = isEdit
        ? `/api/products/${productId}/risk/${item!.id}`
        : `/api/products/${productId}/risk`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const key = data.error as string | undefined;
        setError(key?.startsWith("risk.") ? t(key) : (data.error ?? t("evidence.networkError")));
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError(t("evidence.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="my-auto flex w-full max-w-3xl max-h-[min(90dvh,calc(100dvh-1.5rem))] flex-col rounded-2xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="text-lg font-semibold">{isEdit ? t("risk.edit.title") : t("risk.add.title")}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <FieldLabel>{t("risk.tpl.col.seq")}</FieldLabel>
              <Input value={sequenceNo} onChange={(e) => setSequenceNo(e.target.value)} placeholder="01" />
            </div>
            <div>
              <FieldLabel>{t("risk.tpl.col.riskNo")}</FieldLabel>
              <Input value={riskNo} onChange={(e) => setRiskNo(e.target.value)} placeholder="EH1" />
            </div>
          </div>

          <div>
            <FieldLabel>{t("risk.tpl.col.situation")} *</FieldLabel>
            <Textarea
              value={hazardousSituation}
              onChange={(e) => setHazardousSituation(e.target.value)}
              rows={3}
              className="min-h-[72px]"
              placeholder={t("risk.add.hazardPlaceholder")}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>{t("risk.tpl.col.harmSituation")}</FieldLabel>
              <Textarea value={harm} onChange={(e) => setHarm(e.target.value)} rows={2} className="min-h-[56px]" />
            </div>
            <div>
              <FieldLabel>{t("risk.tpl.col.source")}</FieldLabel>
              <Textarea value={riskSource} onChange={(e) => setRiskSource(e.target.value)} rows={2} className="min-h-[56px]" />
            </div>
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-sm font-medium">{t("risk.tpl.initialRiskSection")}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:items-end">
              <ScoreSelect label={t("risk.tpl.col.severity")} value={initialSeverity} onChange={setInitialSeverity} />
              <ScoreSelect label={t("risk.tpl.col.probability")} value={initialProbability} onChange={setInitialProbability} />
              <div>
                <FieldLabel>{t("risk.tpl.col.score")}</FieldLabel>
                <p className="text-lg font-semibold">{riskScore(initialSeverity, initialProbability)}</p>
              </div>
              <RiskBadge level={initialLevel} />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">{t("risk.tpl.mitigationSection")}</p>
            {mitigations.map((m) => (
              <div key={m.category} className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-sm font-semibold">{t(`risk.tpl.category.${m.category}`)}</p>
                <div>
                  <FieldLabel>{t("risk.tpl.col.actions")}</FieldLabel>
                  <Textarea
                    value={m.actions}
                    onChange={(e) => updateMitigation(m.category, { actions: e.target.value })}
                    rows={3}
                    className="min-h-[72px]"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:items-end">
                  <ScoreSelect
                    label={t("risk.tpl.col.severity")}
                    value={m.residualSeverity}
                    onChange={(n) => updateMitigation(m.category, { residualSeverity: n })}
                  />
                  <ScoreSelect
                    label={t("risk.tpl.col.probability")}
                    value={m.residualProbability}
                    onChange={(n) => updateMitigation(m.category, { residualProbability: n })}
                  />
                  <div>
                    <FieldLabel>{t("risk.tpl.col.score")}</FieldLabel>
                    <p className="text-lg font-semibold">
                      {riskScore(m.residualSeverity, m.residualProbability)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("risk.col.residual")}:</span>
              <RiskBadge level={residualLevel} />
            </div>
          </div>

          <div>
            <FieldLabel>{t("risk.tpl.col.residualAssessment")}</FieldLabel>
            <Textarea
              value={residualAssessment}
              onChange={(e) => setResidualAssessment(e.target.value)}
              rows={3}
              className="min-h-[72px]"
            />
          </div>

          <div>
            <FieldLabel>{t("risk.tpl.benefitRisk")}</FieldLabel>
            <Textarea
              value={benefitRiskJustification}
              onChange={(e) => setBenefitRiskJustification(e.target.value)}
              rows={3}
              className="min-h-[72px]"
            />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-card px-4 py-3 sm:px-5 sm:py-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={loading} className="gap-1.5">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? t("risk.edit.save") : t("risk.add.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
