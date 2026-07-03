"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { AddRiskModal } from "@/components/risk/add-risk-modal";
import { displayRiskNo, resolveMitigations, riskScore, riskScoreCellClass } from "@/lib/domain/risk-template";
import type { RiskItem } from "@/lib/domain/types";

function ScoreCells({ severity, probability }: { severity: number; probability: number }) {
  const score = riskScore(severity, probability);
  return (
    <>
      <td className="px-2 py-3 text-center text-sm font-medium">{severity}</td>
      <td className="px-2 py-3 text-center text-sm font-medium">{probability}</td>
      <td
        className={`px-2 py-3 text-center text-sm font-semibold ${riskScoreCellClass(score)}`}
      >
        {score}
      </td>
    </>
  );
}

function RiskBlock({
  r,
  allItems,
  displaySeq,
  canEdit,
  onEdit,
  onDelete,
  deleting,
}: {
  r: RiskItem;
  allItems: RiskItem[];
  displaySeq: number;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const { t } = useI18n();
  const mitigations = resolveMitigations(r);
  const riskNo = displayRiskNo(r, allItems);
  const situation = r.hazardousSituation ?? r.hazard;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-cyan-600/90 text-left text-xs uppercase tracking-wide text-white">
            <th className="w-12 px-2 py-2 font-medium">{t("risk.tpl.col.seq")}</th>
            <th className="w-20 px-2 py-2 font-medium">{t("risk.tpl.col.riskNo")}</th>
            <th className="min-w-[200px] px-2 py-2 font-medium">{t("risk.tpl.col.situation")}</th>
            <th className="w-12 px-2 py-2 text-center font-medium">{t("risk.tpl.col.severity")}</th>
            <th className="w-12 px-2 py-2 text-center font-medium">{t("risk.tpl.col.probability")}</th>
            <th className="w-14 px-2 py-2 text-center font-medium">{t("risk.tpl.col.score")}</th>
            <th className="min-w-[140px] px-2 py-2 font-medium">{t("risk.tpl.col.harmSituation")}</th>
            <th className="min-w-[140px] px-2 py-2 font-medium">{t("risk.tpl.col.source")}</th>
            {canEdit && <th className="w-20 px-2 py-2" />}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border align-top bg-card">
            <td className="px-2 py-3 text-center font-medium">{String(displaySeq).padStart(2, "0")}</td>
            <td className="px-2 py-3 font-semibold">{riskNo}</td>
            <td className="px-2 py-3">{situation}</td>
            <ScoreCells severity={r.initialSeverity} probability={r.initialProbability} />
            <td className="px-2 py-3 text-muted-foreground">{r.harm ?? "—"}</td>
            <td className="px-2 py-3 text-muted-foreground">
              {r.tableERef ? (
                <span>
                  {r.riskSource ?? "—"}
                  <span className="block text-xs text-cyan-700 dark:text-cyan-400">{r.tableERef}</span>
                </span>
              ) : (
                r.riskSource ?? "—"
              )}
            </td>
            {canEdit && (
              <td className="px-2 py-3">
                <div className="flex gap-0.5">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} disabled={deleting}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={onDelete}
                    disabled={deleting}
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </td>
            )}
          </tr>
        </tbody>
      </table>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-cyan-600/75 text-left text-xs uppercase tracking-wide text-white">
            <th className="w-28 px-2 py-2 font-medium">{t("risk.tpl.col.category")}</th>
            <th className="px-2 py-2 font-medium">{t("risk.tpl.col.actions")}</th>
            <th className="w-12 px-2 py-2 text-center font-medium">{t("risk.tpl.col.severity")}</th>
            <th className="w-12 px-2 py-2 text-center font-medium">{t("risk.tpl.col.probability")}</th>
            <th className="w-14 px-2 py-2 text-center font-medium">{t("risk.tpl.col.score")}</th>
            <th className="min-w-[200px] px-2 py-2 font-medium">{t("risk.tpl.col.residualAssessment")}</th>
          </tr>
        </thead>
        <tbody>
          {mitigations.map((m, idx) => (
            <tr key={m.category} className="border-b border-border align-top last:border-0">
              <td className="px-2 py-3 font-medium">{t(`risk.tpl.category.${m.category}`)}</td>
              <td className="px-2 py-3 whitespace-pre-wrap text-muted-foreground">{m.actions || "—"}</td>
              <ScoreCells severity={m.residualSeverity} probability={m.residualProbability} />
              {idx === 0 && (
                <td className="px-2 py-3 whitespace-pre-wrap text-muted-foreground" rowSpan={mitigations.length}>
                  {r.residualAssessment ?? r.benefitRiskJustification ?? "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {r.benefitRiskJustification && (
        <div className="border-t border-border bg-cyan-600/10 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800 dark:text-cyan-200">
            {t("risk.tpl.benefitRisk")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{r.benefitRiskJustification}</p>
        </div>
      )}
    </div>
  );
}

export function RiskTable({
  risks,
  productId,
  canEdit = false,
}: {
  risks: RiskItem[];
  productId?: string;
  canEdit?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [editItem, setEditItem] = useState<RiskItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteRisk(r: RiskItem) {
    if (!productId) return;
    const label = r.hazardousSituation ?? r.hazard;
    if (!confirm(t("risk.delete.confirm").replace("{hazard}", label.slice(0, 120)))) return;
    setDeletingId(r.id);
    try {
      const res = await fetch(`/api/products/${productId}/risk/${r.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(typeof data.error === "string" ? data.error : t("evidence.networkError"));
        return;
      }
      router.refresh();
    } catch {
      alert(t("evidence.networkError"));
    } finally {
      setDeletingId(null);
    }
  }

  if (risks.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        {t("risk.tpl.empty")}
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {risks.map((r, index) => (
          <RiskBlock
            key={r.id}
            r={r}
            allItems={risks}
            displaySeq={index + 1}
            canEdit={canEdit && Boolean(productId)}
            onEdit={() => setEditItem(r)}
            onDelete={() => deleteRisk(r)}
            deleting={deletingId === r.id}
          />
        ))}
      </div>

      {editItem && productId && (
        <AddRiskModal productId={productId} item={editItem} onClose={() => setEditItem(null)} />
      )}
    </>
  );
}
