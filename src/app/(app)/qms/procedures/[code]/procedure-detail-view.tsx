"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookMarked, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QmsDownloadButton } from "@/components/qms/qms-download-button";
import { QmsProcedureWorkspace } from "@/components/qms/qms-procedure-workspace";
import { QmsProcedureUploadPanel } from "@/components/qms/qms-procedure-upload-panel";
import { QmsRevisionHistoryPanel } from "@/components/qms/qms-revision-history-panel";
import { QmsDocumentMetaPanel } from "@/components/qms/qms-document-meta-panel";
import { QmsAiDraftPanel } from "@/components/qms/qms-ai-draft-panel";
import { QmsDocStatusSelect } from "@/components/qms/qms-doc-status-select";
import { useI18n } from "@/components/providers/i18n-provider";
import { canonicalQmsClauseRefs } from "@/lib/domain/constants";
import { qmsDocTitle } from "@/lib/i18n/qms-doc-titles";
import type { DocStatus } from "@/lib/domain/types";
import type { QmsDoc } from "@/lib/data/queries";
import {
  operationalModuleForFormCode,
  type OperationalLinkModule,
} from "@/lib/operational/modules";

function parseDocQueueRef(ref: string, defaultProcedureCode: string): {
  procedureCode: string;
  docCode: string;
} {
  const trimmed = ref.trim();
  if (trimmed.includes(":")) {
    const [proc, doc] = trimmed.split(":", 2);
    return {
      procedureCode: proc.trim().toUpperCase(),
      docCode: doc.trim().toUpperCase(),
    };
  }
  return {
    procedureCode: defaultProcedureCode.trim().toUpperCase(),
    docCode: trimmed.toUpperCase(),
  };
}

