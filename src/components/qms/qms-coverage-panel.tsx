"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/providers/i18n-provider";
import type { ClauseCoverageRow } from "@/lib/qms/iso13485-manual-coverage";

export function QmsCoveragePanel({
  percent,
  summary,
  rows,
}: {
  percent: number;
  summary: string;
  rows: ClauseCoverageRow[];
}) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);

  const missing = rows.filter((r) => r.status === "missing");
  const partial = rows.filter((r) => r.status === "partial");

  const band =
    percent >= 80 ? "text-green-700 dark:text-green-400" : percent >= 50 ? "text-amber-700 dark:text-amber-400" : "text-destructive";

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            {t("qms.coverage.title")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-semibold tabular-nums ${band}`}>{percent}%</span>
            <Link href="/wizards/quality-manual" className={buttonVariants({ variant: "outline", size: "sm" })}>
              {t("qms.coverage.wizardLink")}
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">{summary}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">
            {t("qms.coverage.missingCount").replace("{n}", String(missing.length))}
          </Badge>
          <Badge variant="outline">
            {t("qms.coverage.partialCount").replace("{n}", String(partial.length))}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 h-8 px-2" onClick={() => setOpen((v) => !v)}>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {t("qms.coverage.toggleDetails")}
        </Button>
        {open && (
          <div className="max-h-64 overflow-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/80">
                <tr>
                  <th className="p-2 text-left">{t("qms.coverage.colClause")}</th>
                  <th className="p-2 text-left">{t("qms.coverage.colTitle")}</th>
                  <th className="p-2 text-left">{t("qms.coverage.colStatus")}</th>
                  <th className="p-2 text-left hidden sm:table-cell">{t("qms.coverage.colSop")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.clauseNo} className="border-t border-border/50">
                    <td className="p-2 font-mono">{r.clauseNo}</td>
                    <td className="p-2">{lang === "tr" ? r.titleTr : r.titleEn}</td>
                    <td className="p-2">
                      <Badge
                        variant={
                          r.status === "covered" ? "default" : r.status === "partial" ? "secondary" : "outline"
                        }
                      >
                        {t(`qms.coverage.status.${r.status}`)}
                      </Badge>
                    </td>
                    <td className="p-2 font-mono hidden sm:table-cell">{r.sopCode ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
