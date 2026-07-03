"use client";

import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";

type Row = {
  id: string;
  procedureCode: string;
  roleLabel: string;
  personName: string | null;
  status: string;
  nextDueAt: string | null;
};

export function TrainingMatrixView({ canEdit }: { canEdit: boolean }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    fetch("/api/eqms/training-matrix")
      .then((r) => r.json())
      .then((d) => setRows(d.competencies ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  async function markComplete(id: string) {
    setSavingId(id);
    await fetch("/api/eqms/training-matrix", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    reload();
    setSavingId(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("eqms.trainingMatrix.title")}
        description={t("eqms.trainingMatrix.desc")}
      />
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            {t("eqms.trainingMatrix.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left">{t("eqms.trainingMatrix.sop")}</th>
                <th className="px-3 py-2 text-left">{t("eqms.trainingMatrix.role")}</th>
                <th className="px-3 py-2 text-left">{t("eqms.trainingMatrix.due")}</th>
                <th className="px-3 py-2 text-left">{t("eqms.trainingMatrix.status")}</th>
                {canEdit && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{r.procedureCode}</td>
                  <td className="px-3 py-2">{r.roleLabel}</td>
                  <td className="px-3 py-2">{r.nextDueAt?.slice(0, 10) ?? "—"}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  {canEdit && (
                    <td className="px-3 py-2 text-right">
                      {r.status === "PENDING" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={savingId === r.id}
                          onClick={() => markComplete(r.id)}
                        >
                          {savingId === r.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          <span className="ml-1">{t("eqms.trainingMatrix.complete")}</span>
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
