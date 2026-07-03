"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CapaStatusBadge, WorkflowStatusSelect, CAPA_STATUS_TONE_CLASS } from "@/components/ui/status-badge";
import { OperationalRecordPanel } from "@/components/operational/operational-record-panel";
import { OperationalStatusColumns } from "@/components/operational/operational-status-columns";
import { formatDate } from "@/lib/utils";
import type { Product } from "@/lib/domain/types";

export interface CapaRow {
  id: string;
  title: string;
  status: string;
  referenceNo?: string | null;
  rootCause?: string | null;
  correction?: string | null;
  correctiveAction?: string | null;
  ownerName?: string | null;
  dueDate: string | null;
  productId?: string | null;
  productName?: string | null;
  qmsDocumentId?: string | null;
  formContent?: string | null;
  updatedAt: string;
}

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "CLOSED", "OVERDUE"] as const;

export function CapaView({
  capas: capasProp,
  products,
  canEdit,
}: {
  capas: CapaRow[];
  products: Product[];
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [capas, setCapas] = useState(capasProp);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusStatus, setFocusStatus] = useState<string | null>(null);
  const [expandedCapaId, setExpandedCapaId] = useState<string | null>(null);

  useEffect(() => {
    setCapas(capasProp);
  }, [capasProp]);

  async function createCapa() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError(t("capa.titleRequired"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/capa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          productId: productId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("capa.createError"));
        return;
      }
      setTitle("");
      setProductId("");
      setCreating(false);
      const id = (data.capa as { id?: string })?.id;
      if (id) {
        setExpandedCapaId(id);
        setFocusStatus("OPEN");
      }
      router.refresh();
    } catch {
      setError(t("capa.createError"));
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    setFocusStatus(status);
    await fetch(`/api/capa/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function deleteCapa(c: CapaRow) {
    const label = c.referenceNo ? `${c.referenceNo} — ${c.title}` : c.title;
    if (!confirm(t("capa.deleteConfirm").replace("{label}", label))) return;
    const res = await fetch(`/api/capa/${c.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : t("capa.deleteError"));
      return;
    }
    router.refresh();
  }

  const now = Date.now();
  const openCount = capas.filter((c) => c.status !== "CLOSED").length;
  const overdueCount = capas.filter(
    (c) => c.status !== "CLOSED" && c.dueDate && new Date(c.dueDate).getTime() < now,
  ).length;

  return (
    <div>
      <PageHeader title={t("capa.title")} description={t("capa.desc")} />
      {error && !creating && <p className="mb-4 text-sm text-destructive">{error}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="secondary">{t("capa.openCount")}: {openCount}</Badge>
        {overdueCount > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {t("capa.overdueCount")}: {overdueCount}
          </Badge>
        )}
      </div>

      {canEdit && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            {!creating ? (
              <Button size="sm" type="button" className="gap-1.5" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                {t("capa.new")}
              </Button>
            ) : (
              <div className="space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("capa.titlePlaceholder")}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                />
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                >
                  <option value="">{t("capa.noProduct")}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    type="button"
                    disabled={loading || !title.trim()}
                    onClick={createCapa}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("capa.save")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCreating(false)}>
                    {t("capa.cancel")}
                  </Button>
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {capas.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("capa.empty")}</p>
      ) : (
        <OperationalStatusColumns
          items={capas}
          statusOrder={STATUS_OPTIONS}
          labelPrefix="capaStatus"
          toneMap={CAPA_STATUS_TONE_CLASS}
          getStatus={(c) => c.status}
          focusStatus={focusStatus}
          renderItem={(c) => {
            const overdue =
              c.status !== "CLOSED" && c.dueDate && new Date(c.dueDate).getTime() < now;
            return (
              <Card key={c.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-6">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {c.referenceNo && (
                        <Badge variant="secondary" className="font-mono text-xs">{c.referenceNo}</Badge>
                      )}
                      <p className="font-medium">{c.title}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {c.productName && (
                        <Link href={`/products/${c.productId}`} className="hover:underline">
                          {c.productName}
                        </Link>
                      )}
                      {c.ownerName && <span>{c.ownerName}</span>}
                      {c.dueDate && (
                        <span className={overdue ? "text-destructive font-medium" : ""}>
                          {t("capa.due")}: {formatDate(c.dueDate)}
                        </span>
                      )}
                    </div>
                    {c.correctiveAction && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{c.correctiveAction}</p>
                    )}
                    <OperationalRecordPanel
                      module="capa"
                      recordId={c.id}
                      title={c.title}
                      formContent={c.formContent}
                      qmsDocumentId={c.qmsDocumentId}
                      canEdit={canEdit}
                      defaultExpanded={expandedCapaId === c.id}
                    />
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    {canEdit ? (
                      <WorkflowStatusSelect
                        value={c.status}
                        options={STATUS_OPTIONS}
                        labelPrefix="capaStatus"
                        toneMap={CAPA_STATUS_TONE_CLASS}
                        onChange={(status) => updateStatus(c.id, status)}
                        aria-label={t("qms.col.status")}
                      />
                    ) : (
                      <CapaStatusBadge status={c.status} />
                    )}
                    {canEdit && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteCapa(c)}
                        aria-label={t("common.delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          }}
        />
      )}
    </div>
  );
}
