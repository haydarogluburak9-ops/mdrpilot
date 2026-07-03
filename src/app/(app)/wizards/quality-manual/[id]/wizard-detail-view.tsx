"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wand2, Loader2, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight, Save, ShieldCheck,
  FileText, Archive, BookOpen, ChevronRight, AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useI18n } from "@/components/providers/i18n-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Disclaimer } from "@/components/ui/disclaimer";
import { displayStandardCode } from "@/lib/domain/standards-catalog";
import { QM_STEPS, QM_TOTAL_STEPS, STANDARD_MODE_LABEL, type StandardMode } from "@/lib/wizards/quality-manual/steps";
import { mergeProcedureCodesFromQms } from "@/lib/wizards/quality-manual/procedure-codes";
import { mergeAnswersFromKysRegister } from "@/lib/wizards/quality-manual/kys-answer-sync";
import {
  type GapActionItem,
  type KysContentGap,
  formatGapActionItem,
  formatKysContentGap,
} from "@/lib/wizards/quality-manual/gap-messages";
import { binaryContentLang } from "@/lib/i18n/locales";
import { resolveDictionary } from "@/lib/i18n/resolve";

import { QmOrganizationStep } from "@/components/wizards/qm-organization-step";

interface GapShape {
  missingCriticalFields: { key: string; label: string; step: number }[];
  criticalGaps: string[];
  actionItems?: GapActionItem[];
  kysContentGaps?: KysContentGap[];
  inconsistencies: string[];
  warnings: string[];
  auditorNotes?: string[];
  auditorInconsistencies?: string[];
  applicableClauses: { standardCode: string; clauseNo: string; title: string }[];
  requiredProcedures: {
    label: string; fieldKey: string; present: boolean; critical: boolean;
    code?: string | null; inRegister?: boolean; contentReady?: boolean; status?: string | null;
  }[];
  scopeAutoApplyCodes?: string[];
  readyToGenerate: boolean;
  summary: string;
}
export interface SessionShape {
  id: string; status: string; standardMode: string; currentStep: number;
  composerDocumentId: string | null; answers: Record<string, unknown>; gapCheck: GapShape | null;
}
interface QmsDoc { code: string | null; title: string; standard: string; status: string; content: string | null }

function enrichWizardAnswers(
  answers: Record<string, unknown>,
  qmsDocs: QmsDoc[],
  step: number,
  locale: "tr" | "en",
): Record<string, unknown> {
  const withCodes = mergeProcedureCodesFromQms(answers, qmsDocs, true);
  return mergeAnswersFromKysRegister(withCodes, qmsDocs, step, true, locale);
}

