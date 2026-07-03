"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";
import { formatDate, relativeDays } from "@/lib/utils";

type Supplier = {
  id: string;
  name: string;
  scope: string | null;
  riskClass: string | null;
  status: "APPROVED" | "CONDITIONAL" | "SUSPENDED";
  approvedAt: string | null;
  reEvalDue: string | null;
  notes: string | null;
};

export function ApprovedSuppliersPanel({ canEdit }: { canEdit: boolean }) {
  const { t } = useI18n();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/approved-suppliers");
      const data = await res.json();
      if (!res.ok) setError(data.error ?? t("suppliers.saveError"));
      else setSuppliers(data.suppliers ?? []);
    } catch {
      setError(t("suppliers.saveError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addSupplier() {
    const res = await fetch("/api/approved-suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: t("suppliers.name") }),
    });
    const data = await res.json();
    if (res.ok && data.supplier) setSuppliers((prev) => [...prev, data.supplier]);
  }

  async function saveSupplier(s: Supplier) {
    const res = await fetch(`/api/approved-suppliers/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    if (!res.ok) setError(t("suppliers.saveError"));
  }

  async function removeSupplier(id: string) {
    const res = await fetch(`/api/approved-suppliers/${id}`, { method: "DELETE" });
    if (res.ok) setSuppliers((prev) => prev.filter((s) => s.id !== id));
  }

  function updateLocal(id: string, patch: Partial<Supplier>) {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>{t("suppliers.title")}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t("suppliers.desc")}</p>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" className="gap-1" onClick={addSupplier}>
            <Plus className="h-4 w-4" /> {t("suppliers.add")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {suppliers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("suppliers.empty")}</p>
        ) : (
          suppliers.map((s) => {
            const days = relativeDays(s.reEvalDue);
            const overdue = days != null && days < 0;
            return (
              <div key={s.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <input
                    className="flex-1 min-w-[200px] rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium"
                    value={s.name}
                    disabled={!canEdit}
                    onChange={(e) => updateLocal(s.id, { name: e.target.value })}
                  />
                  <select
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    value={s.status}
                    disabled={!canEdit}
                    onChange={(e) =>
                      updateLocal(s.id, { status: e.target.value as Supplier["status"] })
                    }
                  >
                    {(["APPROVED", "CONDITIONAL", "SUSPENDED"] as const).map((st) => (
                      <option key={st} value={st}>
                        {t(`suppliers.status.${st}`)}
                      </option>
                    ))}
                  </select>
                  {overdue && <Badge variant="destructive">{t("quality.reminder.OVERDUE")}</Badge>}
                </div>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                  placeholder={t("suppliers.scope")}
                  value={s.scope ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => updateLocal(s.id, { scope: e.target.value })}
                />
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    placeholder={t("suppliers.riskClass")}
                    value={s.riskClass ?? ""}
                    disabled={!canEdit}
                    onChange={(e) => updateLocal(s.id, { riskClass: e.target.value })}
                  />
                  <label className="text-xs text-muted-foreground">
                    {t("suppliers.reEvalDue")}
                    <input
                      type="date"
                      className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                      value={s.reEvalDue ? s.reEvalDue.slice(0, 10) : ""}
                      disabled={!canEdit}
                      onChange={(e) =>
                        updateLocal(s.id, {
                          reEvalDue: e.target.value ? new Date(e.target.value).toISOString() : null,
                        })
                      }
                    />
                  </label>
                  <span className="text-xs text-muted-foreground self-end pb-1">
                    {s.reEvalDue ? formatDate(s.reEvalDue) : "—"}
                  </span>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => saveSupplier(s)}>
                      <Save className="h-3.5 w-3.5" /> {t("common.save")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeSupplier(s.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
