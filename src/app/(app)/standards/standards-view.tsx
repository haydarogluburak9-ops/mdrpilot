"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Library, Plus, Loader2, X, AlertCircle, ChevronRight, Trash2, BookOpen, FileCheck2, ShieldAlert } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Disclaimer } from "@/components/ui/disclaimer";
import { formatStandardLabel } from "@/lib/domain/standards-catalog";

interface StandardItem {
  id: string; code: string; title: string; version: string | null;
  sourceType: string; jurisdiction: string | null; isPublic: boolean;
  companyId: string | null; clauseCount: number; createdAt: string;
}
interface ClauseDetail {
  id: string; clauseNo: string; title: string; summary: string;
  keywords: string | null; applicability: string | null;
  documentExpectations: string[]; evidenceExpectations: string[]; riskRelevance: string[];
}

function sourceBadge(s: string, t: (k: string) => string) {
  const map: Record<string, "muted" | "warning" | "success" | "secondary" | "outline"> = {
    PUBLIC_REGULATION: "secondary", USER_UPLOADED_LICENSED: "success",
    INTERNAL_PROCEDURE: "warning", TEMPLATE_SUMMARY: "muted",
  };
  return <Badge variant={map[s] ?? "muted"}>{t(`standards.source.${s}`)}</Badge>;
}

export function StandardsView({ standards, canManage }: { standards: StandardItem[]; canManage: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [selected, setSelected] = useState<StandardItem | null>(standards[0] ?? null);
  const [clauses, setClauses] = useState<ClauseDetail[]>([]);
  const [loadingClauses, setLoadingClauses] = useState(false);
  const [activeClause, setActiveClause] = useState<ClauseDetail | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  async function openStandard(s: StandardItem) {
    setSelected(s);
    setActiveClause(null);
    setLoadingClauses(true);
    setClauses([]);
    try {
      const res = await fetch(`/api/standards/${s.id}`);
      const data = await res.json();
      if (res.ok) setClauses(data.standard.clauses ?? []);
    } finally {
      setLoadingClauses(false);
    }
  }

  // Load clauses for the initially selected standard once on mount.
  useEffect(() => {
    if (standards[0]) void openStandard(standards[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function removeStandard(s: StandardItem) {
    if (!confirm(`${t("standards.confirmDelete")} "${s.code} — ${s.title}"`)) return;
    const res = await fetch(`/api/standards/${s.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <PageHeader
        title={t("nav.standards")}
        description={t("standards.desc")}
        actions={canManage ? <Button className="gap-1.5" onClick={() => setUploadOpen(true)}><Plus className="h-4 w-4" /> {t("standards.upload")}</Button> : undefined}
      />

      <Disclaimer className="mb-4" text={t("standards.copyrightNote")} />

      {standards.length === 0 ? (
        <EmptyState icon={Library} title={t("standards.empty.title")} description={t("standards.empty.desc")} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2">
            {standards.map((s) => (
              <Card key={s.id} className={selected?.id === s.id ? "border-primary" : ""}>
                <CardContent className="flex items-center gap-3 p-3">
                  <button onClick={() => openStandard(s)} className="min-w-0 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold">{formatStandardLabel(s.code, s.version)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {sourceBadge(s.sourceType, t)}
                      <span className="text-[11px] text-muted-foreground">{s.clauseCount} {t("standards.clauses")}</span>
                    </div>
                  </button>
                  {canManage && s.companyId && (
                    <button onClick={() => removeStandard(s)} className="text-muted-foreground hover:text-destructive" title={t("common.delete")}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            {!selected ? (
              <EmptyState icon={BookOpen} title={t("standards.selectTitle")} description={t("standards.selectDesc")} />
            ) : (
              <Card>
                <CardContent className="p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold">{formatStandardLabel(selected.code, selected.version)}</h2>
                    {sourceBadge(selected.sourceType, t)}
                    {selected.jurisdiction && <Badge variant="outline">{selected.jurisdiction}</Badge>}
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">{selected.title}</p>

                  {loadingClauses ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("standards.loadingClauses")}</div>
                  ) : clauses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("standards.noClauses")}</p>
                  ) : (
                    <div className="space-y-2">
                      {clauses.map((c) => (
                        <div key={c.id} className="rounded-lg border border-border">
                          <button
                            onClick={() => setActiveClause(activeClause?.id === c.id ? null : c)}
                            className="flex w-full items-center justify-between gap-2 p-3 text-left"
                          >
                            <span className="flex items-center gap-2 text-sm">
                              <Badge variant="outline">{c.clauseNo}</Badge>
                              <span className="font-medium">{c.title}</span>
                            </span>
                            <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${activeClause?.id === c.id ? "rotate-90" : ""}`} />
                          </button>
                          {activeClause?.id === c.id && (
                            <div className="space-y-3 border-t border-border p-3 text-sm">
                              <p className="text-muted-foreground">{c.summary}</p>
                              {c.applicability && (
                                <p className="text-xs"><span className="font-medium">{t("standards.applicability")}:</span> {c.applicability}</p>
                              )}
                              <ExpectationBlock icon={FileCheck2} label={t("standards.expectedDocs")} items={c.documentExpectations} />
                              <ExpectationBlock icon={BookOpen} label={t("standards.requiredEvidence")} items={c.evidenceExpectations} />
                              <ExpectationBlock icon={ShieldAlert} label={t("standards.relatedRisks")} items={c.riskRelevance} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onUploaded={() => { setUploadOpen(false); router.refresh(); }} />}
    </div>
  );
}


function ExpectationBlock({ icon: Icon, label, items }: { icon: typeof BookOpen; label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium"><Icon className="h-3.5 w-3.5" /> {label}</p>
      <ul className="ml-5 list-disc space-y-0.5 text-xs text-muted-foreground">
        {items.map((i, idx) => <li key={idx}>{i}</li>)}
      </ul>
    </div>
  );
}

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");
  const [sourceType, setSourceType] = useState("INTERNAL_PROCEDURE");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file) { setError(t("standards.chooseFile")); return; }
    if (!code.trim() || !title.trim()) { setError(t("standards.codeTitleRequired")); return; }
    setLoading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("code", code);
      fd.append("title", title);
      fd.append("version", version);
      fd.append("sourceType", sourceType);
      const res = await fetch("/api/standards/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("standards.uploadFailed")); return; }
      onUploaded();
    } catch { setError(t("standards.networkError")); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold"><Library className="h-4 w-4 text-accent" /> {t("standards.uploadTitle")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">{t("standards.code")}</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" placeholder="e.g. SOP-RM-01" />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-sm font-medium">{t("standards.version")}</label>
              <input value={version} onChange={(e) => setVersion(e.target.value)} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" placeholder="v1.0" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("standards.title")}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" placeholder="Risk Management Procedure" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("standards.sourceType")}</label>
            <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm">
              <option value="INTERNAL_PROCEDURE">{t("standards.source.INTERNAL_PROCEDURE")}</option>
              <option value="USER_UPLOADED_LICENSED">{t("standards.licensedCopy")}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("standards.document")}</label>
            <input type="file" accept=".pdf,.docx,.xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
          </div>
          <p className="text-xs text-muted-foreground">{t("standards.privateNote")}</p>
          {error && <p className="flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-4 w-4" /> {error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={loading}>{t("common.cancel")}</Button>
            <Button className="gap-1.5" onClick={submit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {t("standards.uploadBtn")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
