"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wand2, Plus, Loader2, X, AlertCircle, FileText } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Disclaimer } from "@/components/ui/disclaimer";
import { QM_TOTAL_STEPS, STANDARD_MODE_LABEL, type StandardMode } from "@/lib/wizards/quality-manual/steps";

interface WizardItem {
  id: string; status: string; standardMode: string; currentStep: number;
  composerDocumentId: string | null; createdBy: string | null; updatedAt: string;
}

function StatusBadgeQm({ s }: { s: string }) {
  const { t } = useI18n();
  const map: Record<string, "muted" | "warning" | "success" | "secondary"> = {
    DRAFT: "muted", GAP_CHECKED: "warning", GENERATED: "success", ARCHIVED: "secondary",
  };
  return <Badge variant={map[s] ?? "muted"}>{t(`qmStatus.${s}`)}</Badge>;
}

export function WizardListView({ sessions, canCreate }: { sessions: WizardItem[]; canCreate: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title={t("nav.qmWizard")}
        description={t("qmWizard.desc")}
        actions={canCreate ? <Button className="gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t("qmWizard.new")}</Button> : undefined}
      />

      <Disclaimer className="mb-4" text={t("qmWizard.disclaimer")} />

      {sessions.length === 0 ? (
        <EmptyState icon={Wand2} title={t("qmWizard.empty.title")} description={t("qmWizard.empty.desc")} />
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Wand2 className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{STANDARD_MODE_LABEL[s.standardMode as StandardMode] ?? s.standardMode} {t("qmWizard.qualityManual")}</span>
                    <StatusBadgeQm s={s.status} />
                    <Badge variant="outline">{t("qmWizard.step")} {s.currentStep}/{QM_TOTAL_STEPS}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(s.updatedAt).toLocaleString()}{s.createdBy ? ` · ${s.createdBy}` : ""}
                  </p>
                </div>
                {s.composerDocumentId && (
                  <Link href={`/composer/${s.composerDocumentId}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    <FileText className="mr-1 h-4 w-4" /> {t("qmWizard.document")}
                  </Link>
                )}
                <Link href={`/wizards/quality-manual/${s.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  {s.status === "GENERATED" || s.status === "ARCHIVED" ? t("qmWizard.open") : t("qmWizard.continue")}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {open && <CreateModal onClose={() => setOpen(false)} onCreated={(id) => router.push(`/wizards/quality-manual/${id}`)} />}
    </div>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<StandardMode>("ISO_13485");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/wizards/quality-manual", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ standardMode: mode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("qmWizard.failedCreate")); return; }
      onCreated(data.session.id);
    } catch { setError(t("qmWizard.networkError")); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold"><Wand2 className="h-4 w-4 text-accent" /> {t("qmWizard.newModalTitle")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">{t("qmWizard.standardMode")}</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as StandardMode)} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm">
              <option value="ISO_13485">ISO 13485</option>
              <option value="ISO_9001">ISO 9001</option>
              <option value="BOTH">{t("qmWizard.both")}</option>
            </select>
          </div>
          {error && <p className="flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-4 w-4" /> {error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={loading}>{t("common.cancel")}</Button>
            <Button className="gap-1.5" onClick={submit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} {t("common.start")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
