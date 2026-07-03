"use client";

import { useRef, useState } from "react";
import {
  UploadCloud, FileText, Sparkles, Download, Trash2, RefreshCw, Loader2,
  AlertCircle, Link2, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Disclaimer } from "@/components/ui/disclaimer";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { EmptyState } from "@/components/ui/empty-state";
import { DOCUMENT_KINDS, DOCUMENT_KIND_LABEL, MAX_UPLOAD_MB } from "@/lib/files/config";

interface FileDetail {
  id: string;
  fileName: string;
  documentKind: string;
  mimeType: string;
  extension: string | null;
  sizeBytes: number;
  checksumSha256: string | null;
  analysisStatus: string;
  analysisSummary: string | null;
  analysisJson: any;
  productId: string | null;
  productName: string | null;
  uploadedBy: string | null;
  linkCount: number;
  createdAt: string;
}

interface ProductLite { id: string; name: string; }

function fmtSize(b: number) {
  return b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`;
}

function statusBadge(s: string, t: (k: string) => string) {
  if (s === "COMPLETED") return <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> {t("files.status.analyzed")}</Badge>;
  if (s === "FAILED") return <Badge variant="destructive"><XCircle className="h-3 w-3" /> {t("files.status.failed")}</Badge>;
  return <Badge variant="muted"><Clock className="h-3 w-3" /> {t("files.status.pending")}</Badge>;
}

function uploadWithProgress(form: FormData, onProgress: (pct: number) => void): Promise<{ ok: boolean; status: number; body: any }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/files/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: any = null;
      try { body = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, body });
    };
    xhr.onerror = () => resolve({ ok: false, status: 0, body: null });
    xhr.send(form);
  });
}

export function FilesView({
  initialFiles,
  products,
  canUpload,
  canDelete,
}: {
  initialFiles: FileDetail[];
  products: ProductLite[];
  canUpload: boolean;
  canDelete: boolean;
}) {
  const { t } = useI18n();
  const [files, setFiles] = useState<FileDetail[]>(initialFiles);
  const [productId, setProductId] = useState<string>(products[0]?.id ?? "");
  const [documentKind, setDocumentKind] = useState<string>("TEST_REPORT");
  const [uploading, setUploading] = useState<{ name: string; pct: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filterProduct, setFilterProduct] = useState<string>("");
  const [filterKind, setFilterKind] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const qs = new URLSearchParams();
    if (filterProduct) qs.set("productId", filterProduct);
    if (filterKind) qs.set("documentKind", filterKind);
    const res = await fetch(`/api/files?${qs.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setFiles(data.files);
    }
  }

  async function onFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError(null);
    for (const file of Array.from(list)) {
      const form = new FormData();
      form.append("file", file);
      if (productId) form.append("productId", productId);
      form.append("documentKind", documentKind);
      setUploading({ name: file.name, pct: 0 });
      const res = await uploadWithProgress(form, (pct) => setUploading({ name: file.name, pct }));
      if (!res.ok) {
        setError(res.body?.error ?? `${t("files.uploadFailed")} (${res.status})`);
      } else if (res.body?.duplicateOf) {
        setError(`${t("files.duplicate")} "${file.name}" → ${res.body.duplicateOf.fileName}`);
      }
    }
    setUploading(null);
    await refresh();
  }

  async function reanalyze(id: string) {
    setBusyId(id);
    await fetch(`/api/files/${id}/analyze`, { method: "POST" });
    setBusyId(null);
    await refresh();
  }

  async function remove(id: string) {
    const prev = files;
    setFiles((f) => f.filter((x) => x.id !== id));
    const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
    if (!res.ok) setFiles(prev);
  }

  function download(id: string) {
    const a = document.createElement("a");
    a.href = `/api/files/${id}/download`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const visible = files.filter((f) => {
    if (filterProduct && f.productId !== filterProduct) return false;
    if (filterKind && f.documentKind !== filterKind) return false;
    if (filterStatus && f.analysisStatus !== filterStatus) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title={t("files.title")} description={t("files.desc")} />

      {canUpload ? (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("files.product")}</label>
              <select value={productId} onChange={(e) => setProductId(e.target.value)} className="rounded-lg border border-input bg-card px-3 py-2 text-sm">
                <option value="">{t("files.noProduct")}</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("files.docKind")}</label>
              <select value={documentKind} onChange={(e) => setDocumentKind(e.target.value)} className="rounded-lg border border-input bg-card px-3 py-2 text-sm">
                {DOCUMENT_KINDS.map((k) => <option key={k} value={k}>{DOCUMENT_KIND_LABEL[k]}</option>)}
              </select>
            </div>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card py-10 text-center transition-colors hover:border-primary/40"
          >
            <UploadCloud className="mb-3 h-9 w-9 text-muted-foreground" />
            <p className="font-medium">{t("files.dropzone")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("files.dropHintA")} {MAX_UPLOAD_MB} {t("files.dropHintB")}
            </p>
            <input ref={inputRef} type="file" multiple hidden accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg" onChange={(e) => onFiles(e.target.files)} />
          </div>

          {uploading && (
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {t("files.uploadingName")} {uploading.name}…</span>
                <span className="text-muted-foreground">{uploading.pct}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${uploading.pct}%` }} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <Disclaimer className="mb-4" text={t("files.viewOnly")} />
      )}

      {error && (
        <p className="mb-3 flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-4 w-4" /> {error}</p>
      )}

      {busyId && (
        <div className="mb-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <AiAnalyzingHint />
        </div>
      )}

      <Disclaimer className="mb-4" text={t("files.promptInjection")} />

      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} className="rounded-lg border border-input bg-card px-2 py-1.5 text-xs">
          <option value="">{t("files.allProducts")}</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterKind} onChange={(e) => setFilterKind(e.target.value)} className="rounded-lg border border-input bg-card px-2 py-1.5 text-xs">
          <option value="">{t("files.allKinds")}</option>
          {DOCUMENT_KINDS.map((k) => <option key={k} value={k}>{DOCUMENT_KIND_LABEL[k]}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-input bg-card px-2 py-1.5 text-xs">
          <option value="">{t("files.allStatuses")}</option>
          <option value="COMPLETED">{t("files.fAnalyzed")}</option>
          <option value="PENDING">{t("files.fPending")}</option>
          <option value="FAILED">{t("files.fFailed")}</option>
        </select>
        <Button variant="outline" size="sm" className="gap-1" onClick={refresh}><RefreshCw className="h-3.5 w-3.5" /> {t("exports.refresh")}</Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={FileText} title={t("filesView.empty.title")} description={t("filesView.empty.desc")} />
      ) : (
        <div className="space-y-2">
          {visible.map((f) => {
            const aj = f.analysisJson ?? {};
            const gaps: string[] = aj.complianceGaps ?? [];
            const links: { targetType: string; reason: string; confidence: number }[] = aj.recommendedLinks ?? [];
            const standards: string[] = aj.relatedStandards ?? [];
            return (
              <Card key={f.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">{f.fileName}</p>
                        <Badge variant="secondary">{DOCUMENT_KIND_LABEL[f.documentKind as keyof typeof DOCUMENT_KIND_LABEL] ?? f.documentKind}</Badge>
                        {statusBadge(f.analysisStatus, t)}
                        {f.linkCount > 0 && <Badge variant="default"><Link2 className="h-3 w-3" /> {f.linkCount} {t("files.linked")}</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {f.productName ? `${f.productName} · ` : ""}{fmtSize(f.sizeBytes)} · {new Date(f.createdAt).toLocaleString()}{f.uploadedBy ? ` · ${f.uploadedBy}` : ""}
                      </p>
                      {f.analysisSummary && (
                        <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-accent" /> {f.analysisSummary}
                        </p>
                      )}
                      {standards.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {standards.slice(0, 6).map((s, i) => <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>)}
                        </div>
                      )}
                      {gaps.length > 0 && (
                        <ul className="mt-1 list-disc pl-4 text-xs text-warning-foreground">
                          {gaps.slice(0, 3).map((g, i) => <li key={i}>{g}</li>)}
                        </ul>
                      )}
                      {links.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          <span className="font-medium">{t("files.aiLinks")}</span>{" "}
                          {links.slice(0, 4).map((l, i) => (
                            <span key={i}>{i > 0 ? ", " : ""}{l.targetType} ({Math.round(l.confidence * 100)}%)</span>
                          ))}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <div className="flex gap-1.5">
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => download(f.id)}><Download className="h-3.5 w-3.5" /></Button>
                        {canUpload && (
                          <Button variant="outline" size="sm" className="gap-1" disabled={busyId === f.id} onClick={() => reanalyze(f.id)}>
                            {busyId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="outline" size="sm" className="gap-1 text-destructive" onClick={() => remove(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
