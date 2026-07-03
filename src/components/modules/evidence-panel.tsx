"use client";

import { useState } from "react";
import { Link2, Plus, X, Sparkles, FileText, Loader2, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";

export type EvidenceTarget = "gspr" | "technical-file" | "risk";

export interface EvidenceFile {
  linkId: string;
  fileId: string;
  fileName: string;
  documentKind: string;
  note: string | null;
}

export interface EvidenceItem {
  id: string;
  label: string;
  sublabel?: string;
}

export interface FileOption {
  id: string;
  fileName: string;
  documentKind: string;
}

const BODY_KEY: Record<EvidenceTarget, string> = {
  gspr: "gsprItemId",
  "technical-file": "technicalFileSectionId",
  risk: "riskItemId",
};

export function EvidencePanel({
  target,
  items,
  evidence: initialEvidence,
  fileOptions,
  recommendations,
  canEdit,
}: {
  target: EvidenceTarget;
  items: EvidenceItem[];
  evidence: Record<string, EvidenceFile[]>;
  fileOptions: FileOption[];
  recommendations: Record<string, string[]>;
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const [evidence, setEvidence] = useState<Record<string, EvidenceFile[]>>(initialEvidence);
  const [modalItem, setModalItem] = useState<EvidenceItem | null>(null);

  async function unlink(itemId: string, linkId: string) {
    const prev = evidence;
    setEvidence((e) => ({ ...e, [itemId]: (e[itemId] ?? []).filter((x) => x.linkId !== linkId) }));
    const res = await fetch(`/api/evidence/${target}/${linkId}`, { method: "DELETE" });
    if (!res.ok) setEvidence(prev);
  }

  function onLinked(itemId: string, file: EvidenceFile) {
    setEvidence((e) => {
      const list = e[itemId] ?? [];
      if (list.some((x) => x.fileId === file.fileId)) return e;
      return { ...e, [itemId]: [...list, file] };
    });
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const linked = evidence[item.id] ?? [];
        const recommended = (recommendations[item.id] ?? []).filter((fid) => !linked.some((l) => l.fileId === fid));
        return (
          <div key={item.id} className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {item.label}{" "}
                  <Badge variant={linked.length ? "success" : "muted"}>
                    <Link2 className="h-3 w-3" /> {linked.length}
                  </Badge>
                  {recommended.length > 0 && (
                    <Badge variant="warning" className="ml-1"><Sparkles className="h-3 w-3" /> {recommended.length} AI</Badge>
                  )}
                </p>
                {item.sublabel && <p className="truncate text-xs text-muted-foreground">{item.sublabel}</p>}
              </div>
              {canEdit && (
                <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => setModalItem(item)}>
                  <Plus className="h-3.5 w-3.5" /> {t("evidence.link")}
                </Button>
              )}
            </div>

            {linked.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {linked.map((f) => (
                  <span key={f.linkId} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs">
                    <FileText className="h-3 w-3 text-primary" /> {f.fileName}
                    {canEdit && (
                      <button onClick={() => unlink(item.id, f.linkId)} className="ml-1 text-muted-foreground hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {modalItem && (
        <EvidenceLinkModal
          target={target}
          item={modalItem}
          fileOptions={fileOptions}
          recommendedFileIds={recommendations[modalItem.id] ?? []}
          alreadyLinked={(evidence[modalItem.id] ?? []).map((x) => x.fileId)}
          onClose={() => setModalItem(null)}
          onLinked={(file) => onLinked(modalItem.id, file)}
        />
      )}
    </div>
  );
}

export function EvidenceLinkModal({
  target,
  item,
  fileOptions,
  recommendedFileIds,
  alreadyLinked,
  onClose,
  onLinked,
}: {
  target: EvidenceTarget;
  item: EvidenceItem;
  fileOptions: FileOption[];
  recommendedFileIds: string[];
  alreadyLinked: string[];
  onClose: () => void;
  onLinked: (file: EvidenceFile) => void;
}) {
  const { t } = useI18n();
  const available = fileOptions.filter((f) => !alreadyLinked.includes(f.id));
  const sorted = [...available].sort((a, b) => {
    const ra = recommendedFileIds.includes(a.id) ? 0 : 1;
    const rb = recommendedFileIds.includes(b.id) ? 0 : 1;
    return ra - rb;
  });
  const [fileId, setFileId] = useState(sorted[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!fileId) { setError(t("evidence.selectFile")); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/evidence/${target}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [BODY_KEY[target]]: item.id, uploadedFileId: fileId, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("evidence.failedLink")); return; }
      const file = fileOptions.find((f) => f.id === fileId)!;
      onLinked({ linkId: data.link.id, fileId, fileName: file.fileName, documentKind: file.documentKind, note: note || null });
      onClose();
    } catch {
      setError(t("evidence.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("evidence.linkEvidence")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">{item.label}</p>

        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("evidence.noFiles")}</p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("evidence.file")}</label>
              <select value={fileId} onChange={(e) => setFileId(e.target.value)} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm">
                {sorted.map((f) => (
                  <option key={f.id} value={f.id}>
                    {recommendedFileIds.includes(f.id) ? "★ " : ""}{f.fileName} ({f.documentKind})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("evidence.note")}</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" placeholder={t("evidence.notePlaceholder")} />
            </div>
            {error && <p className="flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-4 w-4" /> {error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={onClose} disabled={loading}>{t("common.cancel")}</Button>
              <Button className="gap-1.5" onClick={submit} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} {t("evidence.link")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
