"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import {
  WorkflowStatusSelect,
  OPERATIONAL_STATUS_TONE_CLASS,
} from "@/components/ui/status-badge";
import { OperationalStatusColumns } from "@/components/operational/operational-status-columns";
import { InternalAuditChecklistForm } from "@/components/operational/internal-audit-checklist-form";
import {
  emptyInternalAuditChecklistData,
  parseInternalAuditChecklistMarkdown,
  serializeInternalAuditChecklistMarkdown,
  type InternalAuditChecklistData,
} from "@/lib/operational/internal-audit-checklist-model";
import { OPERATIONAL_MODULES } from "@/lib/operational/modules";
import {
  INTERNAL_AUDIT_FORM_CODES,
  type InternalAuditDocKind,
  type InternalAuditCycleDto,
} from "@/lib/operational/internal-audit-codes";
import { initGenericFormContent } from "@/lib/operational/generic-form-model";
import { inferQmsLayerFromCode } from "@/lib/qms/kys-structure";
import { procedureChildHintPlaceholder } from "@/lib/qms/procedure-hint-examples";
import { InternalAuditCapaActions } from "@/components/operational/internal-audit-capa-actions";
import { cn } from "@/lib/utils";

const IA_DEF = OPERATIONAL_MODULES["internal-audit"];
const STATUS_LABEL_PREFIX = "operational.recordStatus";

function docCode(kind: InternalAuditDocKind): string {
  if (kind === "plan") return INTERNAL_AUDIT_FORM_CODES.plan;
  if (kind === "checklist") return INTERNAL_AUDIT_FORM_CODES.checklist;
  return INTERNAL_AUDIT_FORM_CODES.report;
}

function docLabelKey(kind: InternalAuditDocKind): string {
  if (kind === "plan") return "operational.internalAudit.plan";
  if (kind === "checklist") return "operational.internalAudit.checklist";
  return "operational.internalAudit.report";
}

function cycleDocContent(cycle: InternalAuditCycleDto, kind: InternalAuditDocKind): string {
  if (kind === "plan") return (cycle.planContent ?? "").trim();
  if (kind === "checklist") return (cycle.checklistContent ?? "").trim();
  return (cycle.reportContent ?? "").trim();
}

