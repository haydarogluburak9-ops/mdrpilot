"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  FileCheck2,
  FileWarning,
  Gauge,
  ClipboardList,
  MessageSquare,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CompanyProfile } from "./page";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CapaStatusBadge, ComplaintStatusBadge, RiskBadge } from "@/components/ui/status-badge";
import {
  ComplianceByProductChart,
  RiskDistributionChart,
  DocCompletionChart,
  MissingClausesChart,
} from "@/components/charts/dashboard-charts";
import { DEVICE_CLASS_LABEL, riskLevelFromScore } from "@/lib/domain/constants";
import { formatDate } from "@/lib/utils";
import type { Product, RiskLevel } from "@/lib/domain/types";
import { EqmsRemindersCard } from "@/components/eqms/eqms-reminders-card";

interface Capa {
  id: string;
  title: string;
  referenceNo: string | null;
  status: string;
  dueDate: string | null;
  product: string;
}

interface Complaint {
  id: string;
  title: string;
  complaintNo: string | null;
  status: string;
  receivedAt: string;
}

const GOAL_CTA: Record<string, { href: string; labelKey: string }> = {
  GENERATE: { href: "/composer", labelKey: "dashboard.cta.composer" },
  GAPS: { href: "/consultant", labelKey: "dashboard.cta.consultant" },
  AUDIT: { href: "/audit-simulator", labelKey: "dashboard.cta.audit" },
};

export function DashboardView({
  products,
  capas,
  complaints,
  companyName,
  profile,
}: {
  products: Product[];
  capas: Capa[];
  complaints: Complaint[];
  companyName?: string;
  profile?: CompanyProfile | null;
}) {
  const { t } = useI18n();
  const goalCta = profile?.goal ? GOAL_CTA[profile.goal] : GOAL_CTA.GAPS;

  const totalProducts = products.length;
  const allSections = products.flatMap((p) => p.technicalSections);
  const readyFiles = products.filter(
    (p) => p.technicalSections.length > 0 && p.technicalSections.every((s) => s.status === "APPROVED"),
  ).length;
  const missingDocs = allSections.filter((s) => s.status === "MISSING").length;
  const avgScore = totalProducts
    ? Math.round(products.reduce((a, p) => a + p.complianceScore, 0) / totalProducts)
    : 0;
  const openCapas = capas.filter((c) => c.status !== "CLOSED").length;
  const openComplaints = complaints.filter((c) => c.status !== "CLOSED").length;
  const highRiskProducts = products.filter((p) =>
    p.riskItems.some((r) => r.initialRiskLevel === "HIGH" || r.initialRiskLevel === "CRITICAL"),
  ).length;

  const complianceData = products.map((p) => ({ name: p.name, score: p.complianceScore }));

  const allRisks = products.flatMap((p) => p.riskItems);
  const riskDist = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((lvl) => ({
    name: lvl[0] + lvl.slice(1).toLowerCase(),
    value: allRisks.filter((r) => r.initialRiskLevel === lvl).length,
  }));

  const completion = allSections.length
    ? Math.round((allSections.filter((s) => s.status === "APPROVED").length / allSections.length) * 100)
    : 0;

  const missingClauses = products.map((p) => ({
    name: p.model ?? p.name.slice(0, 8),
    mdr: p.technicalSections.filter((s) => s.status === "MISSING").length,
    iso: p.gsprItems.filter((g) => g.status === "MISSING").length,
  }));

  return (
    <div>
      <PageHeader title={t("dashboard.title")} description={t("dashboard.desc")} />

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">{companyName}</p>
            <p className="text-sm text-muted-foreground">
              {profile?.industry ? `${profile.industry[0]}${profile.industry.slice(1).toLowerCase()} · ` : ""}
              {profile?.standards?.length ? profile.standards.join(" · ") : "MDR · ISO 13485"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/demo/tour"><Button variant="outline">{t("nav.demo")}</Button></Link>
          <Link href={goalCta.href}><Button className="gap-2">{t(goalCta.labelKey)} <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("dashboard.totalProducts")} value={totalProducts} icon={Boxes} />
        <StatCard label={t("dashboard.readyFiles")} value={readyFiles} icon={FileCheck2} tone="success" />
        <StatCard label={t("dashboard.missingDocs")} value={missingDocs} icon={FileWarning} tone="danger" />
        <StatCard label={t("dashboard.avgScore")} value={`${avgScore}%`} icon={Gauge} tone="warning" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("dashboard.openCapas")} value={openCapas} icon={ClipboardList} tone="warning" />
        <StatCard label={t("dashboard.highRisk")} value={highRiskProducts} icon={AlertTriangle} tone="danger" />
        <StatCard label={t("dashboard.openComplaints")} value={openComplaints} icon={MessageSquare} tone="warning" />
        <StatCard label={t("dashboard.avgCompletion")} value={`${completion}%`} icon={FileCheck2} tone="success" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("dashboard.chartCompliance")}</CardTitle></CardHeader>
          <CardContent><ComplianceByProductChart data={complianceData} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("dashboard.chartCompletion")}</CardTitle></CardHeader>
          <CardContent><DocCompletionChart value={completion} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("dashboard.chartRisk")}</CardTitle></CardHeader>
          <CardContent><RiskDistributionChart data={riskDist} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("dashboard.chartMissing")}</CardTitle></CardHeader>
          <CardContent><MissingClausesChart data={missingClauses} /></CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <EqmsRemindersCard />
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{t("dashboard.attention")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {products.map((p) => {
              const order: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
              const worst = p.riskItems.reduce<RiskLevel>((acc, r) => {
                const lvl = riskLevelFromScore(r.initialSeverity, r.initialProbability);
                return order.indexOf(lvl) > order.indexOf(acc) ? lvl : acc;
              }, "LOW");
              return (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {DEVICE_CLASS_LABEL[p.deviceClass]} · {p.brand}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <RiskBadge level={worst} />
                    <Badge
                      variant={p.complianceScore >= 80 ? "success" : p.complianceScore >= 50 ? "warning" : "destructive"}
                    >
                      {p.complianceScore}%
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{t("dashboard.recentCapas")}</CardTitle>
            <Link href="/operational/capa" className="text-xs text-primary hover:underline">{t("nav.capa")}</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {capas.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("capa.empty")}</p>
            ) : (
              capas.map((c) => (
                <Link
                  key={c.id}
                  href="/operational/capa"
                  className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {c.referenceNo && (
                        <Badge variant="secondary" className="font-mono text-xs shrink-0">{c.referenceNo}</Badge>
                      )}
                      <p className="truncate text-sm font-medium">{c.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.product}{c.dueDate ? ` · ${formatDate(c.dueDate)}` : ""}
                    </p>
                  </div>
                  <CapaStatusBadge status={c.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{t("dashboard.recentComplaints")}</CardTitle>
            <Link href="/operational/complaints" className="text-xs text-primary hover:underline">{t("nav.complaints")}</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {complaints.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("complaints.empty")}</p>
            ) : (
              complaints.map((c) => (
                <Link
                  key={c.id}
                  href="/operational/complaints"
                  className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {c.complaintNo && (
                        <Badge variant="secondary" className="font-mono text-xs shrink-0">{c.complaintNo}</Badge>
                      )}
                      <p className="truncate text-sm font-medium">{c.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(c.receivedAt)}</p>
                  </div>
                  <ComplaintStatusBadge status={c.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
