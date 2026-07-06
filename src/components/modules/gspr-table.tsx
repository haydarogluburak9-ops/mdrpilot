"use client";



import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Card } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import { StatusBadge, STATUS_TONE_CLASS } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import { Textarea } from "@/components/ui/input";

import { useI18n } from "@/components/providers/i18n-provider";

import type { GsprApplicability, GsprItem } from "@/lib/domain/types";

import { sortByGsprNo } from "@/lib/domain/gspr-sort";

import { gsprRequirementText, gsprJustificationText } from "@/lib/domain/gspr-text";
import { formatStandardReference, formatStandardsInText } from "@/lib/domain/standards-catalog";
import { localizeEvidenceDocument, isGsprAutoHint } from "@/lib/domain/gspr-evidence-i18n";
import { translateGsprApiError } from "@/lib/domain/gspr-api-errors";
import { resolveGsprStatus, gsprStatusOptions, hasRealGsprEvidence, gsprStatusBlockReason } from "@/lib/domain/gspr-row-status";
import type { DocStatus } from "@/lib/domain/types";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GsprEvidenceModal } from "@/components/modules/gspr-evidence-modal";
import type { EvidenceFile, FileOption } from "@/components/modules/evidence-panel";
import { AlertCircle, Loader2, Paperclip, Plus } from "lucide-react";



function applicableBadge(applicable: GsprApplicability): {

  variant: React.ComponentProps<typeof Badge>["variant"];

  labelKey: string;

} {

  if (applicable === "NO") {

    return { variant: "destructive", labelKey: "gspr.applicable.NO" };

  }

  return { variant: "success", labelKey: "gspr.applicable.YES" };

}



