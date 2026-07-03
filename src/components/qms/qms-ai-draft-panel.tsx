"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Loader2, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Disclaimer } from "@/components/ui/disclaimer";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { QmsDownloadButton } from "@/components/qms/qms-download-button";
import { useI18n } from "@/components/providers/i18n-provider";
import type { QmsDoc } from "@/lib/data/queries";
import { qmsDocTitle } from "@/lib/i18n/qms-doc-titles";
import { LANGS, binaryContentLang, type Lang } from "@/lib/i18n/locales";
import { isQmsContentLocked } from "@/lib/qms/content-lock";
import type { DocStatus } from "@/lib/domain/types";
import { inferQmsLayerFromCode, type QmsDocumentLayer } from "@/lib/qms/kys-structure";
import { procedureChildHintPlaceholder } from "@/lib/qms/procedure-hint-examples";
import { CapaStructuredForm } from "@/components/operational/capa-structured-form";
import {
  ComplaintCh01StructuredForm,
  ComplaintCh02StructuredForm,
} from "@/components/operational/complaint-structured-form";
import {
  parseCapaFormMarkdown,
  serializeCapaFormMarkdown,
  type CapaFormData,
} from "@/lib/operational/capa-form-model";
import {
  parseComplaintCh01Markdown,
  parseComplaintCh02Markdown,
  serializeComplaintCh01Markdown,
  serializeComplaintCh02Markdown,
  type ComplaintCh01FormData,
  type ComplaintCh02FormData,
} from "@/lib/operational/complaint-form-model";
import { GenericStructuredForm } from "@/components/operational/generic-structured-form";
import {
  getModuleByFormCode,
  OPERATIONAL_MODULES,
  type OperationalLinkModule,
  type OperationalModuleSlug,
} from "@/lib/operational/modules";
import { initGenericFormContent } from "@/lib/operational/generic-form-model";
import {
  INTERNAL_AUDIT_FORM_CODES,
  internalAuditDocKindFromCode,
} from "@/lib/operational/internal-audit-codes";

