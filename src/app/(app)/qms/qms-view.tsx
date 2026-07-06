"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ExternalLink, FolderOpen, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExportButtons } from "@/components/modules/export-buttons";
import { QmsBulkAiButton } from "@/components/qms/qms-bulk-ai-button";
import { QmsBootstrapPackButton } from "@/components/qms/qms-bootstrap-pack-button";
import { QmsOperationalPackButton } from "@/components/qms/qms-operational-pack-button";
import { QmsCoveragePanel } from "@/components/qms/qms-coverage-panel";
import { QmsCreateProcedurePanel } from "@/components/qms/qms-create-procedure-panel";
import { QmsDocStatusSelect } from "@/components/qms/qms-doc-status-select";
import { useI18n } from "@/components/providers/i18n-provider";
import { qmsDocTitle } from "@/lib/i18n/qms-doc-titles";
import { KYS_LAYER_DEFINITIONS } from "@/lib/qms/kys-structure";
import { buildProcedureTree } from "@/lib/qms/procedure-children";
import type { DocStatus } from "@/lib/domain/types";
import type { QmsDoc } from "@/lib/data/queries";
import type { QmsOnboardingPath } from "@/lib/qms/onboarding-path";
import type { Lang } from "@/lib/i18n/locales";
import type { ClauseCoverageRow } from "@/lib/qms/iso13485-manual-coverage";

function matchesFilter(doc: QmsDoc, q: string, lang: Lang): boolean {
  if (!q) return true;
  const title = qmsDocTitle(doc.code, doc.title, lang).toLowerCase();
  return (doc.code ?? "").toLowerCase().includes(q) || title.includes(q);
}

function KysProcedureTree({
  docs,
  canEdit,
  canApprove,
}: {
  docs: QmsDoc[];
  canEdit: boolean;
  canApprove: boolean;
}) {
  const { t, lang } = useI18n();
  const [filter, setFilter] = useState("");
  const [folderOpen, setFolderOpen] = useState(true);

  const q = filter.trim().toLowerCase();
  const { procedures } = useMemo(() => buildProcedureTree(docs), [docs]);

  const filteredProcedures = useMemo(() => {
    if (!q) return procedures;
    return procedures
      .map((node) => {
        const procMatch = matchesFilter(node.procedure, q, lang);
        const children = node.children.filter((c) => matchesFilter(c, q, lang));
        if (procMatch || children.length > 0) {
          return { ...node, children: procMatch ? node.children : children };
        }
        return null;
      })
      .filter(Boolean) as typeof procedures;
  }, [procedures, q, lang]);

  const procDef = KYS_LAYER_DEFINITIONS.find((l) => l.layer === "PROCEDURE")!;

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("qms.searchPlaceholder")}
            className="w-full max-w-sm rounded-lg border border-input bg-card px-3 py-2 text-sm"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <button
          type="button"
          className="flex w-full items-center gap-3 border-b border-border bg-muted/30 px-4 py-3 text-left hover:bg-muted/50"
          onClick={() => setFolderOpen((v) => !v)}
        >
          {folderOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <FolderOpen className="h-4 w-4 text-primary" />
          <div className="flex-1">
            <p className="font-medium text-sm">
              {lang === "tr" ? procDef.titleTr : procDef.titleEn}
            </p>
            <p className="text-xs text-muted-foreground">{t("qms.procedure.openHint")}</p>
          </div>
          <Badge variant="secondary">{filteredProcedures.length}</Badge>
        </button>

        {folderOpen && (
          <div className="divide-y divide-border">
            {filteredProcedures.map((node) => {
              const sopCode = node.procedure.code ?? node.procedure.id;
              const href = `/qms/procedures/${encodeURIComponent(sopCode)}`;
              const emptyCount = node.children.filter((c) => !c.hasContent).length;

              return (
                <div
                  key={node.procedure.id}
                  className="flex items-center gap-2 px-4 py-3 hover:bg-muted/30"
                >
                  <Link
                    href={href}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-1 -my-1 hover:bg-muted/40 px-2 -mx-2 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-primary">{node.procedure.code}</p>
                      <p className="font-medium text-sm truncate">
                        {qmsDocTitle(node.procedure.code, node.procedure.title, lang)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {node.children.length} {t("qms.procedure.childBadge")}
                      </Badge>
                      {emptyCount > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {emptyCount} {t("qms.procedure.noContent")}
                        </Badge>
                      )}
                    </div>
                  </Link>
                  <QmsDocStatusSelect
                    docId={node.procedure.id}
                    storedStatus={node.procedure.status as DocStatus}
                    canEdit={canEdit}
                    canApprove={canApprove}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

export function QmsView({
  iso13485,
  companyName,
  canEdit,
  canApprove,
  qmsPath,
  coveragePercent,
  coverageSummaryTr,
  coverageSummaryEn,
  coverageRows,
}: {
  iso13485: QmsDoc[];
  companyName: string;
  canEdit: boolean;
  canApprove: boolean;
  qmsPath?: QmsOnboardingPath | null;
  coveragePercent?: number;
  coverageSummaryTr?: string;
  coverageSummaryEn?: string;
  coverageRows?: ClauseCoverageRow[];
}) {
  const { t, lang } = useI18n();
  void companyName;

  return (
    <div>
      <PageHeader
        title={t("qms.title")}
        description={t("qms.desc")}
        actions={
          <div className="flex items-center gap-2">
            <QmsBootstrapPackButton canEdit={canEdit} />
            <QmsOperationalPackButton canEdit={canEdit} />
            <QmsBulkAiButton docs={iso13485} canEdit={canEdit} />
            <Link href="/wizards/quality-manual" className={buttonVariants({ variant: "default", size: "sm" })}>
              <Wand2 className="mr-1 h-4 w-4" /> {t("qms.generateManual")}
            </Link>
            <ExportButtons items={[{ type: "QMS_PACKAGE_ZIP", label: t("qms.packageZip") }]} />
          </div>
        }
      />

      <Card className="mb-4 border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("qms.treeTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t("qms.treeDesc")}
          {qmsPath === "GREENFIELD" && (
            <p className="mt-2 text-foreground/80">{t("qms.greenfield.hint")}</p>
          )}
          {qmsPath === "IMPORTED" && (
            <p className="mt-2 text-foreground/80">{t("qms.imported.hint")}</p>
          )}
        </CardContent>
      </Card>

      {coveragePercent != null && coverageRows && (
        <QmsCoveragePanel
          percent={coveragePercent}
          summary={lang === "tr" ? coverageSummaryTr ?? "" : coverageSummaryEn ?? ""}
          rows={coverageRows}
        />
      )}

      {qmsPath === "IMPORTED" && (
        <Card className="mb-4 border-dashed p-4 text-sm text-muted-foreground">
          {t("eqms.import.redirectHint")}
        </Card>
      )}

      <QmsCreateProcedurePanel canEdit={canEdit} />

      <KysProcedureTree docs={iso13485} canEdit={canEdit} canApprove={canApprove} />
    </div>
  );
}
