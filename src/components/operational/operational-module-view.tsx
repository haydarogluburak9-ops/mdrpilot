"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus, Trash2, Download } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  WorkflowStatusSelect,
  OPERATIONAL_STATUS_TONE_CLASS,
  workflowStatusTone,
} from "@/components/ui/status-badge";
import { OperationalStatusColumns } from "@/components/operational/operational-status-columns";
import { GenericOperationalRecordPanel } from "@/components/operational/generic-operational-record-panel";
import { formatDate } from "@/lib/utils";
import type { Product } from "@/lib/domain/types";
import type { OperationalModuleDef } from "@/lib/operational/modules";
import type { OperationalRecordDto } from "@/lib/operational/record-service";
import { cn } from "@/lib/utils";

export function OperationalModuleView({
  def,
  records: recordsProp,
  products,
  canEdit,
  initialProductId,
}: {
  def: OperationalModuleDef;
  records: OperationalRecordDto[];
  products: Product[];
  canEdit: boolean;
  initialProductId?: string;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState(recordsProp);
  const [creating, setCreating] = useState(searchParams.get("new") === "1");
  const [title, setTitle] = useState("");
  const [productId, setProductId] = useState(initialProductId ?? searchParams.get("productId") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusStatus, setFocusStatus] = useState<string | null>(null);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  useEffect(() => {
    setRecords(recordsProp);
  }, [recordsProp]);

  const apiBase = `/api/operational/${def.slug}`;

  async function createRecord() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError(t("operational.titleRequired"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          productId: productId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("operational.createError"));
        return;
      }
      setTitle("");
      setProductId("");
      setCreating(false);
      const record = data.record as OperationalRecordDto;
      setRecords((prev) => [record, ...prev.filter((r) => r.id !== record.id)]);
      setFocusStatus("OPEN");
      setExpandedRecordId(record.id);
      router.refresh();
    } catch {
      setError(t("operational.createError"));
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    setFocusStatus(status);
    await fetch(`${apiBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function deleteRecord(r: OperationalRecordDto) {
    const label = r.referenceNo ? `${r.referenceNo} — ${r.title}` : r.title;
    if (!confirm(t("operational.deleteConfirm").replace("{label}", label))) return;
    const res = await fetch(`${apiBase}/${r.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : t("operational.deleteError"));
      return;
    }
    router.refresh();
  }

  const openCount = records.filter((r) => r.status !== "CLOSED").length;

  return (
    <div>
      <PageHeader
        title={t(def.labelKey)}
        description={t(def.descKey)}
        actions={
          <div className="flex flex-wrap gap-2">
            {def.slug === "calibration" && records.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const locale = lang === "en" ? "en" : "tr";
                  const a = document.createElement("a");
                  a.href = `/api/operational/calibration/plan-export?lang=${locale}`;
                  a.rel = "noopener";
                  a.click();
                }}
              >
                <Download className="h-4 w-4" />
                {t("operational.calibration.exportPlan")}
              </Button>
            )}
            {canEdit ? (
              <Button size="sm" onClick={() => setCreating((v) => !v)}>
                <Plus className="h-4 w-4" />
                {t("operational.newRecord")}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="secondary">
          {t("operational.total")}: {records.length}
        </Badge>
        <Badge variant="outline">
          {t("operational.open")}: {openCount}
        </Badge>
      </div>

      {creating && canEdit && (
        <Card className="mb-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder={def.slug === "calibration" ? t("operational.calibration.titlePlaceholder") : t("operational.titlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">{t("operational.noProduct")}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={createRecord} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("operational.create")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </Card>
      )}

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <OperationalStatusColumns
        items={records}
        statusOrder={def.statusOrder}
        labelPrefix="operational.recordStatus"
        toneMap={OPERATIONAL_STATUS_TONE_CLASS}
        getStatus={(r) => r.status}
        focusStatus={focusStatus}
        renderItem={(r) => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {r.referenceNo && (
                      <span className="font-mono text-xs text-muted-foreground">{r.referenceNo}</span>
                    )}
                    <h3 className="font-medium">{r.title}</h3>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-medium",
                        workflowStatusTone(OPERATIONAL_STATUS_TONE_CLASS, r.status),
                      )}
                    >
                      {t(`operational.recordStatus.${r.status}`)}
                    </span>
                  </div>
                  {r.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {r.ownerName && <span>{t("operational.owner")}: {r.ownerName}</span>}
                    {r.dueDate && <span>{t("operational.dueDate")}: {formatDate(r.dueDate)}</span>}
                    {r.productName && <span>{r.productName}</span>}
                    {r.capaRef && <span>CAPA: {r.capaRef}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canEdit && (
                    <>
                      <WorkflowStatusSelect
                        value={r.status}
                        options={def.statusOrder}
                        labelPrefix="operational.recordStatus"
                        toneMap={OPERATIONAL_STATUS_TONE_CLASS}
                        onChange={(status) => updateStatus(r.id, status)}
                        aria-label={t("qms.col.status")}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteRecord(r)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <GenericOperationalRecordPanel
                moduleSlug={def.slug}
                def={def}
                recordId={r.id}
                title={r.title}
                formContent={r.formContent}
                referenceNo={r.referenceNo}
                canEdit={canEdit}
                defaultExpanded={expandedRecordId === r.id}
              />
            </CardContent>
          </Card>
        )}
      />
    </div>
  );
}