function InternalAuditDocPanel({
  cycle,
  kind,
  canEdit,
  onSaved,
  defaultExpanded,
}: {
  cycle: InternalAuditCycleDto;
  kind: InternalAuditDocKind;
  canEdit: boolean;
  onSaved?: () => void;
  defaultExpanded?: boolean;
}) {
  const { t, lang } = useI18n();
  const locale = lang === "en" ? "en" : "tr";
  const code = docCode(kind);
  const initial = cycleDocContent(cycle, kind);
  const isChecklist = kind === "checklist";
  const defaultContent =
    initial ||
    (isChecklist
      ? serializeInternalAuditChecklistMarkdown(
          emptyInternalAuditChecklistData(locale, String(cycle.year)),
          locale,
        )
      : initGenericFormContent(code, locale, String(cycle.year)));

  const [open, setOpen] = useState(defaultExpanded ?? !initial);
  const [content, setContent] = useState(defaultContent);
  const [checklistData, setChecklistData] = useState<InternalAuditChecklistData>(() =>
    isChecklist
      ? parseInternalAuditChecklistMarkdown(defaultContent, locale, String(cycle.year))
      : emptyInternalAuditChecklistData(locale, String(cycle.year)),
  );
  const [hint, setHint] = useState(`${cycle.year} iç tetkik`);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serializedChecklist = isChecklist
    ? serializeInternalAuditChecklistMarkdown(checklistData, locale)
    : "";
  const dirty = isChecklist
    ? serializedChecklist.trim() !== initial
    : content.trim() !== initial;
  const hasContent = Boolean(initial);

  useEffect(() => {
    const next = cycleDocContent(cycle, kind);
    if (isChecklist) {
      const parsed = parseInternalAuditChecklistMarkdown(
        next || serializeInternalAuditChecklistMarkdown(
          emptyInternalAuditChecklistData(locale, String(cycle.year)),
          locale,
        ),
        locale,
        String(cycle.year),
      );
      setChecklistData(parsed);
      setContent(serializeInternalAuditChecklistMarkdown(parsed, locale));
    } else {
      setContent(next || initGenericFormContent(code, locale, String(cycle.year)));
    }
    setOpen(defaultExpanded ?? !next);
  }, [
    cycle.id,
    cycle.planContent,
    cycle.checklistContent,
    cycle.reportContent,
    kind,
    code,
    locale,
    cycle.year,
    defaultExpanded,
    isChecklist,
  ]);

  async function save() {
    const trimmed = isChecklist ? serializedChecklist.trim() : content.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    setSaveOk(false);
    try {
      const body: Record<string, string> = { locale };
      if (kind === "plan") body.planContent = trimmed;
      else if (kind === "checklist") body.checklistContent = trimmed;
      else body.reportContent = trimmed;

      const res = await fetch(`/api/operational/internal-audit/${cycle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("qms.edit.saveError"));
        return;
      }
      setSaveOk(true);
      onSaved?.();
    } catch {
      setError(t("qms.edit.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    setSaveOk(false);
    try {
      const res = await fetch(`/api/operational/internal-audit/${cycle.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          locale,
          userContext: hint.trim() || `${cycle.year} iç tetkik`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("qms.generate.error"));
        return;
      }
      if (typeof data.content === "string" && data.content.trim()) {
        if (isChecklist) {
          const parsed = parseInternalAuditChecklistMarkdown(data.content, locale, String(cycle.year));
          setChecklistData(parsed);
          setContent(serializeInternalAuditChecklistMarkdown(parsed, locale));
        } else {
          setContent(data.content);
        }
      }
      onSaved?.();
    } catch {
      setError(t("qms.generate.error"));
    } finally {
      setGenerating(false);
    }
  }

  const hintPlaceholder = procedureChildHintPlaceholder(
    IA_DEF.sopCode,
    inferQmsLayerFromCode(code),
    code,
    lang,
  );

  return (
    <div className="rounded-lg border border-border/80 bg-muted/20">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          type="button"
          className="flex items-center gap-1 text-sm font-medium text-foreground"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {t(docLabelKey(kind))}
        </button>
        <Badge variant="outline" className="text-xs font-normal">{code}</Badge>
        <Badge
          variant="secondary"
          className={cn(
            "text-xs",
            hasContent ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200" : "",
          )}
        >
          {hasContent ? t("operational.internalAudit.hasContent") : t("operational.internalAudit.noContent")}
        </Badge>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8"
                onClick={generate}
                disabled={generating || saving}
              >
                {generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {t("qms.generate.btn")}
              </Button>
              <Button
                size="sm"
                className="gap-1.5 h-8"
                onClick={save}
                disabled={saving || generating || !dirty}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {t("qms.edit.save")}
              </Button>
            </>
          )}
        </div>
      </div>
      {open && (
        <div className="border-t border-border/80 p-3 space-y-3">
          {canEdit && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("qms.procedure.childHintLabel")}</label>
              <textarea
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder={hintPlaceholder}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={generating}
              />
            </div>
          )}
          {isChecklist ? (
            <InternalAuditChecklistForm
              data={checklistData}
              disabled={!canEdit || generating}
              onChange={(next) => {
                setChecklistData(next);
                setContent(serializeInternalAuditChecklistMarkdown(next, locale));
                setSaveOk(false);
              }}
            />
          ) : (
            <textarea
              className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setSaveOk(false);
              }}
              disabled={!canEdit || generating}
            />
          )}
          {generating && <AiAnalyzingHint />}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {saveOk && <p className="text-sm text-emerald-600">{t("qms.edit.saveOk")}</p>}
        </div>
      )}
    </div>
  );
}

