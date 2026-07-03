"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save, RefreshCw, Send, CheckCircle2, XCircle, Archive, Loader2,
  Sparkles, AlertTriangle, FileWarning, Link2, ListChecks, History, X, Eye, Pencil, GitBranch, Lock, GitCompare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DownloadSelectButton } from "@/components/ui/download-select-button";
import { Badge } from "@/components/ui/badge";
import { Disclaimer } from "@/components/ui/disclaimer";
import { MarkdownPreview } from "@/components/ui/markdown-preview";
import { useI18n } from "@/components/providers/i18n-provider";
import { COMPOSER_TYPE_LABEL } from "@/lib/composer/types";
import { diffLines, diffStats } from "@/lib/composer/diff";

interface VersionRow { id: string; version: number; changeSummary: string | null; createdAt: string; createdBy: string | null; }
interface VersionContent extends VersionRow { contentMarkdown: string; }
interface DocDetail {
  id: string; title: string; type: string; status: string; version: number; aiModel: string | null; aiConfidence: number;
  contentMarkdown: string; missingInformation: string[]; complianceGaps: string[]; consistencyWarnings: string[];
  evidenceUsed: string[]; recommendedNextActions: string[]; disclaimer: string | null;
  productName: string | null; createdBy: string | null; approvedBy: string | null; updatedAt: string; approvedAt: string | null;
  versions: VersionRow[];
}

// Mirror of the server-side transition map (kept in sync with workflow.ts).
const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["IN_REVIEW"], IN_REVIEW: ["APPROVED", "REJECTED"], REJECTED: ["DRAFT"], APPROVED: ["ARCHIVED"], ARCHIVED: [],
};
const can = (from: string, to: string) => TRANSITIONS[from]?.includes(to) ?? false;
const mutable = (s: string) => s === "DRAFT" || s === "REJECTED";

function statusBadge(s: string, t: (k: string) => string) {
  const map: Record<string, "muted" | "warning" | "success" | "destructive" | "secondary"> = {
    DRAFT: "muted", IN_REVIEW: "warning", APPROVED: "success", REJECTED: "destructive", ARCHIVED: "secondary",
  };
  return <Badge variant={map[s] ?? "muted"}>{t(`composerStatus.${s}`)}</Badge>;
}

