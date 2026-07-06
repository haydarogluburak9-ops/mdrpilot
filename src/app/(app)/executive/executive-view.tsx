"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, AlertTriangle, ClipboardList, FileWarning, CalendarClock, FolderCheck, Flame, FileX, FileDown, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/ui/disclaimer";
import { EXPORT_LANGUAGES } from "@/lib/exports/i18n";
import { useI18n } from "@/components/providers/i18n-provider";
import { ComplianceBars, RiskPie, SimpleBarChart, TrendLineChart } from "@/components/charts/executive-charts";
import type { ExecutiveData } from "@/lib/compliance/executive";

const riskBadge: Record<string, "success" | "warning" | "destructive" | "muted"> = {
  LOW: "success", MEDIUM: "warning", HIGH: "destructive", CRITICAL: "destructive",
};

export function ExecutiveView({ data, canExport }: { data: ExecutiveData; canExport: boolean }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [language, setLanguage] = useState<"tr" | "en">(lang === "en" ? "en" : "tr");

  async function exportReport() {
    setExporting(true);
    try {
      const res = await fetch("/api/executive/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language }) });
      if (res.ok) router.push("/exports");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t("executive.title")}
        description={t("executive.desc")}
        actions={canExport ? (
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "tr" | "en")}
              className="rounded-lg border border-input bg-card px-2 py-2 text-sm"
              aria-label={t("common.docLanguage")}
            >
              {EXPORT_LANGUAGES.filter((l) => l.value === "tr" || l.value === "en").map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <Button onClick={exportReport} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} {t("executive.exportPdf")}
            </Button>
          </div>
        ) : undefined}
      />
      <Disclaimer />

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("executive.overallCompliance")} value={`${data.overallCompliance}%`} icon={ShieldCheck}
          tone={data.overallCompliance >= 80 ? "success" : data.overallCompliance >= 50 ? "warning" : "danger"} />
        <StatCard label={t("executive.productsAtRisk")} value={data.productsAtRisk} icon={AlertTriangle}
          tone={data.productsAtRisk > 0 ? "danger" : "success"} hint={`${t("executive.ofProductsA")} ${data.productsTotal} ${t("executive.ofProductsB")}`} />
        <StatCard label={t("executive.openCapa")} value={data.openCapa} icon={ClipboardList}
          tone={data.overdueCapa > 0 ? "danger" : "default"} hint={`${data.overdueCapa} ${t("executive.overdue")}`} />
        <StatCard label={t("executive.majorFindings")} value={data.majorFindings} icon={FileWarning}
          tone={data.majorFindings > 0 ? "danger" : "success"} />
        <StatCard label={t("executive.auditsInProgress")} value={data.auditsInProgress} icon={CalendarClock}
          hint={`${data.completedAudits} ${t("executive.completed")}`} />
        <StatCard label={t("executive.evidenceCoverage")} value={`${data.evidenceCoverage}%`} icon={FolderCheck}
          tone={data.evidenceCoverage >= 80 ? "success" : data.evidenceCoverage >= 50 ? "warning" : "danger"} />
        <StatCard label={t("executive.topRisks")} value={data.topRisks.length} icon={Flame} tone="warning" />
        <StatCard label={t("executive.missingDocuments")} value={data.topMissingDocuments.length} icon={FileX}
          tone={data.topMissingDocuments.length > 0 ? "warning" : "success"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card><CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">{t("executive.complianceByProduct")}</h3>
          <ComplianceBars data={data.complianceByProduct} />
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">{t("executive.auditScoreTrend")}</h3>
          <TrendLineChart data={data.auditTrend} dataKey="score" />
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">{t("executive.capaTrend")}</h3>
          <TrendLineChart data={data.capaTrend.map((c) => ({ name: c.name, value: c.value }))} dataKey="value" color="#f59e0b" />
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">{t("executive.riskDistribution")}</h3>
          <RiskPie data={data.riskDistribution} />
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">{t("executive.capaByStatus")}</h3>
          <SimpleBarChart data={data.capaByStatus} />
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">{t("executive.findingsBySeverity")}</h3>
          <SimpleBarChart data={data.findingsBySeverity} color="#dc2626" />
        </CardContent></Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card><CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">{t("executive.topRisks")}</h3>
          {data.topRisks.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("executive.noRisks")}</p>
          ) : (
            <div className="space-y-2">
              {data.topRisks.map((r, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                  <Badge variant={riskBadge[r.level] ?? "muted"}>{t(`risk.level.${r.level}`)}</Badge>
                  <span className="flex-1">{r.hazard}</span>
                  <span className="text-xs text-muted-foreground">{r.product}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">{t("executive.topMissingDocs")}</h3>
          {data.topMissingDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("executive.noMissingDocs")}</p>
          ) : (
            <div className="space-y-2">
              {data.topMissingDocuments.map((d, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                  <FileX className="h-4 w-4 text-warning" />
                  <span className="flex-1">{d.title}</span>
                  {d.count > 1 && <Badge variant="muted">{d.count}</Badge>}
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>
      </div>
    </div>
  );
}
