"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Plus, Loader2, AlertCircle, ChevronRight, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useI18n } from "@/components/providers/i18n-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Disclaimer } from "@/components/ui/disclaimer";
import { AUDIT_STANDARDS, ASSESSMENT_TYPES, type AssessmentType, type AuditStandardScope } from "@/lib/audit-sim/types";
import type { ProductLite } from "@/lib/data/queries";

interface SessionRow {
  id: string; standard: string; assessmentType: string; status: string; score: number | null;
  productName: string | null; questionCount: number; answerCount: number; findingCount: number;
  createdAt: string; completedAt: string | null;
}

const STATUS_BADGE: Record<string, "default" | "success" | "muted"> = {
  IN_PROGRESS: "default", COMPLETED: "success", ARCHIVED: "muted",
};

export function AuditListView({ products, canStart, canDelete }: { products: ProductLite[]; canStart: boolean; canDelete: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/audit-simulator");
      const data = await res.json();
      if (res.ok) setSessions(data.sessions ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  async function deleteSession(id: string) {
    if (!window.confirm(t("auditSim.deleteConfirm"))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/audit-simulator/${id}`, { method: "DELETE" });
      if (res.ok) setSessions((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title={t("auditSim.title")}
        description={t("auditSim.desc")}
        actions={canStart ? <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t("auditSim.new")}</Button> : undefined}
      />
      <Disclaimer />

      <div className="mt-4">
        {loading ? (
          <Card><CardContent className="flex items-center justify-center gap-2 p-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> {t("auditSim.loading")}</CardContent></Card>
        ) : sessions.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title={t("auditSim.empty.title")} description={t("auditSim.empty.desc")} />
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <Card key={s.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => router.push(`/audit-simulator/${s.id}`)}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.standard.replace("_", " ")} · {s.assessmentType}</span>
                      <Badge variant={STATUS_BADGE[s.status] ?? "muted"}>{t(`auditStatus.${s.status}`)}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {s.productName ?? t("auditSim.companyWide")} · {s.answerCount}/{s.questionCount} {t("auditSim.answered")} · {s.findingCount} {t("auditSim.findings")}
                    </p>
                  </div>
                  {s.score != null && <span className="text-lg font-bold">{s.score}</span>}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive"
                      disabled={deletingId === s.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteSession(s.id);
                      }}
                      aria-label={t("common.delete")}
                    >
                      {deletingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {open && <CreateModal products={products} onClose={() => setOpen(false)} />}
    </div>
  );
}

function CreateModal({ products, onClose }: { products: ProductLite[]; onClose: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [standard, setStandard] = useState<AuditStandardScope>("ISO_13485");
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("STANDARD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit-simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: productId || undefined, standard, assessmentType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start audit");
      router.push(`/audit-simulator/${data.session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-lg font-semibold">{t("auditSim.modalTitle")}</h2>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("auditSim.productOptional")}</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <option value="">{t("auditSim.companyWide")}</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("auditSim.standard")}</label>
            <select value={standard} onChange={(e) => setStandard(e.target.value as AuditStandardScope)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm">
              {AUDIT_STANDARDS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("auditSim.assessmentType")}</label>
            <select value={assessmentType} onChange={(e) => setAssessmentType(e.target.value as AssessmentType)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm">
              {ASSESSMENT_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          {error && <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button onClick={start} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />} {t("common.start")}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