export function ComposerEditor({ document: initial, canEdit, canApprove }: { document: DocDetail; canEdit: boolean; canApprove: boolean; }) {
  const { t } = useI18n();
  const router = useRouter();
  const [doc, setDoc] = useState<DocDetail>(initial);
  const [markdown, setMarkdown] = useState(initial.contentMarkdown);
  const [title, setTitle] = useState(initial.title);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const editable = canEdit && mutable(doc.status);
  const dirty = markdown !== doc.contentMarkdown || title !== doc.title;

  async function call(action: string, fn: () => Promise<Response>) {
    setBusy(action); setError(null);
    try {
      const res = await fn();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? `${t("composer.failed")} (${res.status})`); return null; }
      return data;
    } catch { setError(t("composer.networkError")); return null; } finally { setBusy(null); }
  }

  async function save() {
    const data = await call("save", () => fetch(`/api/composer/${doc.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, contentMarkdown: markdown }),
    }));
    if (data) router.refresh();
  }

  async function regenerate() {
    const data = await call("regenerate", () => fetch(`/api/composer/${doc.id}/regenerate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }));
    if (data?.document) { setMarkdown(data.document.contentMarkdown); router.refresh(); }
  }

  async function transition(path: string, label: string) {
    const data = await call(label, () => fetch(`/api/composer/${doc.id}/${path}`, { method: "POST" }));
    if (data?.document) { setDoc((d) => ({ ...d, status: data.document.status })); router.refresh(); }
  }

  async function newRevision() {
    const data = await call("revision", () => fetch(`/api/composer/${doc.id}/new-revision`, { method: "POST" }));
    if (data?.document) router.push(`/composer/${data.document.id}`);
  }

  function exportAs(format: "docx" | "pdf", language: "tr" | "en") {
    setBusy(`export-${format}`); setError(null);
    fetch(`/api/composer/${doc.id}/export`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ format, language }) })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { setError(data.error ?? t("composer.exportFailed")); return; }
        const a = window.document.createElement("a");
        a.href = data.downloadUrl; a.rel = "noopener";
        window.document.body.appendChild(a); a.click(); a.remove();
      })
      .catch(() => setError(t("composer.networkError")))
      .finally(() => setBusy(null));
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-bold">{doc.title}</h1>
            {statusBadge(doc.status, t)}
            <Badge variant="outline">v{doc.version}</Badge>
            <Badge variant="secondary"><Sparkles className="h-3 w-3" /> AI {Math.round(doc.aiConfidence * 100)}%</Badge>
            {doc.status === "APPROVED" && <Badge variant="success"><Lock className="h-3 w-3" /> {t("composer.locked")}</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {COMPOSER_TYPE_LABEL[doc.type as keyof typeof COMPOSER_TYPE_LABEL] ?? doc.type}
            {doc.productName ? ` · ${doc.productName}` : ""}{doc.createdBy ? ` · ${doc.createdBy}` : ""}
            {doc.status === "APPROVED" && doc.approvedBy ? ` · ${t("composer.approvedBy")} ${doc.approvedBy}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {editable && <Button size="sm" className="gap-1" onClick={save} disabled={!dirty || !!busy}>{busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {t("composer.save")}</Button>}
          {editable && <Button size="sm" variant="outline" className="gap-1" onClick={regenerate} disabled={!!busy}>{busy === "regenerate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} {t("composer.regenerate")}</Button>}
          {canEdit && can(doc.status, "IN_REVIEW") && <Button size="sm" variant="outline" className="gap-1" onClick={() => transition("submit-review", "submit")} disabled={!!busy}><Send className="h-3.5 w-3.5" /> {t("composer.submit")}</Button>}
          {canApprove && can(doc.status, "APPROVED") && <Button size="sm" variant="outline" className="gap-1 text-success" onClick={() => transition("approve", "approve")} disabled={!!busy}><CheckCircle2 className="h-3.5 w-3.5" /> {t("composer.approve")}</Button>}
          {canApprove && can(doc.status, "REJECTED") && <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => transition("reject", "reject")} disabled={!!busy}><XCircle className="h-3.5 w-3.5" /> {t("composer.reject")}</Button>}
          {canApprove && can(doc.status, "ARCHIVED") && <Button size="sm" variant="outline" className="gap-1" onClick={() => transition("archive", "archive")} disabled={!!busy}><Archive className="h-3.5 w-3.5" /> {t("composer.archive")}</Button>}
          {canEdit && doc.status === "APPROVED" && <Button size="sm" className="gap-1" onClick={newRevision} disabled={!!busy}>{busy === "revision" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitBranch className="h-3.5 w-3.5" />} {t("composer.newRevision")}</Button>}
          <DownloadSelectButton
            disabled={!!busy}
            onDownload={({ lang, format }) => exportAs(format as "docx" | "pdf", lang as "tr" | "en")}
          />
          <Button size="sm" variant="ghost" className="gap-1" onClick={() => setShowHistory(true)}><History className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {error && <p className="mb-3 flex items-center gap-1 text-sm text-destructive"><AlertTriangle className="h-4 w-4" /> {error}</p>}
      {!editable && canEdit && doc.status === "APPROVED" && (
        <p className="mb-3 flex items-center gap-1 text-sm text-muted-foreground"><Lock className="h-4 w-4" /> {t("composer.lockedNote")}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div className="inline-flex rounded-lg border border-border p-0.5">
                <button onClick={() => setTab("edit")} className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium ${tab === "edit" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><Pencil className="h-3.5 w-3.5" /> {t("composer.edit")}</button>
                <button onClick={() => setTab("preview")} className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium ${tab === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><Eye className="h-3.5 w-3.5" /> {t("composer.preview")}</button>
              </div>
              {editable && dirty && <span className="text-xs text-warning-foreground">{t("composer.unsaved")}</span>}
            </CardHeader>
            <CardContent>
              {tab === "edit" ? (
                <>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!editable} className="mb-3 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm font-medium disabled:opacity-70" />
                  <textarea
                    value={markdown}
                    onChange={(e) => setMarkdown(e.target.value)}
                    disabled={!editable}
                    spellCheck={false}
                    className="h-[60vh] w-full resize-none rounded-lg border border-input bg-card px-3 py-2 font-mono text-xs leading-relaxed disabled:opacity-70"
                  />
                </>
              ) : (
                <div className="h-[calc(60vh+44px)] overflow-y-auto rounded-lg border border-border bg-background px-4 py-3">
                  <MarkdownPreview markdown={markdown} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Disclaimer text={doc.disclaimer ?? t("composer.draftDisclaimer")} />
          <AnalysisList icon={FileWarning} title={t("composer.missingInfo")} items={doc.missingInformation} tone="warning" />
          <AnalysisList icon={AlertTriangle} title={t("composer.complianceGaps")} items={doc.complianceGaps} tone="destructive" />
          <AnalysisList icon={AlertTriangle} title={t("composer.consistencyWarnings")} items={doc.consistencyWarnings} tone="warning" />
          <AnalysisList icon={Link2} title={t("composer.evidenceUsed")} items={doc.evidenceUsed} tone="muted" />
          <AnalysisList icon={ListChecks} title={t("composer.nextActions")} items={doc.recommendedNextActions} tone="muted" />
        </div>
      </div>

      {showHistory && <HistoryDrawer docId={doc.id} versions={doc.versions} onClose={() => setShowHistory(false)} />}
    </div>
  );
}

function HistoryDrawer({ docId, versions, onClose }: { docId: string; versions: VersionRow[]; onClose: () => void; }) {
  const { t } = useI18n();
  const [contents, setContents] = useState<VersionContent[] | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadAndCompare() {
    setLoading(true);
    try {
      const res = await fetch(`/api/composer/${docId}/versions`);
      const data = await res.json();
      const vs: VersionContent[] = data.versions ?? [];
      setContents(vs);
      if (vs.length >= 2) { setRight(vs[0].version); setLeft(vs[1].version); }
      else if (vs.length === 1) { setRight(vs[0].version); setLeft(vs[0].version); }
    } finally { setLoading(false); }
  }

  const lc = contents?.find((v) => v.version === left);
  const rc = contents?.find((v) => v.version === right);
  const ops = lc && rc ? diffLines(lc.contentMarkdown, rc.contentMarkdown) : null;
  const stats = ops ? diffStats(ops) : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("composer.versionHistory")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        {!contents ? (
          <>
            <Button size="sm" variant="outline" className="mb-4 gap-1" onClick={loadAndCompare} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitCompare className="h-3.5 w-3.5" />} {t("composer.compareVersions")}
            </Button>
            <div className="space-y-2">
              {versions.map((v) => (
                <div key={v.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2"><Badge variant="outline">v{v.version}</Badge><span className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</span></div>
                  <p className="mt-1 text-sm">{v.changeSummary ?? "—"}</p>
                  {v.createdBy && <p className="text-xs text-muted-foreground">{v.createdBy}</p>}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2">
              <select value={left ?? ""} onChange={(e) => setLeft(Number(e.target.value))} className="rounded-lg border border-input bg-card px-2 py-1 text-xs">
                {contents.map((v) => <option key={v.id} value={v.version}>v{v.version} ({t("composer.old")})</option>)}
              </select>
              <GitCompare className="h-4 w-4 text-muted-foreground" />
              <select value={right ?? ""} onChange={(e) => setRight(Number(e.target.value))} className="rounded-lg border border-input bg-card px-2 py-1 text-xs">
                {contents.map((v) => <option key={v.id} value={v.version}>v{v.version} ({t("composer.new")})</option>)}
              </select>
              {stats && <span className="ml-auto text-xs"><span className="text-success">+{stats.added}</span> <span className="text-destructive">-{stats.removed}</span></span>}
            </div>
            <div className="rounded-lg border border-border bg-background p-3 font-mono text-xs leading-relaxed">
              {ops?.map((op, i) => (
                <div key={i} className={op.type === "add" ? "bg-success/10 text-success" : op.type === "del" ? "bg-destructive/10 text-destructive" : "text-muted-foreground"}>
                  <span className="select-none opacity-60">{op.type === "add" ? "+ " : op.type === "del" ? "- " : "  "}</span>{op.text || "\u00A0"}
                </div>
              ))}
            </div>
            <Button size="sm" variant="ghost" className="mt-3" onClick={() => setContents(null)}>{t("composer.backToList")}</Button>
          </>
        )}
      </div>
    </div>
  );
}

function AnalysisList({ icon: Icon, title, items, tone }: { icon: typeof FileWarning; title: string; items: string[]; tone: "warning" | "destructive" | "muted"; }) {
  const { t } = useI18n();
  const color = tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-warning-foreground" : "text-muted-foreground";
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Icon className={`h-4 w-4 ${color}`} /> {title} <span className="text-xs text-muted-foreground">({items.length})</span></CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("composer.noneIdentified")}</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {items.map((it, i) => <li key={i} className="flex gap-1.5"><span className={color}>•</span><span>{it}</span></li>)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
