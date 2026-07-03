"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  parseInternalAuditChecklistMarkdown,
} from "@/lib/operational/internal-audit-checklist-model";
import type { InternalAuditCycleDto } from "@/lib/operational/internal-audit-codes";

type Finding = {
  item: string;
  severity: "major" | "minor";
  note: string;
};

function extractFindings(content: string | null, locale: "tr" | "en"): Finding[] {
  if (!content?.trim()) return [];
  const data = parseInternalAuditChecklistMarkdown(content, locale);
  const findings: Finding[] = [];
  for (const row of data.items) {
    if (row.major) {
      findings.push({ item: row.item, severity: "major", note: row.note });
    } else if (row.minor) {
      findings.push({ item: row.item, severity: "minor", note: row.note });
    }
  }
  return findings;
}

export function InternalAuditCapaActions({
  cycle,
  canEdit,
}: {
  cycle: InternalAuditCycleDto;
  canEdit: boolean;
}) {
  const { t, lang } = useI18n();
  const locale = lang === "en" ? "en" : "tr";
  const [linkingKey, setLinkingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCapaHref, setLastCapaHref] = useState<string | null>(null);

  const findings = useMemo(
    () => extractFindings(cycle.checklistContent, locale),
    [cycle.checklistContent, locale],
  );

  if (findings.length === 0) return null;

  async function createCapa(finding: Finding) {
    const key = `${finding.severity}:${finding.item}`;
    setLinkingKey(key);
    setError(null);
    setLastCapaHref(null);
    try {
      const res = await fetch("/api/operational/closures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "capa-from-audit",
          auditCycleId: cycle.id,
          findingTitle: `${finding.severity === "major" ? "[Majör] " : "[Minör] "}${finding.item}`,
          findingDescription: finding.note.trim() || finding.item,
          locale: lang,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("operational.closure.error"));
        return;
      }
      if (typeof data.href === "string") setLastCapaHref(data.href);
    } catch {
      setError(t("operational.closure.error"));
    } finally {
      setLinkingKey(null);
    }
  }

  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
      <p className="text-sm font-medium flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        {t("operational.internalAudit.findingsTitle")}
      </p>
      <p className="text-xs text-muted-foreground">{t("operational.internalAudit.findingsHint")}</p>
      <ul className="space-y-2">
        {findings.map((f) => {
          const key = `${f.severity}:${f.item}`;
          return (
            <li
              key={key}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/60 bg-background px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <span className="font-mono text-xs uppercase text-amber-700 dark:text-amber-400">
                  {f.severity === "major"
                    ? t("operational.internalAudit.severityMajor")
                    : t("operational.internalAudit.severityMinor")}
                </span>
                <p className="font-medium">{f.item}</p>
                {f.note.trim() && <p className="text-xs text-muted-foreground">{f.note}</p>}
              </div>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={linkingKey === key}
                  onClick={() => createCapa(f)}
                >
                  {linkingKey === key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("operational.internalAudit.createCapaFromFinding")
                  )}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {lastCapaHref && (
        <p className="text-xs">
          <Link href={lastCapaHref} className="text-primary hover:underline">
            {t("operational.internalAudit.openCapa")}
          </Link>
        </p>
      )}
    </div>
  );
}