export function ProcedureDetailView({
  procedure,
  childDocs,
  companyName,
  canEdit,
  canApprove,
  initialDocCode,
  initialDocQueue = [],
  initialHint,
  initialOperationalLink,
  operationalOnlyNotice,
}: {
  procedure: QmsDoc & { content: string | null };
  childDocs: QmsDoc[];
  companyName: string;
  canEdit: boolean;
  canApprove: boolean;
  initialDocCode?: string;
  initialDocQueue?: string[];
  initialHint?: string;
  initialOperationalLink?: { module: OperationalLinkModule; id: string };
  operationalOnlyNotice?: { href: string; labelKey: string; linkLabelKey: string };
}) {
  const { t, lang } = useI18n();
  const [picked, setPicked] = useState<QmsDoc | null>(null);
  const [pendingOpen, setPendingOpen] = useState<{ procedureCode: string; docCode: string } | null>(null);
  const [formQueue, setFormQueue] = useState<string[]>([]);
  const [contextHint, setContextHint] = useState(initialHint?.trim() ?? "");
  const [operationalLink, setOperationalLink] = useState(initialOperationalLink);
  const [linkingOperational, setLinkingOperational] = useState(false);

  function applyOperationalLink(link: { module: OperationalLinkModule; id: string }) {
    setOperationalLink(link);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("record", `${link.module}:${link.id}`);
      window.history.replaceState(null, "", url.toString());
    }
  }

  async function ensureOperationalLinkForDoc(doc: QmsDoc) {
    if (operationalLink || !canEdit || linkingOperational) return;
    const linkModule = operationalModuleForFormCode(doc.code);
    if (!linkModule) return;

    setLinkingOperational(true);
    try {
      if (linkModule === "internal-audit") {
        const yearMatch = contextHint.match(/\b(20\d{2})\b/);
        const year = yearMatch ? Number.parseInt(yearMatch[1], 10) : new Date().getFullYear();
        const res = await fetch("/api/operational/internal-audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const id = (data.cycle as { id?: string } | undefined)?.id;
        if (!id) return;
        applyOperationalLink({ module: "internal-audit", id });
        return;
      }

      const title = (contextHint || doc.title || doc.code || "Kayıt").trim().slice(0, 500);
      const api =
        linkModule === "capa"
          ? "/api/capa"
          : linkModule === "complaint"
            ? "/api/complaints"
            : `/api/operational/${linkModule}`;
      const res = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const id =
        (data.capa as { id?: string } | undefined)?.id ??
        (data.complaint as { id?: string } | undefined)?.id ??
        (data.record as { id?: string } | undefined)?.id;
      if (!id) return;
      applyOperationalLink({ module: linkModule, id });
    } finally {
      setLinkingOperational(false);
    }
  }

  const code = procedure.code ?? "";
  const procedureCodeUpper = code.trim().toUpperCase();
  const title = qmsDocTitle(procedure.code, procedure.title, lang);
  const clause = canonicalQmsClauseRefs(procedure.code, procedure.clauseRefs);
  const preview = (procedure.content ?? "").trim();
  const emptyChildren = childDocs.filter((c) => !c.hasContent).length;

  const findChildByCode = useCallback(
    (docCode: string) => {
      const normalized = docCode.trim().toUpperCase();
      return childDocs.find((c) => (c.code ?? "").trim().toUpperCase() === normalized);
    },
    [childDocs],
  );

  const openDocumentCodes = useCallback(
    (codes: string[], hint?: string) => {
      const list = codes.filter(Boolean);
      if (list.length === 0) return;
      if (hint?.trim()) setContextHint(hint.trim());
      const [first, ...rest] = list;
      setFormQueue(rest);
      setPendingOpen(parseDocQueueRef(first, procedureCodeUpper));
    },
    [procedureCodeUpper],
  );

  useEffect(() => {
    if (!initialDocCode?.trim()) return;
    openDocumentCodes(
      [initialDocCode.trim(), ...initialDocQueue.map((c) => c.trim()).filter(Boolean)],
      initialHint,
    );
  }, [initialDocCode, initialDocQueue, initialHint, openDocumentCodes]);

  useEffect(() => {
    if (!pendingOpen) return;
    if (pendingOpen.procedureCode !== procedureCodeUpper) {
      const params = new URLSearchParams();
      params.set("doc", pendingOpen.docCode);
      if (formQueue.length > 0) params.set("queue", formQueue.join(","));
      if (contextHint) params.set("hint", contextHint.slice(0, 500));
      if (operationalLink) params.set("record", `${operationalLink.module}:${operationalLink.id}`);
      window.location.href = `/qms/procedures/${encodeURIComponent(pendingOpen.procedureCode)}?${params.toString()}`;
      return;
    }
    const child = findChildByCode(pendingOpen.docCode);
    if (child) {
      setPicked(child);
      setPendingOpen(null);
    }
  }, [childDocs, pendingOpen, findChildByCode, procedureCodeUpper, formQueue, contextHint, operationalLink]);

  useEffect(() => {
    if (!picked || operationalLink || !canEdit) return;
    const linkModule = operationalModuleForFormCode(picked.code);
    if (!linkModule) return;
    ensureOperationalLinkForDoc(picked);
  }, [picked?.id, operationalLink, canEdit]);

  function advanceFormQueue() {
    if (formQueue.length === 0) return;
    const [next, ...rest] = formQueue;
    setFormQueue(rest);
    setPendingOpen(parseDocQueueRef(next, procedureCodeUpper));
  }

  const nextFormCode = formQueue[0]
    ? parseDocQueueRef(formQueue[0], procedureCodeUpper).docCode
    : null;

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/qms"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("qms.procedure.backToKys")}
        </Link>
      </div>

      <PageHeader
        title={code}
        description={title}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <QmsDocStatusSelect
              docId={procedure.id}
              storedStatus={procedure.status as DocStatus}
              canEdit={canEdit}
              canApprove={canApprove}
            />
            <QmsDownloadButton docId={procedure.id} />
            <Button
              variant={picked?.id === procedure.id ? "secondary" : "outline"}
              size="sm"
              className="gap-1"
              onClick={() => setPicked(procedure)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t("qms.draftAI")}
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {clause && (
          <Badge variant="outline" className="font-mono text-xs">{clause}</Badge>
        )}
        <Badge variant="secondary">
          {childDocs.length} {t("qms.procedure.childBadge")}
        </Badge>
        {emptyChildren > 0 && (
          <Badge variant="outline">{emptyChildren} {t("qms.procedure.noContent")}</Badge>
        )}
      </div>

      {preview.length > 0 && (
        <Card className="mb-4 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {t("qms.procedure.sopPreview")}
          </p>
          <div className="prose prose-sm dark:prose-invert max-w-none max-h-48 overflow-auto text-sm whitespace-pre-wrap">
            {preview.slice(0, 2400)}
            {preview.length > 2400 ? "…" : ""}
          </div>
        </Card>
      )}

      {operationalOnlyNotice && (
        <Card className="mb-4 border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="text-muted-foreground">{t(operationalOnlyNotice.labelKey)}</p>
          <Link
            href={operationalOnlyNotice.href}
            className="mt-2 inline-flex font-medium text-primary underline underline-offset-2"
          >
            {t(operationalOnlyNotice.linkLabelKey)} →
          </Link>
        </Card>
      )}

      <QmsProcedureUploadPanel
        procedureCode={code}
        canEdit={canEdit}
      />

      <QmsProcedureWorkspace
        procedure={procedure}
        childDocs={childDocs}
        canEdit={canEdit}
        onPickChild={setPicked}
        onOpenDocuments={openDocumentCodes}
      />

      <div className="mt-6 space-y-4">
        {picked ? (
          <>
            <QmsProcedureUploadPanel
              procedureCode={code}
              targetCode={picked.code}
              targetLabel={qmsDocTitle(picked.code, picked.title, lang)}
              canEdit={canEdit}
              compact
            />
            <QmsDocumentMetaPanel
              docId={picked.id}
              status={picked.status as DocStatus}
              issueDate={picked.issueDate}
              reviewDueDate={picked.reviewDueDate}
              canEdit={canEdit}
            />
            <QmsRevisionHistoryPanel documentId={picked.id} />
            <QmsAiDraftPanel
            doc={picked}
            companyName={companyName}
            initialHint={contextHint}
            linkedOperationalRecord={operationalLink}
            onOperationalLinked={applyOperationalLink}
            nextFormCode={nextFormCode}
            onOpenNextForm={formQueue.length > 0 ? advanceFormQueue : undefined}
          />
          </>
        ) : (
          <Card className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
            <BookMarked className="h-5 w-5 shrink-0" />
            {t("qms.procedure.draftHint")}
          </Card>
        )}
      </div>
    </div>
  );
}
