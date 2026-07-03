"use client";

import { useState } from "react";
import {
  Download, Trash2, Plus, Loader2, AlertCircle, RefreshCw, FileDown, X,
} from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface ExportRow {
  id: string;
  type: string;
  format: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  fileName: string | null;
  sizeBytes: number | null;
  errorMessage: string | null;
  productName: string | null;
  createdBy: string | null;
  createdAt: string;
}

interface ProductLite {
  id: string;
  name: string;
}

const EXPORT_OPTIONS: { type: string; labelKey: string; needsProduct: boolean }[] = [
  { type: "FULL_MDR_TECHNICAL_FILE_ZIP", labelKey: "exports.opt.fullMdrZip", needsProduct: true },
  { type: "TECHNICAL_FILE_DOCX", labelKey: "exports.opt.tfDocx", needsProduct: true },
  { type: "GSPR_XLSX", labelKey: "exports.opt.gsprXlsx", needsProduct: true },
  { type: "RISK_XLSX", labelKey: "exports.opt.riskXlsx", needsProduct: true },
  { type: "IFU_DOCX", labelKey: "exports.opt.ifuDocx", needsProduct: true },
  { type: "LABEL_PDF", labelKey: "exports.opt.labelPdf", needsProduct: true },
  { type: "PMS_PMCF_DOCX", labelKey: "exports.opt.pmsDocx", needsProduct: true },
  { type: "AUDIT_READINESS_PDF", labelKey: "exports.opt.auditPdf", needsProduct: true },
  { type: "PRODUCT_DOSSIER_ZIP", labelKey: "exports.opt.dossierZip", needsProduct: true },
  { type: "QMS_PACKAGE_ZIP", labelKey: "exports.opt.qmsZip", needsProduct: false },
];

function fmtSize(b: number | null) {
  if (!b) return "—";
  return b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function statusBadge(status: ExportRow["status"], t: (k: string) => string) {
  switch (status) {
    case "COMPLETED":
      return <Badge variant="success">{t("exports.status.completed")}</Badge>;
    case "PROCESSING":
      return <Badge variant="warning">{t("exports.status.processing")}</Badge>;
    case "QUEUED":
      return <Badge variant="muted">{t("exports.status.queued")}</Badge>;
    case "FAILED":
      return <Badge variant="destructive">{t("exports.status.failed")}</Badge>;
  }
}

export function ExportsView({
  products,
  initialExports,
  canCreate,
  canDelete,
}: {
  products: ProductLite[];
  initialExports: ExportRow[];
  canCreate: boolean;
  canDelete: boolean;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<ExportRow[]>(initialExports);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/exports");
      if (res.ok) {
        const data = await res.json();
        setRows(data.exports);
      }
    } finally {
      setRefreshing(false);
    }
  }

  function download(id: string) {
    const a = document.createElement("a");
    a.href = `/api/exports/${id}/download`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function remove(id: string) {
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== id));
    const res = await fetch(`/api/exports/${id}`, { method: "DELETE" });
    if (!res.ok) setRows(prev);
  }

  return (
    <div>
      <PageHeader
        title={t("nav.exports")}
        description={t("exports.desc")}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> {t("exports.refresh")}
            </Button>
            {canCreate && (
              <Button size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4" /> {t("exports.new")}
              </Button>
            )}
          </div>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={FileDown}
          title={t("exports.empty.title")}
          description={canCreate ? t("exports.empty.descCreate") : t("exports.empty.descView")}
          action={canCreate ? <Button className="gap-1.5" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> {t("exports.new")}</Button> : undefined}
        />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileDown className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.fileName ?? r.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.productName ? `${r.productName} · ` : ""}{r.type} · {fmtSize(r.sizeBytes)} · {fmtDate(r.createdAt)}
                    {r.createdBy ? ` · ${r.createdBy}` : ""}
                  </p>
                  {r.status === "FAILED" && r.errorMessage && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" /> {r.errorMessage}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(r.status, t)}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={r.status !== "COMPLETED"}
                    onClick={() => download(r.id)}
                  >
                    <Download className="h-3.5 w-3.5" /> {t("common.download")}
                  </Button>
                  {canDelete && (
                    <Button variant="outline" size="sm" className="gap-1 text-destructive" onClick={() => remove(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {modalOpen && (
        <CreateExportModal
          products={products}
          onClose={() => setModalOpen(false)}
          onDone={async () => {
            setModalOpen(false);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function CreateExportModal({
  products,
  onClose,
  onDone,
}: {
  products: ProductLite[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [type, setType] = useState(EXPORT_OPTIONS[0].type);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [language, setLanguage] = useState<"tr" | "en">("tr");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsProduct = EXPORT_OPTIONS.find((o) => o.type === type)?.needsProduct ?? true;

  async function submit() {
    setError(null);
    if (needsProduct && !productId) {
      setError(t("exports.selectProduct"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, productId: needsProduct ? productId : undefined, language }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("exports.failed"));
        return;
      }
      const a = document.createElement("a");
      a.href = `/api/exports/${data.job.id}/download`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      onDone();
    } catch {
      setError(t("exports.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("exports.new")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t("exports.type")}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
            >
              {EXPORT_OPTIONS.map((o) => (
                <option key={o.type} value={o.type}>{t(o.labelKey)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t("exports.language")}</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "tr" | "en")}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
            >
              <option value="tr">Türkçe</option>
              <option value="en">English (rev …e)</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">{t("exports.languageHint")}</p>
          </div>

          {needsProduct && (
            <div>
              <label className="mb-1 block text-sm font-medium">{t("exports.product")}</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
              >
                {products.length === 0 && <option value="">{t("exports.noProducts")}</option>}
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p className="flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>{t("common.cancel")}</Button>
            <Button className="gap-1.5" onClick={submit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t("exports.generateDownload")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