export function WizardDetailView({
  session, qmsDocs, canEdit, canArchive,
}: { session: SessionShape; qmsDocs: QmsDoc[]; canEdit: boolean; canArchive: boolean }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const locale = binaryContentLang(lang);
  const initialAnswers = useMemo(
    () => enrichWizardAnswers(session.answers ?? {}, qmsDocs, session.currentStep ?? 1, locale),
    [session.answers, qmsDocs, session.currentStep, locale],
  );
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [step, setStep] = useState<number>(session.currentStep ?? 1);
  const [gap, setGap] = useState<GapShape | null>(session.gapCheck);
  const [status, setStatus] = useState<string>(session.status);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<"en" | "tr">(lang === "en" ? "en" : "tr");

  const locked = !canEdit || status === "GENERATED" || status === "ARCHIVED";
  const current = QM_STEPS.find((s) => s.step === step) ?? QM_STEPS[0];

  useEffect(() => {
    if (step < 3) return;
    setAnswers((a) => enrichWizardAnswers(a, qmsDocs, step, locale));
  }, [step, qmsDocs, locale]);

  const setField = (key: string, v: unknown) => setAnswers((a) => ({ ...a, [key]: v }));

  async function save(nextStep?: number): Promise<boolean> {
    if (locked) { if (nextStep) setStep(nextStep); return true; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/wizards/quality-manual/${session.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, currentStep: nextStep ?? step }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("qmWizard.saveFailed")); return false; }
      if (nextStep) setStep(nextStep);
      return true;
    } catch { setError(t("qmWizard.networkError")); return false; } finally { setSaving(false); }
  }

  async function applyKysScope() {
    if (!await save()) return;
    setBusy("apply-kys"); setError(null);
    try {
      const res = await fetch(`/api/wizards/quality-manual/${session.id}/apply-kys-scope`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: lang }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("qmWizard.applyScopeFailed")); return; }
      setGap(data.gap);
      setAnswers((a) => enrichWizardAnswers(a, qmsDocs, QM_TOTAL_STEPS, locale));
      setStatus("GAP_CHECKED");
      router.refresh();
    } catch { setError(t("qmWizard.networkError")); } finally { setBusy(null); }
  }

  async function runGapCheck() {
    if (!await save()) return;
    setBusy("gap"); setError(null);
    try {
      const res = await fetch(`/api/wizards/quality-manual/${session.id}/gap-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: lang }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("qmWizard.gapFailed")); return; }
      setGap(data.gap); setStatus("GAP_CHECKED");
    } catch { setError(t("qmWizard.networkError")); } finally { setBusy(null); }
  }

  async function generate() {
    if (!await save()) return;
    setBusy("generate"); setError(null);
    try {
      const res = await fetch(`/api/wizards/quality-manual/${session.id}/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("qmWizard.genFailed")); return; }
      router.push(`/composer/${data.composerDocumentId}`);
    } catch { setError(t("qmWizard.networkError")); } finally { setBusy(null); }
  }

  async function archive() {
    if (!confirm(t("qmWizard.confirmArchive"))) return;
    setBusy("archive");
    try {
      const res = await fetch(`/api/wizards/quality-manual/${session.id}/archive`, { method: "POST" });
      if (res.ok) { setStatus("ARCHIVED"); router.refresh(); }
    } finally { setBusy(null); }
  }

  const progress = Math.round((step / QM_TOTAL_STEPS) * 100);

  return (
    <div>
      <PageHeader
        title={`${STANDARD_MODE_LABEL[session.standardMode as StandardMode] ?? session.standardMode} ${t("qmWizard.qualityManual")}`}
        description={t("qmWizard.detailDesc")}
        actions={
          <div className="flex items-center gap-2">
            {session.composerDocumentId && (
              <Link href={`/composer/${session.composerDocumentId}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <FileText className="mr-1 h-4 w-4" /> {t("qmWizard.openDoc")}
              </Link>
            )}
            {canArchive && status !== "ARCHIVED" && (
              <Button variant="ghost" size="sm" onClick={archive} disabled={busy === "archive"}>
                <Archive className="mr-1 h-4 w-4" /> {t("composer.archive")}
              </Button>
            )}
          </div>
        }
      />

      {locked && (
        <Disclaimer className="mb-4" text={status === "GENERATED" ? t("qmWizard.lockedGenerated") : status === "ARCHIVED" ? t("qmWizard.lockedArchived") : t("qmWizard.lockedReadonly")} />
      )}

      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* Stepper */}
        <div className="space-y-1">
          {QM_STEPS.map((s) => (
            <button
              key={s.step}
              onClick={() => setStep(s.step)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${step === s.step ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${step > s.step ? "bg-primary text-primary-foreground" : "border border-border"}`}>
                {s.step}
              </span>
              <span className="truncate">{t(`qmStep.${s.key}.title`)}</span>
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="mb-1 flex items-center gap-2">
                <h2 className="text-base font-semibold">{current.step}. {t(`qmStep.${current.key}.title`)}</h2>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">{t(`qmStep.${current.key}.desc`)}</p>

              {current.kind === "review" ? (
                <ReviewStep
                  gap={gap}
                  busy={busy === "gap"}
                  applying={busy === "apply-kys"}
                  onRun={runGapCheck}
                  onApplyScope={applyKysScope}
                  locked={locked}
                />
              ) : current.kind === "generate" ? (
                <GenerateStep gap={gap} busy={busy === "generate"} onGenerate={generate} language={language} setLanguage={setLanguage} locked={locked} documentId={session.composerDocumentId} />
              ) : current.key === "organization" ? (
                <QmOrganizationStep
                  sessionId={session.id}
                  fields={current.fields}
                  answers={answers}
                  setAnswers={(patch) => setAnswers((a) => ({ ...a, ...patch }))}
                  locked={locked}
                  hasSopOrg={qmsDocs.some((d) => d.code === "SOP-ORG" && d.content?.trim())}
                />
              ) : (
                <div className="space-y-4">
                  {current.step >= 4 && (
                    <p className="text-xs text-muted-foreground">{t("qmWizard.processMapAutoFill")}</p>
                  )}
                  {current.step >= 6 && (
                    <p className="text-xs text-muted-foreground">{t("qmWizard.kysContentAutoFill")}</p>
                  )}
                  {current.fields.map((f) => (
                    <div key={f.key}>
                      <label className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                        {t(`qmField.${f.key}`)}{f.critical && <span className="text-destructive">*</span>}
                      </label>
                      {f.type === "textarea" ? (
                        <textarea
                          value={String(answers[f.key] ?? "")} onChange={(e) => setField(f.key, e.target.value)}
                          disabled={locked} rows={3} placeholder={f.placeholder}
                          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm disabled:opacity-60"
                        />
                      ) : f.type === "boolean" ? (
                        <select
                          value={String(answers[f.key] ?? "")} onChange={(e) => setField(f.key, e.target.value)}
                          disabled={locked} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm disabled:opacity-60"
                        >
                          <option value="">—</option>
                          <option value="yes">{t("common.yes")}</option>
                          <option value="no">{t("common.no")}</option>
                        </select>
                      ) : (
                        <input
                          value={String(answers[f.key] ?? "")} onChange={(e) => setField(f.key, e.target.value)}
                          disabled={locked} placeholder={f.placeholder}
                          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm disabled:opacity-60"
                        />
                      )}
                      {f.help && <p className="mt-1 text-xs text-muted-foreground">{t(`qmField.${f.key}.help`)}</p>}
                    </div>
                  ))}

                  {current.key === "procedures" && (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">{t("qmWizard.proceduresAutoFill")}</p>
                      <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">{t("qmWizard.existingQms")} ({qmsDocs.length})</p>
                      {qmsDocs.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t("qmWizard.noQms")}</p>
                      ) : (
                        <ul className="space-y-1 text-xs">
                          {qmsDocs.map((d, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <Badge variant="outline">{d.code ?? "—"}</Badge>
                              <span>{d.title}</span>
                              <span className="text-muted-foreground">· {d.standard} · {t(`status.${d.status}`)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    </div>
                  )}
                </div>
              )}

              {error && <p className="mt-4 flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-4 w-4" /> {error}</p>}

              {/* Nav buttons */}
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <Button variant="outline" size="sm" disabled={step <= 1} onClick={() => save(step - 1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> {t("qmWizard.back")}
                </Button>
                <div className="flex items-center gap-2">
                  {!locked && (
                    <Button variant="ghost" size="sm" onClick={() => save()} disabled={saving}>
                      {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} {t("composer.save")}
                    </Button>
                  )}
                  {step < QM_TOTAL_STEPS && (
                    <Button size="sm" onClick={() => save(step + 1)} disabled={saving}>
                      {t("qmWizard.saveContinue")} <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Clause references panel */}
          {gap && gap.applicableClauses.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium"><BookOpen className="h-4 w-4" /> {t("qmWizard.applicableClauses")}</p>
                <ul className="space-y-1 text-xs">
                  {gap.applicableClauses.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Badge variant="outline">{displayStandardCode(c.standardCode)} {c.clauseNo}</Badge>
                      <span className="text-muted-foreground">{c.title}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewStep({
  gap, busy, applying, onRun, onApplyScope, locked,
}: {
  gap: GapShape | null;
  busy: boolean;
  applying: boolean;
  onRun: () => void;
  onApplyScope: () => void;
  locked: boolean;
}) {
  const { t, lang } = useI18n();
  const dict = resolveDictionary(lang);
  const criticalItems = gap?.actionItems?.filter((a) => a.severity === "critical") ?? [];
  const criticalCount = criticalItems.length > 0 ? criticalItems.length : gap?.criticalGaps.length ?? 0;

  const formatAction = (item: GapActionItem) => {
    const params = { ...item.params };
    if (item.fieldKey) {
      params.label = dict[`qmField.${item.fieldKey}`] ?? params.label ?? item.fieldKey;
    }
    return formatGapActionItem({ ...item, params }, dict);
  };

  const inconsistencyItems =
    gap?.actionItems?.filter((a) => a.kind === "inconsistency" && a.severity !== "critical") ?? [];
  const warningItems =
    gap?.actionItems?.filter((a) => a.severity === "warning" && a.kind !== "inconsistency") ?? [];

  return (
    <div className="space-y-4">
      {!locked && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={onRun} disabled={busy || applying} className="gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} {t("qmWizard.runGapCheck")}
          </Button>
          {gap && (gap.scopeAutoApplyCodes?.length ?? 0) > 0 && (
            <Button
              variant="outline"
              onClick={onApplyScope}
              disabled={busy || applying}
              className="gap-1.5"
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {t("qmWizard.applyScopeToKys")}
            </Button>
          )}
        </div>
      )}
      {gap && (gap.scopeAutoApplyCodes?.length ?? 0) > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("qmWizard.applyScopeHint").replace("{codes}", (gap.scopeAutoApplyCodes ?? []).join(", "))}
        </p>
      )}
      {!gap ? (
        <p className="text-sm text-muted-foreground">{t("qmWizard.runGapHint")}</p>
      ) : (
        <div className="space-y-4">
          <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${gap.readyToGenerate ? "border-[hsl(var(--success))] text-[hsl(var(--success))]" : "border-[hsl(var(--warning))] text-[hsl(var(--warning))]"}`}>
            {gap.readyToGenerate ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {gap.readyToGenerate
              ? t("qmWizard.gapReadySummary").replace("{kys}", String(gap.kysContentGaps?.length ?? 0))
              : t("qmWizard.gapActionSummary").replace("{count}", String(criticalCount))}
          </div>

          {criticalItems.length > 0 ? (
            <GapList title={t("qmWizard.criticalGaps")} items={criticalItems.map(formatAction)} tone="destructive" />
          ) : (
            <GapList title={t("qmWizard.criticalGaps")} items={gap.criticalGaps} tone="destructive" />
          )}

          {gap.kysContentGaps && gap.kysContentGaps.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {t("qmWizard.kysContentGaps")} ({gap.kysContentGaps.length})
              </p>
              <p className="mb-2 text-xs text-muted-foreground">{t("qmWizard.kysContentHint")}</p>
              <ul className="space-y-1">
                {gap.kysContentGaps.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-[hsl(var(--warning))]" />
                    <span>{formatKysContentGap(g, dict)}</span>
                  </li>
                ))}
              </ul>
              <Link href="/qms" className="mt-2 inline-flex text-xs text-primary hover:underline">
                {t("qmWizard.openKys")}
              </Link>
            </div>
          )}

          <GapList
            title={t("qmWizard.inconsistencies")}
            items={
              inconsistencyItems.length > 0
                ? inconsistencyItems.map(formatAction)
                : gap.inconsistencies
            }
            tone="warning"
          />
          <GapList
            title={t("qmWizard.recommendations")}
            items={
              warningItems.length > 0
                ? warningItems.map(formatAction)
                : gap.warnings
            }
            tone="muted"
          />

          {(gap.auditorNotes?.length ?? 0) + (gap.auditorInconsistencies?.length ?? 0) > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">{t("qmWizard.auditorNotes")}</p>
              <p className="mb-2 text-xs text-muted-foreground">{t("qmWizard.auditorNotesHint")}</p>
              <GapList title="" items={[...(gap.auditorInconsistencies ?? []), ...(gap.auditorNotes ?? [])]} tone="muted" />
            </div>
          )}

          {gap.requiredProcedures.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">{t("qmWizard.requiredProcedures")}</p>
              <ul className="grid gap-1 sm:grid-cols-2">
                {gap.requiredProcedures.map((p) => {
                  const refOk = p.present;
                  const contentOk = p.contentReady ?? true;
                  const icon = refOk && contentOk
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                    : <AlertCircle className={`h-3.5 w-3.5 ${p.critical ? "text-destructive" : "text-[hsl(var(--warning))]"}`} />;
                  return (
                    <li key={p.fieldKey} className="flex items-center gap-2 text-xs">
                      {icon}
                      <span>
                        {t(`qmField.${p.fieldKey}`)}
                        {p.code ? ` (${p.code})` : ""}
                        {refOk && !contentOk ? ` — ${dict["qmGap.kys_empty_content"]}` : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {t("qmWizard.completeOrProceedA")} <span className="font-medium">[TO BE CONFIRMED]</span>.
          </p>
        </div>
      )}
    </div>
  );
}

function GenerateStep({
  gap, busy, onGenerate, language, setLanguage, locked, documentId,
}: { gap: GapShape | null; busy: boolean; onGenerate: () => void; language: "en" | "tr"; setLanguage: (l: "en" | "tr") => void; locked: boolean; documentId: string | null }) {
  const { t } = useI18n();
  if (documentId) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--success))] p-3 text-sm text-[hsl(var(--success))]">
          <CheckCircle2 className="h-4 w-4" /> {t("qmWizard.draftGenerated")}
        </div>
        <Link href={`/composer/${documentId}`} className={buttonVariants({ variant: "default", size: "sm" })}>
          <FileText className="mr-1 h-4 w-4" /> {t("qmWizard.openTheDoc")}
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {gap && !gap.readyToGenerate && (
        <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--warning))] p-3 text-sm text-[hsl(var(--warning))]">
          <AlertTriangle className="h-4 w-4" />
          {(gap.actionItems?.filter((a) => a.severity === "critical").length ?? gap.criticalGaps.length)} {t("qmWizard.gapsRemain")}
        </div>
      )}
      <div className="w-40">
        <label className="mb-1 block text-sm font-medium">{t("lang.switch")}</label>
        <select value={language} onChange={(e) => setLanguage(e.target.value as "en" | "tr")} disabled={locked} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm disabled:opacity-60">
          <option value="en">English</option>
          <option value="tr">Türkçe</option>
        </select>
      </div>
      {!locked && (
        <Button onClick={onGenerate} disabled={busy} className="gap-1.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} {t("qms.generateManual")}
        </Button>
      )}
    </div>
  );
}

function GapList({ title, items, tone }: { title: string; items: string[]; tone: "destructive" | "warning" | "muted" }) {
  if (!items.length) return null;
  const color = tone === "destructive" ? "hsl(var(--destructive))" : tone === "warning" ? "hsl(var(--warning))" : "hsl(var(--muted-foreground))";
  return (
    <div>
      {title ? (
        <p className="mb-1 text-xs font-medium text-muted-foreground">{title} ({items.length})</p>
      ) : null}
      <ul className="space-y-1">
        {items.map((g, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <ChevronRight className="mt-0.5 h-3 w-3 shrink-0" style={{ color }} />
            <span>{g}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