function InternalAuditCycleCard({
  cycle,
  canEdit,
  onRefresh,
  onDelete,
  onStatusChange,
  expandDocs,
}: {
  cycle: InternalAuditCycleDto;
  canEdit: boolean;
  onRefresh: () => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  expandDocs?: boolean;
}) {
  const { t } = useI18n();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!canEdit) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/operational/internal-audit/${cycle.id}`, { method: "DELETE" });
      if (res.ok) onDelete(cycle.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{cycle.title}</h3>
            <p className="text-sm text-muted-foreground">
              {t("operational.internalAudit.yearLabel")}: {cycle.year}
              {cycle.ownerName ? ` · ${cycle.ownerName}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <WorkflowStatusSelect
              value={cycle.status}
              options={IA_DEF.statusOrder}
              labelPrefix={STATUS_LABEL_PREFIX}
              toneMap={OPERATIONAL_STATUS_TONE_CLASS}
              disabled={!canEdit}
              onChange={(status) => onStatusChange(cycle.id, status)}
            />
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {(["plan", "checklist", "report"] as InternalAuditDocKind[]).map((kind) => (
            <InternalAuditDocPanel
              key={kind}
              cycle={cycle}
              kind={kind}
              canEdit={canEdit}
              onSaved={onRefresh}
              defaultExpanded={expandDocs}
            />
          ))}
        </div>

        <InternalAuditCapaActions cycle={cycle} canEdit={canEdit} />
      </CardContent>
    </Card>
  );
}

export function InternalAuditView({
  cycles: initialCycles,
  canEdit,
}: {
  cycles: InternalAuditCycleDto[];
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [cycles, setCycles] = useState(initialCycles);
  const [creating, setCreating] = useState(false);
  const [yearInput, setYearInput] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusStatus, setFocusStatus] = useState<string | null>(null);
  const [expandedCycleId, setExpandedCycleId] = useState<string | null>(null);

  useEffect(() => {
    setCycles(initialCycles);
  }, [initialCycles]);

  async function refreshCycles() {
    const res = await fetch("/api/operational/internal-audit");
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.cycles)) setCycles(data.cycles);
    router.refresh();
  }

  async function createCycle() {
    const year = Number.parseInt(yearInput.trim(), 10);
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      setError(t("operational.internalAudit.yearRequired"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/operational/internal-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("operational.internalAudit.createError"));
        return;
      }
      const cycle = data.cycle as InternalAuditCycleDto;
      setCycles((prev) => {
        const rest = prev.filter((c) => c.id !== cycle.id);
        return [cycle, ...rest].sort((a, b) => b.year - a.year);
      });
      setCreating(false);
      setFocusStatus("OPEN");
      setExpandedCycleId(cycle.id);
    } catch {
      setError(t("operational.internalAudit.createError"));
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/operational/internal-audit/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setCycles((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: status as InternalAuditCycleDto["status"] } : c,
        ),
      );
      setFocusStatus(status);
    }
  }

  function handleDelete(id: string) {
    setCycles((prev) => prev.filter((c) => c.id !== id));
    if (expandedCycleId === id) setExpandedCycleId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t(IA_DEF.labelKey)} description={t(IA_DEF.descKey)} />

      {canEdit && (
        <Card>
          <CardContent className="p-4">
            {creating ? (
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-sm font-medium">{t("operational.internalAudit.yearLabel")}</label>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    className="mt-1 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={yearInput}
                    onChange={(e) => setYearInput(e.target.value)}
                  />
                </div>
                <Button onClick={createCycle} disabled={loading} className="gap-1.5">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {t("operational.internalAudit.newYear")}
                </Button>
                <Button variant="ghost" onClick={() => setCreating(false)}>
                  {t("common.cancel")}
                </Button>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            ) : (
              <Button onClick={() => setCreating(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                {t("operational.internalAudit.newYear")}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {cycles.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1">{t("operational.internalAudit.empty")}</p>
      ) : (
        <OperationalStatusColumns
          items={cycles}
          statusOrder={IA_DEF.statusOrder}
          labelPrefix={STATUS_LABEL_PREFIX}
          toneMap={OPERATIONAL_STATUS_TONE_CLASS}
          getStatus={(c) => c.status}
          focusStatus={focusStatus}
          renderItem={(cycle) => (
            <InternalAuditCycleCard
              key={cycle.id}
              cycle={cycle}
              canEdit={canEdit}
              onRefresh={refreshCycles}
              onDelete={handleDelete}
              onStatusChange={updateStatus}
              expandDocs={expandedCycleId === cycle.id}
            />
          )}
        />
      )}
    </div>
  );
}
