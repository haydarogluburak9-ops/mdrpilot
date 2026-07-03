"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComplaintStatusBadge, WorkflowStatusSelect, COMPLAINT_STATUS_TONE_CLASS } from "@/components/ui/status-badge";
import { OperationalRecordPanel } from "@/components/operational/operational-record-panel";
import { OperationalStatusColumns } from "@/components/operational/operational-status-columns";
import { formatDate } from "@/lib/utils";
import type { Product } from "@/lib/domain/types";

export interface ComplaintRow {
  id: string;
  complaintNo: string | null;
  title: string;
  description?: string | null;
  status: string;
  capaRequired: boolean;
  capaRef?: string | null;
  ownerName?: string | null;
  lotNumber?: string | null;
  productId?: string | null;
  productName?: string | null;
  qmsDocumentId?: string | null;
  formContent?: string | null;
  receivedAt: string;
  updatedAt: string;
}

const STATUS_OPTIONS = ["OPEN", "MONITORING", "CLOSED"] as const;

export function ComplaintsView({
  complaints: complaintsProp,
  products,
  canEdit,
}: {
  complaints: ComplaintRow[];
  products: Product[];
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [complaints, setComplaints] = useState(complaintsProp);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [productId, setProductId] = useState("");
  const [capaRequired, setCapaRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusStatus, setFocusStatus] = useState<string | null>(null);
  const [expandedComplaintId, setExpandedComplaintId] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  useEffect(() => {
    setComplaints(complaintsProp);
  }, [complaintsProp]);

  async function createComplaint() {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          productId: productId || null,
          capaRequired,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("complaints.createError"));
        return;
      }
      const id = (data.complaint as { id?: string })?.id;
      setTitle("");
      setProductId("");
      setCapaRequired(false);
      setCreating(false);
      if (id) {
        setExpandedComplaintId(id);
        setFocusStatus("OPEN");
      }
      router.refresh();
    } catch {
      setError(t("complaints.createError"));
    } finally {
      setLoading(false);
    }
  }

  async function updateComplaint(id: string, patch: Record<string, unknown>) {
    if (typeof patch.status === "string") setFocusStatus(patch.status);
    await fetch(`/api/complaints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  }

  async function linkFromComplaint(
    complaintId: string,
    action: "capa-from-complaint" | "vigilance-from-complaint",
  ) {
    setLinkingId(complaintId);
    setError(null);
    try {
      const res = await fetch("/api/operational/closures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, complaintId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("operational.closure.error"));
        return;
      }
      if (data.href) window.location.href = data.href;
      else router.refresh();
    } catch {
      setError(t("operational.closure.error"));
    } finally {
      setLinkingId(null);
    }
  }

  async function deleteComplaint(c: ComplaintRow) {
    const label = c.complaintNo ? `${c.complaintNo} — ${c.title}` : c.title;
    if (!confirm(t("complaints.deleteConfirm").replace("{label}", label))) return;
    const res = await fetch(`/api/complaints/${c.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : t("complaints.deleteError"));
      return;
    }
    router.refresh();
  }

  const openCount = complaints.filter((c) => c.status !== "CLOSED").length;
  const capaLinkedCount = complaints.filter((c) => c.capaRequired).length;

  return (
    <div>
      <PageHeader title={t("complaints.title")} description={t("complaints.desc")} />
      {error && !creating && <p className="mb-4 text-sm text-destructive">{error}</p>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{t("complaints.openCount")}: {openCount}</Badge>
        {capaLinkedCount > 0 && (
          <Badge variant="outline" className="gap-1">
            <MessageSquare className="h-3 w-3" />
            {t("complaints.capaLinkedCount")}: {capaLinkedCount}
          </Badge>
        )}
        <Link
          href="/qms/procedures/SOP-CH"
          className="text-xs text-primary hover:underline"
        >
          {t("complaints.formsLink")}
        </Link>
      </div>

      {canEdit && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            {!creating ? (
              <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                {t("complaints.new")}
              </Button>
            ) : (
              <div className="space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("complaints.titlePlaceholder")}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                />
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                >
                  <option value="">{t("complaints.noProduct")}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={capaRequired}
                    onChange={(e) => setCapaRequired(e.target.checked)}
                  />
                  {t("complaints.capaRequiredLabel")}
                </label>
                {capaRequired && (
                  <p className="text-xs text-muted-foreground">{t("complaints.capaRequiredHint")}</p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" disabled={loading} onClick={createComplaint}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("complaints.save")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCreating(false)}>
                    {t("complaints.cancel")}
                  </Button>
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {complaints.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("complaints.empty")}</p>
      ) : (
        <OperationalStatusColumns
          items={complaints}
          statusOrder={STATUS_OPTIONS}
          labelPrefix="complaintStatus"
          toneMap={COMPLAINT_STATUS_TONE_CLASS}
          getStatus={(c) => c.status}
          focusStatus={focusStatus}
          renderItem={(c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-6">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {c.complaintNo && (
                      <Badge variant="secondary" className="font-mono text-xs">{c.complaintNo}</Badge>
                    )}
                    <p className="font-medium">{c.title}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {c.productName && (
                      <Link href={`/products/${c.productId}`} className="hover:underline">
                        {c.productName}
                      </Link>
                    )}
                    {c.lotNumber && <span>Lot: {c.lotNumber}</span>}
                    {c.ownerName && <span>{c.ownerName}</span>}
                    <span>{formatDate(c.receivedAt)}</span>
                  </div>
                  {c.capaRequired && (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant="outline">{t("complaints.capaRequiredBadge")}</Badge>
                      {canEdit ? (
                        <input
                          value={c.capaRef ?? ""}
                          onChange={(e) =>
                            updateComplaint(c.id, { capaRef: e.target.value || null })
                          }
                          placeholder={t("complaints.capaRefPlaceholder")}
                          className="rounded border border-input bg-card px-2 py-0.5 text-xs max-w-[200px]"
                        />
                      ) : (
                        c.capaRef && (
                          <Link href="/operational/capa" className="text-primary hover:underline">
                            {c.capaRef}
                          </Link>
                        )
                      )}
                    </div>
                  )}
                  {canEdit && c.status !== "CLOSED" && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={linkingId === c.id}
                        onClick={() => linkFromComplaint(c.id, "capa-from-complaint")}
                      >
                        {t("operational.closure.createCapa")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={linkingId === c.id}
                        onClick={() => linkFromComplaint(c.id, "vigilance-from-complaint")}
                      >
                        {t("operational.closure.createVigilance")}
                      </Button>
                    </div>
                  )}
                  <OperationalRecordPanel
                    module="complaint"
                    recordId={c.id}
                    title={c.title}
                    formContent={c.formContent}
                    qmsDocumentId={c.qmsDocumentId}
                    complaintNo={c.complaintNo}
                    canEdit={canEdit}
                    defaultExpanded={expandedComplaintId === c.id}
                  />
                </div>
                {canEdit ? (
                  <div className="flex flex-wrap items-start gap-2">
                    <WorkflowStatusSelect
                      value={c.status}
                      options={STATUS_OPTIONS}
                      labelPrefix="complaintStatus"
                      toneMap={COMPLAINT_STATUS_TONE_CLASS}
                      onChange={(status) => updateComplaint(c.id, { status })}
                      aria-label={t("qms.col.status")}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteComplaint(c)}
                      aria-label={t("common.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <ComplaintStatusBadge status={c.status} />
                )}
              </CardContent>
            </Card>
          )}
        />
      )}
    </div>
  );
}
