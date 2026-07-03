"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  emptyTableERows,
  parseTableERowsJson,
  tableEHasEvaluations,
  type RiskPlanTableERow,
} from "@/lib/domain/risk-table-e";

export function RiskTableEPanel({
  productId,
  initialE1,
  initialE2,
  canEdit,
}: {
  productId: string;
  initialE1?: RiskPlanTableERow[];
  initialE2?: RiskPlanTableERow[];
  canEdit: boolean;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const locale = lang === "tr" ? "tr" : "en";
  const [e1Rows, setE1Rows] = useState<RiskPlanTableERow[]>(
    initialE1 ?? emptyTableERows("E1"),
  );
  const [e2Rows, setE2Rows] = useState<RiskPlanTableERow[]>(
    initialE2 ?? emptyTableERows("E2"),
  );
  const [active, setActive] = useState<"E1" | "E2">("E1");
  const [saving, setSaving] = useState(false);
  const [filling, setFilling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setE1Rows(initialE1 ?? emptyTableERows("E1"));
    setE2Rows(initialE2 ?? emptyTableERows("E2"));
  }, [initialE1, initialE2]);

  const rows = active === "E1" ? e1Rows : e2Rows;
  const applicableCount = useMemo(
    () => e1Rows.filter((r) => r.status === "A").length + e2Rows.filter((r) => r.status === "A").length,
    [e1Rows, e2Rows],
  );

  function patchRow(id: string, patch: Partial<RiskPlanTableERow>) {
    const setter = active === "E1" ? setE1Rows : setE2Rows;
    setter((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/risk-management`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTableE1Rows: e1Rows, planTableE2Rows: e2Rows }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("evidence.networkError"));
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError(t("evidence.networkError"));
    } finally {
      setSaving(false);
    }
  }

  async function fillAndLink() {
    setFilling(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/risk-management/table-e/fill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: lang,
          overwrite: tableEHasEvaluations(e1Rows) || tableEHasEvaluations(e2Rows),
          linkFmea: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("risk.tableE.fillError"));
        return;
      }
      if (data.e1Rows) setE1Rows(data.e1Rows);
      if (data.e2Rows) setE2Rows(data.e2Rows);
      setSaved(true);
      router.refresh();
    } catch {
      setError(t("risk.tableE.fillError"));
    } finally {
      setFilling(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">{t("risk.tableE.title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("risk.tableE.desc")}</p>
          <p className="text-xs text-muted-foreground">
            {t("risk.tableE.applicableCount").replace("{n}", String(applicableCount))}
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={fillAndLink} disabled={filling}>
              {filling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {filling ? t("risk.tableE.filling") : t("risk.tableE.fill")}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("common.save")}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("risk.tableE.saved")}</p>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={active === "E1" ? "default" : "outline"}
          onClick={() => setActive("E1")}
        >
          {t("risk.tableE.tabE1")}
        </Button>
        <Button
          size="sm"
          variant={active === "E2" ? "default" : "outline"}
          onClick={() => setActive("E2")}
        >
          {t("risk.tableE.tabE2")}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="bg-muted/60 text-left text-xs uppercase tracking-wide">
              <th className="px-2 py-2 w-28">{t("risk.tableE.col.category")}</th>
              <th className="px-2 py-2 min-w-[180px]">{t("risk.tableE.col.hazard")}</th>
              <th className="px-2 py-2 w-20">{t("risk.tableE.col.status")}</th>
              <th className="px-2 py-2 min-w-[220px]">{t("risk.tableE.col.justification")}</th>
              <th className="px-2 py-2 w-24">{t("risk.tableE.col.fmea")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const hazard = locale === "tr" ? r.hazardTr : r.hazardEn;
              const category = locale === "tr" ? r.categoryTr : r.categoryEn;
              const group = locale === "tr" ? r.groupTr : r.groupEn;
              return (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-2 py-2 text-xs text-muted-foreground">
                    {category}
                    {group ? <div className="mt-0.5 font-normal">{group}</div> : null}
                  </td>
                  <td className="px-2 py-2">{hazard}</td>
                  <td className="px-2 py-2">
                    {canEdit ? (
                      <select
                        className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
                        value={r.status}
                        onChange={(e) =>
                          patchRow(r.id, { status: e.target.value as RiskPlanTableERow["status"] })
                        }
                      >
                        <option value="">—</option>
                        <option value="A">A</option>
                        <option value="N/A">N/A</option>
                      </select>
                    ) : (
                      r.status || "—"
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {canEdit ? (
                      <Textarea
                        value={locale === "tr" ? r.justificationTr : r.justificationEn}
                        onChange={(e) =>
                          patchRow(
                            r.id,
                            locale === "tr"
                              ? { justificationTr: e.target.value }
                              : { justificationEn: e.target.value },
                          )
                        }
                        rows={2}
                        className="min-h-[52px] text-sm"
                      />
                    ) : (
                      <span className="text-muted-foreground">
                        {locale === "tr" ? r.justificationTr : r.justificationEn || "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 font-mono text-xs font-semibold">
                    {r.linkedRiskNo?.trim() || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