function GsprJustificationCell({

  itemId,

  productId,

  canEdit,

  applicable,

  value,

  placeholder,

}: {

  itemId: string;

  productId?: string;

  canEdit: boolean;

  applicable: GsprItem["applicable"];

  value?: string;

  placeholder: string;

}) {

  const router = useRouter();
  const [text, setText] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    setText(value ?? "");
  }, [value]);

  useLayoutEffect(() => {
    resize();
    const t = window.setTimeout(resize, 0);
    return () => window.clearTimeout(t);
  }, [text, value, resize]);

  useEffect(() => {
    resize();
  }, [text, value, resize]);

  const editable = canEdit && !!productId;

  if (!editable) {
    return (
      <p className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${value ? "text-foreground" : "text-muted-foreground italic"}`}>
        {value || "—"}
      </p>
    );
  }



  async function save(next: string) {

    if (!productId || next === (value ?? "")) return;

    setSaving(true);

    try {

      const res = await fetch(`/api/products/${productId}/gspr/${itemId}`, {

        method: "PATCH",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ justification: next }),

      });

      if (res.ok) router.refresh();

    } finally {

      setSaving(false);

    }

  }



  const needsText = applicable !== "NO" && !text.trim();



  return (
    <div className="relative min-w-[280px]">
      <Textarea
        ref={textareaRef}
        rows={2}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          requestAnimationFrame(resize);
        }}
        onBlur={() => save(text)}
        placeholder={placeholder}
        className={`min-h-[3.5rem] resize-y py-2 text-xs leading-relaxed ${needsText ? "border-warning/60 bg-warning/5" : ""}`}
        disabled={saving}
      />
      {saving && <Loader2 className="absolute right-2 top-2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
    </div>
  );

}



function GsprEvidenceCell({
  itemId,
  gsprNo,
  linkedFiles,
  evidenceHint,
  evidenceHintRaw,
  evidenceManual = false,
  standardReference,
  applicable,
  fileOptions,
  recommendedFileIds,
  canEdit,
  productId,
}: {
  itemId: string;
  gsprNo: string;
  linkedFiles: EvidenceFile[];
  evidenceHint?: string;
  evidenceHintRaw?: string;
  evidenceManual?: boolean;
  standardReference?: string;
  applicable: GsprItem["applicable"];
  fileOptions: FileOption[];
  recommendedFileIds: string[];
  canEdit: boolean;
  productId?: string;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState(linkedFiles);
  const [hint, setHint] = useState(evidenceHint);

  useEffect(() => {
    setFiles(linkedFiles);
  }, [linkedFiles]);

  useEffect(() => {
    setHint(evidenceHint);
  }, [evidenceHint]);

  const linkedText = files.map((f) => f.fileName).join(", ");
  const rawHint = linkedText || hint;
  const localized = localizeEvidenceDocument(rawHint, lang, gsprNo) ?? rawHint;
  const displayText = formatStandardsInText(localized) ?? localized;
  const isAutoHintOnly =
    !linkedText &&
    !evidenceManual &&
    !!(evidenceHintRaw ?? hint) &&
    isGsprAutoHint(evidenceHintRaw ?? hint);
  const noEvidence = !displayText && !standardReference && applicable !== "NO";

  return (
    <>
      <div className="flex min-w-[160px] items-start gap-1">
        <div className="min-w-0 flex-1">
          {displayText ? (
            <div className="space-y-0.5">
              <span className={isAutoHintOnly ? "text-xs italic text-muted-foreground" : "flex items-start gap-1 text-primary"}>
                {!isAutoHintOnly && <Paperclip className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                <span className="break-words leading-relaxed">{displayText}</span>
              </span>
              {isAutoHintOnly && (
                <p className="text-[10px] text-destructive">{t("gspr.evidenceAutoHintBadge")}</p>
              )}
            </div>
          ) : standardReference ? (
            <span className="text-xs italic text-muted-foreground">{t("gspr.standardOnly")}</span>
          ) : (
            <span className={noEvidence ? "text-destructive" : "text-muted-foreground"}>{t("gspr.missing")}</span>
          )}
        </div>
        {canEdit && productId && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7 shrink-0"
            title={t("gspr.addEvidence")}
            aria-label={t("gspr.addEvidence")}
            onClick={() => setOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      {open && productId && (
        <GsprEvidenceModal
          productId={productId}
          itemId={itemId}
          gsprNo={gsprNo}
          fileOptions={fileOptions}
          recommendedFileIds={recommendedFileIds}
          alreadyLinked={files.map((f) => f.fileId)}
          currentHint={hint}
          onClose={() => setOpen(false)}
          onFileLinked={(file) => {
            setFiles((prev) => (prev.some((x) => x.fileId === file.fileId) ? prev : [...prev, file]));
            router.refresh();
          }}
          onHintSaved={(text) => {
            setHint(text);
            router.refresh();
          }}
        />
      )}
    </>
  );
}



function GsprStatusCell({
  itemId,
  productId,
  canEdit,
  canApprove,
  storedStatus,
  applicable,
  justification,
  evidenceDocument,
  evidenceDocumentRaw,
  evidenceManual = false,
  linkedFileCount,
}: {
  itemId: string;
  productId?: string;
  canEdit: boolean;
  canApprove: boolean;
  storedStatus: DocStatus;
  applicable: GsprItem["applicable"];
  justification?: string;
  evidenceDocument?: string;
  evidenceDocumentRaw?: string;
  evidenceManual?: boolean;
  linkedFileCount: number;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const evidenceForCheck = evidenceDocumentRaw ?? evidenceDocument;
  const rowContext = {
    applicable,
    justification,
    evidenceDocument: evidenceForCheck,
    evidenceManual,
    linkedFileCount,
  };
  const displayStatus = resolveGsprStatus(storedStatus, rowContext);
  const [status, setStatus] = useState(displayStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingStatusRef = useRef<DocStatus | null>(null);

  useEffect(() => {
    const resolved = resolveGsprStatus(storedStatus, rowContext);
    const pending = pendingStatusRef.current;
    if (pending) {
      if (storedStatus === pending) {
        pendingStatusRef.current = null;
        setStatus(storedStatus);
        return;
      }
      if (resolved === pending) {
        pendingStatusRef.current = null;
        setStatus(resolved);
        return;
      }
      setStatus(pending);
      return;
    }
    setStatus(resolved);
  }, [storedStatus, applicable, justification, evidenceDocument, evidenceDocumentRaw, linkedFileCount]);

  useEffect(() => {
    if (!error) return;
    const block = gsprStatusBlockReason({ status: displayStatus, ...rowContext }, "IN_REVIEW");
    if (!block) setError(null);
  }, [displayStatus, applicable, justification, evidenceForCheck, linkedFileCount, error]);

  async function onChange(next: DocStatus) {
    if (!productId || next === status) return;

    const previous = status;
    const isWorkflow = next === "IN_REVIEW" || next === "APPROVED";

    if (isWorkflow) {
      setError(null);
    } else {
      setError(null);
      pendingStatusRef.current = next;
      setStatus(next);
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/products/${productId}/gspr/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        pendingStatusRef.current = null;
        if (isWorkflow) setStatus(previous);
        setError(translateGsprApiError(data.error, t));
        return;
      }
      const saved = (data.item?.status ?? next) as DocStatus;
      pendingStatusRef.current = saved;
      setStatus(saved);
      setError(null);
      router.refresh();
    } catch {
      pendingStatusRef.current = null;
      if (isWorkflow) setStatus(previous);
      else setStatus(previous);
      setError(t("gspr.status.err.generic"));
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit || !productId) {
    return <StatusBadge status={displayStatus} />;
  }

  const options = gsprStatusOptions(canApprove);

  return (
    <div className="min-w-[120px]">
      <select
        value={status}
        disabled={saving}
        onChange={(e) => onChange(e.target.value as DocStatus)}
        className={cn(
          "w-full rounded-md border px-2 py-1.5 text-xs font-medium",
          STATUS_TONE_CLASS[status],
        )}
        aria-label={t("gspr.col.status")}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {t(`status.${opt}`)}
          </option>
        ))}
      </select>
      {saving && <Loader2 className="mt-1 h-3 w-3 animate-spin text-muted-foreground" />}
      {error && <p className="mt-1 text-[10px] leading-snug text-destructive">{error}</p>}
    </div>
  );
}



export function GsprTable({

  items,

  evidenceByItemId,

  fileOptions = [],

  recommendations = {},

  productId,

  canEdit = false,

  canApprove = false,

}: {

  items: GsprItem[];

  evidenceByItemId?: Record<string, EvidenceFile[]>;

  fileOptions?: FileOption[];

  recommendations?: Record<string, string[]>;

  productId?: string;

  canEdit?: boolean;

  canApprove?: boolean;

}) {

  const { t, lang } = useI18n();

  const sorted = useMemo(() => sortByGsprNo(items), [items]);

  return (

    <Card className="overflow-x-auto">
      <div>
        <table className="w-full min-w-[1100px] text-sm table-fixed">

          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">

            <tr>

              <th className="w-[4%] px-3 py-3 font-medium">{t("gspr.col.gspr")}</th>

              <th className="w-[18%] px-3 py-3 font-medium">{t("gspr.col.requirement")}</th>

              <th className="w-[8%] px-3 py-3 font-medium">{t("gspr.col.applicable")}</th>

              <th className="w-[22%] px-3 py-3 font-medium">{t("gspr.col.justification")}</th>

              <th className="w-[16%] px-3 py-3 font-medium">{t("gspr.col.evidence")}</th>

              <th className="w-[12%] px-3 py-3 font-medium">{t("gspr.col.standard")}</th>

              <th className="w-[10%] px-3 py-3 font-medium">{t("gspr.col.status")}</th>

            </tr>

          </thead>

          <tbody>

            {sorted.map((g) => {

              const linked = evidenceByItemId?.[g.id] ?? [];

              const noEvidence =
                g.applicable !== "NO" &&
                !hasRealGsprEvidence(
                  linked.length,
                  g.evidenceDocumentRaw ?? g.evidenceDocument,
                  g.evidenceManual,
                ) &&
                !g.justification?.trim();

              const recommendedIds = [
                ...(recommendations[g.id] ?? []),
                ...(recommendations[g.gsprNo] ?? []),
              ];

              const localizedReq = gsprRequirementText(g.gsprNo, g.requirementSummary, lang);

              const localizedJustification = gsprJustificationText(g.justification, g.applicable, lang);

              const badge = applicableBadge(g.applicable);

              const justificationPlaceholder =

                g.applicable === "NO" ? t("gspr.justification.naPlaceholder") : t("gspr.justification.placeholder");

              return (

                <tr

                  key={g.id}

                  className={`border-b border-border last:border-0 hover:bg-muted/30 ${noEvidence ? "bg-destructive/5" : ""}`}

                >

                  <td className="align-top px-3 py-3 font-semibold">{g.gsprNo}</td>
                  <td className="align-top px-3 py-3 text-muted-foreground whitespace-pre-wrap break-words">

                    {localizedReq}

                    {g.aiGapComment && (

                      <span className="mt-1 flex items-center gap-1 text-xs text-destructive">

                        <AlertCircle className="h-3 w-3" /> {g.aiGapComment}

                      </span>

                    )}

                  </td>

                  <td className="px-4 py-3">

                    <Badge variant={badge.variant}>{t(badge.labelKey)}</Badge>

                  </td>

                  <td className="align-top px-3 py-3">
                    <GsprJustificationCell

                      itemId={g.id}

                      productId={productId}

                      canEdit={canEdit}

                      applicable={g.applicable}

                      value={localizedJustification}

                      placeholder={justificationPlaceholder}

                    />

                  </td>

                  <td className="align-top px-3 py-3">
                    <GsprEvidenceCell
                      itemId={g.id}
                      gsprNo={g.gsprNo}
                      linkedFiles={linked}
                      evidenceHint={g.evidenceDocument}
                      evidenceHintRaw={g.evidenceDocumentRaw}
                      evidenceManual={g.evidenceManual}
                      standardReference={g.standardReference}
                      applicable={g.applicable}
                      fileOptions={fileOptions}
                      recommendedFileIds={recommendedIds}
                      canEdit={canEdit}
                      productId={productId}
                    />
                  </td>

                  <td className="px-4 py-3">

                    {g.standardReference ? (
                      <span className="font-medium text-primary">{formatStandardReference(g.standardReference)}</span>

                    ) : (

                      <span className="text-muted-foreground">—</span>

                    )}

                  </td>

                  <td className="px-4 py-3">
                    <GsprStatusCell
                      itemId={g.id}
                      productId={productId}
                      canEdit={canEdit}
                      canApprove={canApprove}
                      storedStatus={g.status}
                      applicable={g.applicable}
                      justification={g.justification}
                      evidenceDocument={g.evidenceDocument}
                      evidenceDocumentRaw={g.evidenceDocumentRaw}
                      evidenceManual={g.evidenceManual}
                      linkedFileCount={linked.length}
                    />
                  </td>

                </tr>

              );

            })}

          </tbody>

        </table>
      </div>
    </Card>

  );

}