export function QmsAiDraftPanel({
  doc,
  companyName,
  initialHint,
  linkedOperationalRecord,
  onOperationalLinked,
  nextFormCode,
  onOpenNextForm,
}: {
  doc: QmsDoc;
  companyName: string;
  initialHint?: string;
  linkedOperationalRecord?: { module: OperationalLinkModule; id: string };
  onOperationalLinked?: (link: { module: OperationalLinkModule; id: string }) => void;
  nextFormCode?: string | null;
  onOpenNextForm?: () => void;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [userContext, setUserContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [syncInfo, setSyncInfo] = useState<{ module: OperationalLinkModule; created: boolean } | null>(null);
  const [aiLocale, setAiLocale] = useState<Lang>(lang);
  const [exportFormat, setExportFormat] = useState<"docx" | "pdf">("docx");
  const contentLocked = isQmsContentLocked(doc.status as DocStatus);
  const [capaData, setCapaData] = useState<CapaFormData | null>(() => {
    const code = doc.code?.trim().toUpperCase() ?? "";
    if (code === "FORM-CAPA-01") return parseCapaFormMarkdown(doc.content ?? "", lang === "en" ? "en" : "tr");
    return null;
  });
  const [complaintCh01Data, setComplaintCh01Data] = useState<ComplaintCh01FormData | null>(() => {
    const code = doc.code?.trim().toUpperCase() ?? "";
    if (code === "FORM-CH-01") return parseComplaintCh01Markdown(doc.content ?? "", lang === "en" ? "en" : "tr");
    return null;
  });
  const [complaintCh02Data, setComplaintCh02Data] = useState<ComplaintCh02FormData | null>(() => {
    const code = doc.code?.trim().toUpperCase() ?? "";
    if (code === "FORM-CH-02") return parseComplaintCh02Markdown(doc.content ?? "", lang === "en" ? "en" : "tr");
    return null;
  });

  const formCode = doc.code?.trim().toUpperCase() ?? "";
  const iaKind = internalAuditDocKindFromCode(formCode);
  const isInternalAuditDoc = iaKind !== null;
  const genericModuleDef =
    formCode === INTERNAL_AUDIT_FORM_CODES.checklist
      ? OPERATIONAL_MODULES["internal-audit"]
      : getModuleByFormCode(formCode);
  const isCapaForm = formCode === "FORM-CAPA-01";
  const isCh01Form = formCode === "FORM-CH-01";
  const isCh02Form = formCode === "FORM-CH-02";
  const isGenericOperationalForm = Boolean(genericModuleDef);
  const effectiveOperationalLink =
    linkedOperationalRecord &&
    ((isCh01Form || isCh02Form) && linkedOperationalRecord.module === "complaint"
      ? linkedOperationalRecord
      : isCapaForm && linkedOperationalRecord.module === "capa"
        ? linkedOperationalRecord
        : isInternalAuditDoc && linkedOperationalRecord.module === "internal-audit"
          ? linkedOperationalRecord
          : isGenericOperationalForm &&
              genericModuleDef &&
              linkedOperationalRecord.module === genericModuleDef.slug
            ? linkedOperationalRecord
            : undefined);
  const locale = binaryContentLang(lang);
  const isOperationalForm =
    isCapaForm ||
    isCh01Form ||
    isCh02Form ||
    isInternalAuditDoc ||
    isGenericOperationalForm;
  const displayTitle = qmsDocTitle(doc.code, doc.title, lang);

  function applySync(data: { sync?: { synced?: boolean; module?: string; id?: string; created?: boolean } }) {
    const sync = data.sync;
    if (sync?.synced && sync.module && sync.id) {
      const link = { module: sync.module as OperationalLinkModule, id: sync.id };
      setSyncInfo({ module: link.module, created: Boolean(sync.created) });
      onOperationalLinked?.(link);
    } else {
      setSyncInfo(null);
    }
  }

  function operationalApiBase(module: OperationalLinkModule): string {
    if (module === "capa") return "/api/capa";
    if (module === "complaint") return "/api/complaints";
    return `/api/operational/${module}`;
  }

  function operationalFormHintText(): string {
    if (genericModuleDef) {
      return t("qms.edit.operationalFormHintModule").replace(
        "{module}",
        t(genericModuleDef.labelKey),
      );
    }
    if (isCapaForm || isCh01Form || isCh02Form) {
      return t("qms.edit.operationalFormHint");
    }
    return t("qms.edit.formHint");
  }
  const isForm = doc.layer === "FORM" || formCode.startsWith("FORM-");
  const dirty =
    isCapaForm && capaData
      ? serializeCapaFormMarkdown(capaData, locale).trim() !== (doc.content ?? "").trim()
      : isCh01Form && complaintCh01Data
        ? serializeComplaintCh01Markdown(complaintCh01Data, locale).trim() !== (doc.content ?? "").trim()
        : isCh02Form && complaintCh02Data
          ? serializeComplaintCh02Markdown(complaintCh02Data, locale).trim() !== (doc.content ?? "").trim()
          : content !== (doc.content ?? "").trim();

  function handleCapaFormChange(data: CapaFormData) {
    setCapaData(data);
    setContent(serializeCapaFormMarkdown(data, locale));
    setSaveOk(false);
  }

  function handleComplaintCh01Change(data: ComplaintCh01FormData) {
    setComplaintCh01Data(data);
    setContent(serializeComplaintCh01Markdown(data, locale));
    setSaveOk(false);
  }

  function handleComplaintCh02Change(data: ComplaintCh02FormData) {
    setComplaintCh02Data(data);
    setContent(serializeComplaintCh02Markdown(data, locale));
    setSaveOk(false);
  }

  function sourceLabel(source: string): string {
    const key = `qms.generate.source.${source}` as const;
    const translated = t(key);
    if (translated !== key) return translated;
    return source === "rules" || source === "mock" ? t("qms.generate.source.rules") : source;
  }

  function fallbackLabel(reason?: string): string {
    if (!reason) return t("qms.generate.aiFallback");
    const key = `qms.generate.fallback.${reason}` as const;
    const translated = t(key);
    return translated !== key ? translated : reason;
  }

  async function saveContent() {
    const trimmed = content.trim();
    if (!trimmed) {
      setError(t("qms.edit.contentRequired"));
      return;
    }
    if (contentLocked && !window.confirm(t("eqms.meta.revisionConfirm"))) {
      return;
    }
    setSaving(true);
    setError(null);
    setSaveOk(false);
    setSyncInfo(null);
    try {
      const res = await fetch(`/api/qms/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          locale: lang,
          userContext: userContext.trim() || undefined,
          operationalLink: effectiveOperationalLink,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("qms.edit.saveError"));
        return;
      }
      setSaveOk(true);
      applySync({ sync: data.item?.sync });
      router.refresh();
    } catch {
      setError(t("qms.edit.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    setLoading(true);
    setError(null);
    setSaveOk(false);
    setSyncInfo(null);
    try {
      const res = await fetch(`/api/qms/${doc.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: aiLocale,
          userContext: userContext.trim() || undefined,
          operationalLink: effectiveOperationalLink,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("qms.generate.error"));
        return;
      }
      setContent(data.content ?? "");
      if (isCapaForm) setCapaData(parseCapaFormMarkdown(data.content ?? "", locale));
      if (isCh01Form) setComplaintCh01Data(parseComplaintCh01Markdown(data.content ?? "", locale));
      if (isCh02Form) setComplaintCh02Data(parseComplaintCh02Markdown(data.content ?? "", locale));
      setSource(data.source ?? "");
      setMissing(data.missingItems ?? []);
      setSummary(data.summary ?? "");
      if (!data.liveAiUsed) {
        setError(fallbackLabel(data.aiFallbackReason));
      }
      applySync(data);
      router.refresh();
    } catch {
      setError(t("qms.generate.error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const baseContent = (doc.content ?? "").trim();
    setContent(baseContent);
    if (isCapaForm) setCapaData(parseCapaFormMarkdown(baseContent, locale));
    else setCapaData(null);
    if (isCh01Form) setComplaintCh01Data(parseComplaintCh01Markdown(baseContent, locale));
    else setComplaintCh01Data(null);
    if (isCh02Form) setComplaintCh02Data(parseComplaintCh02Markdown(baseContent, locale));
    else setComplaintCh02Data(null);
    setUserContext(initialHint?.trim() ?? "");
    setError(null);
    setSaveOk(false);
    setSummary("");
    setMissing([]);
    setSource("");
    setSyncInfo(null);
  }, [doc.id, doc.content, initialHint, isCapaForm, isCh01Form, isCh02Form, locale]);

  useEffect(() => {
    if (!linkedOperationalRecord) return;
    const link =
      (isCh01Form || isCh02Form) && linkedOperationalRecord.module === "complaint"
        ? linkedOperationalRecord
        : isCapaForm && linkedOperationalRecord.module === "capa"
          ? linkedOperationalRecord
          : isInternalAuditDoc && linkedOperationalRecord.module === "internal-audit"
            ? linkedOperationalRecord
            : isGenericOperationalForm &&
                genericModuleDef &&
                linkedOperationalRecord.module === genericModuleDef.slug
              ? linkedOperationalRecord
              : null;
    if (!link) return;

    const base = operationalApiBase(link.module);
    let cancelled = false;
    fetch(`${base}/${link.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const row = data.complaint ?? data.capa ?? data.record;
        if (!row) return;
        const baseContent = (doc.content ?? "").trim();

        if (isCh01Form) {
          const parsed = parseComplaintCh01Markdown(baseContent, locale);
          const patched = {
            ...parsed,
            complaintNo: parsed.complaintNo || row.complaintNo || "",
            description: parsed.description || row.description || "",
            lotSerial: parsed.lotSerial || row.lotNumber || "",
          };
          setComplaintCh01Data(patched);
          setContent(serializeComplaintCh01Markdown(patched, locale));
        }

        if (isCapaForm) {
          const parsed = parseCapaFormMarkdown(baseContent, locale);
          const patched = {
            ...parsed,
            capaNo: parsed.capaNo || row.referenceNo || "",
            description: parsed.description || row.title || "",
          };
          setCapaData(patched);
          setContent(serializeCapaFormMarkdown(patched, locale));
        }

        if (isGenericOperationalForm && row.formContent?.trim()) {
          setContent(row.formContent);
        }

        if (isInternalAuditDoc && data.cycle) {
          const cycle = data.cycle as {
            planContent?: string | null;
            checklistContent?: string | null;
            reportContent?: string | null;
          };
          const cycleContent =
            iaKind === "plan"
              ? cycle.planContent
              : iaKind === "checklist"
                ? cycle.checklistContent
                : cycle.reportContent;
          if (cycleContent?.trim()) setContent(cycleContent);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [
    linkedOperationalRecord,
    doc.content,
    doc.id,
    isCh01Form,
    isCh02Form,
    isCapaForm,
    isGenericOperationalForm,
    genericModuleDef,
    isInternalAuditDoc,
    iaKind,
    locale,
  ]);

  return (
    <Card ref={panelRef} className="border-accent/30">
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">
                {isForm ? t("qms.edit.formTitle") : t("qms.draftPrefix")}: {displayTitle}
              </p>
              <p className="text-xs text-muted-foreground">
                {doc.code ?? "—"} · {doc.standard}
                {doc.clauseRefs ? ` · ${doc.clauseRefs}` : ""}
                {companyName ? ` · ${companyName}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={saveContent}
              disabled={saving || !dirty}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? t("qms.edit.saving") : t("qms.edit.save")}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {loading ? t("qms.generate.running") : t("qms.generate.btn")}
            </Button>
            {content.trim() && (
              <QmsDownloadButton
                docId={doc.id}
                label={t("qms.generate.downloadWord")}
                defaultFormat={exportFormat}
              />
            )}
            {nextFormCode && onOpenNextForm && (
              <Button variant="secondary" size="sm" className="gap-1.5" onClick={onOpenNextForm}>
                <ArrowRight className="h-3.5 w-3.5" />
                {t("qms.edit.nextForm").replace("{code}", nextFormCode)}
              </Button>
            )}
          </div>
        </div>

        {isForm && (
          <p className="text-xs text-muted-foreground">
            {isOperationalForm ? operationalFormHintText() : t("qms.edit.formHint")}
          </p>
        )}

        {effectiveOperationalLink && (
          <p className="text-xs text-primary">
            {t("qms.edit.linkedOperationalRecord")}{" "}
            <Link
              href={
                effectiveOperationalLink.module === "capa"
                  ? "/operational/capa"
                  : effectiveOperationalLink.module === "complaint"
                    ? "/operational/complaints"
                    : `/operational/${effectiveOperationalLink.module}`
              }
              className="font-medium underline underline-offset-2"
            >
              {effectiveOperationalLink.module === "capa"
                ? t("nav.capa")
                : effectiveOperationalLink.module === "complaint"
                  ? t("nav.complaints")
                  : t(
                      OPERATIONAL_MODULES[effectiveOperationalLink.module as OperationalModuleSlug]
                        ?.labelKey ?? "nav.operational",
                    )}
            </Link>
          </p>
        )}

        {contentLocked && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
            {t("eqms.meta.lockedHint")}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <label className="text-muted-foreground">{t("eqms.create.aiLang")}</label>
            <select
              value={aiLocale}
              onChange={(e) => setAiLocale(e.target.value as Lang)}
              className="h-8 rounded-md border border-input bg-background px-2"
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-muted-foreground">{t("eqms.export.format")}</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as "docx" | "pdf")}
              className="h-8 rounded-md border border-input bg-background px-2"
            >
              <option value="docx">Word (.docx)</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{t("qms.procedure.childHintLabel")}</label>
          <textarea
            value={userContext}
            onChange={(e) => setUserContext(e.target.value)}
            placeholder={procedureChildHintPlaceholder(
              doc.parentProcedureCode,
              (doc.layer as QmsDocumentLayer) ?? inferQmsLayerFromCode(doc.code),
              doc.code,
              lang,
            )}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">{t("qms.edit.contentLabel")}</label>
          {isCapaForm && capaData ? (
            <CapaStructuredForm data={capaData} onChange={handleCapaFormChange} />
          ) : isCh01Form && complaintCh01Data ? (
            <ComplaintCh01StructuredForm data={complaintCh01Data} onChange={handleComplaintCh01Change} />
          ) : isCh02Form && complaintCh02Data ? (
            <ComplaintCh02StructuredForm data={complaintCh02Data} onChange={handleComplaintCh02Change} />
          ) : isGenericOperationalForm ? (
            <GenericStructuredForm
              formContent={
                content.trim() ||
                initGenericFormContent(formCode, locale)
              }
              onChange={(next) => {
                setContent(next);
                setSaveOk(false);
              }}
            />
          ) : (
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setSaveOk(false);
              }}
              rows={isForm ? 18 : 14}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed"
              placeholder={t("qms.edit.contentPlaceholder")}
            />
          )}
        </div>

        {loading && <AiAnalyzingHint />}

        {saveOk && (
          <p className="text-sm text-green-600 dark:text-green-400">{t("qms.edit.saveOk")}</p>
        )}

        {syncInfo && (
          <p className="text-sm text-green-700 dark:text-green-300">
            {syncInfo.created ? t("qms.edit.syncCreated") : t("qms.edit.syncUpdated")}{" "}
            <Link
              href={
                syncInfo.module === "capa"
                  ? "/operational/capa"
                  : syncInfo.module === "complaint"
                    ? "/operational/complaints"
                    : `/operational/${syncInfo.module}`
              }
              className="font-medium underline underline-offset-2"
            >
              {syncInfo.module === "capa"
                ? t("nav.capa")
                : syncInfo.module === "complaint"
                  ? t("nav.complaints")
                  : t(
                      OPERATIONAL_MODULES[syncInfo.module as OperationalModuleSlug]?.labelKey ??
                        "nav.operational",
                    )}
            </Link>
          </p>
        )}

        {error && (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        {content.trim() && source && !dirty && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">{t("qms.generate.ready")}</Badge>
            <Badge variant="muted">{t("qms.generate.saved")}</Badge>
            <Badge variant="outline">{sourceLabel(source)}</Badge>
          </div>
        )}

        {summary && !dirty && (
          <p className="text-sm text-muted-foreground">{summary}</p>
        )}

        {missing.length > 0 && !dirty && (
          <div>
            <p className="mb-1 text-sm font-semibold">{t("qms.generate.missing")}</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {missing.map((m, i) => (
                <li key={i}>• {m}</li>
              ))}
            </ul>
          </div>
        )}

        <Disclaimer text={t("common.disclaimer")} />
      </CardContent>
    </Card>
  );
}
