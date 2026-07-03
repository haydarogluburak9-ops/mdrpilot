"use client";

import Link from "next/link";
import { ClipboardCheck, ExternalLink } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScoreRing } from "@/components/ui/score-ring";
import { Disclaimer } from "@/components/ui/disclaimer";
import { ExportButtons } from "@/components/modules/export-buttons";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { computeAuditReadiness, bandFromScore } from "@/lib/domain/scoring";
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import type { Product } from "@/lib/domain/types";
import type { ClauseGap } from "@/lib/rag/audit-gaps";
import { binaryContentLang, type Lang } from "@/lib/i18n/locales";
import type { AuditGap, AuditReadinessSummary } from "@/lib/audit-readiness/types";

export const BREAKDOWN_KEY: Record<string, string> = {
  "Technical file completeness": "audit.bd.tech",
  "GSPR evidence coverage": "audit.bd.gspr",
  "Risk file completeness": "audit.bd.risk",
  "IFU / risk alignment": "audit.bd.ifu",
  "PSUR / PMS report (TF reference)": "audit.bd.pms",
  "Risk management module": "audit.bd.riskModule",
};

function severityColor(severity: AuditGap["severity"]) {
  if (severity === "major") return "hsl(var(--destructive))";
  if (severity === "minor") return "hsl(var(--warning))";
  return "hsl(var(--muted-foreground))";
}

function GapList({ gaps, lang }: { gaps: AuditGap[]; lang: Lang }) {
  const { t } = useI18n();
  const contentLang = binaryContentLang(lang);
  if (gaps.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("audit.gaps.none")}</p>;
  }
  return (
    <ul className="space-y-2">
      {gaps.map((g) => (
        <li key={g.id} className="rounded-lg border border-border p-3 text-sm">
          <div className="flex flex-wrap items-start gap-2">
            <span
              className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ background: severityColor(g.severity) }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{g.severity}</Badge>
                <Badge variant="secondary" className="text-[10px]">{g.category}</Badge>
                <span className="font-medium">
                  {g.standardCode} {g.clauseRef}
                </span>
                {g.productName && (
                  <span className="text-xs text-muted-foreground">— {g.productName}</span>
                )}
              </div>
              <p className="mt-1 font-medium">
                {contentLang === "tr" ? g.titleTr : g.titleEn}
              </p>
              <p className="text-muted-foreground">
                {contentLang === "tr" ? g.messageTr : g.messageEn}
              </p>
              {g.actionHref && (
                <Link
                  href={g.actionHref}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {contentLang === "tr" ? g.actionLabelTr : g.actionLabelEn}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AuditView({
  products,
  clauseGaps,
  readiness,
}: {
  products: Product[];
  clauseGaps: Record<string, ClauseGap[]>;
  readiness: AuditReadinessSummary;
}) {
  const { t, lang } = useI18n();

  if (products.length === 0) {
    return (
      <div>
        <PageHeader title={t("audit.title")} description={t("audit.desc")} />
        <EmptyState icon={ClipboardCheck} title={t("products.title")} description={t("products.desc")} />
      </div>
    );
  }

  const rows = products.map((p) => ({ product: p, readiness: computeAuditReadiness(p) }));
  const portfolio = Math.round(rows.reduce((a, r) => a + r.readiness.score, 0) / rows.length);

  const majorGaps = readiness.gaps.filter((g) => g.severity === "major");
  const minorGaps = readiness.gaps.filter((g) => g.severity === "minor");
  const observations = readiness.gaps.filter((g) => g.severity === "observation");

  return (
    <div>
      <PageHeader title={t("audit.title")} description={t("audit.desc")} />

      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("audit.overallScore")}</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <ScoreRing score={readiness.overallScore} size={120} label={t(`band.${bandFromScore(readiness.overallScore)}`)} />
            <Disclaimer className="mt-3 text-[10px]" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("audit.qmsScore")}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ScoreRing score={readiness.qmsScore} size={80} strokeWidth={6} />
            <p className="text-muted-foreground">
              {t("audit.qmsApproved")}: {readiness.qmsApproved}/{readiness.qmsTotal}
            </p>
            <p className="text-muted-foreground">
              {t("audit.contentScore")}: {readiness.contentScorePercent}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("audit.mdrScore")}</CardTitle></CardHeader>
          <CardContent>
            <ScoreRing score={readiness.mdrScore} size={80} strokeWidth={6} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("audit.findingCounts")}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-destructive font-medium">{readiness.majorCount}</span> {t("audit.major")}</p>
            <p><span className="font-medium text-amber-600">{readiness.minorCount}</span> {t("audit.minor")}</p>
            <p><span className="text-muted-foreground">{readiness.observationCount}</span> {t("audit.observation")}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="gaps" className="space-y-4">
        <TabsList>
          <TabsTrigger value="gaps">{t("audit.tab.gaps")}</TabsTrigger>
          <TabsTrigger value="devices">{t("audit.tab.devices")}</TabsTrigger>
        </TabsList>

        <TabsContent value="gaps" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("audit.majorGaps")}</CardTitle></CardHeader>
            <CardContent>
              <GapList gaps={majorGaps} lang={lang} />
            </CardContent>
          </Card>
          {minorGaps.length > 0 && (
            <Card>
              <CardHeader><CardTitle>{t("audit.minorGaps")}</CardTitle></CardHeader>
              <CardContent>
                <GapList gaps={minorGaps} lang={lang} />
              </CardContent>
            </Card>
          )}
          {observations.length > 0 && (
            <Card>
              <CardHeader><CardTitle>{t("audit.observations")}</CardTitle></CardHeader>
              <CardContent>
                <GapList gaps={observations} lang={lang} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="devices">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle>{t("audit.portfolioReadiness")}</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center">
                <ScoreRing score={portfolio} size={140} label={t(`band.${bandFromScore(portfolio)}`)} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>{t("audit.perDevice")}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {rows.map(({ product, readiness: deviceReadiness }) => (
                  <div key={product.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Link href={`/products/${product.id}`} className="font-medium hover:underline">
                          {product.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{DEVICE_CLASS_LABEL[product.deviceClass]}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <ExportButtons productId={product.id} items={[{ type: "AUDIT_READINESS_PDF", label: "PDF" }]} />
                        <ScoreRing score={deviceReadiness.score} size={64} strokeWidth={6} label={t(`band.${deviceReadiness.band}`)} />
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {deviceReadiness.breakdown.map((b) => (
                        <div key={b.label}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{t(BREAKDOWN_KEY[b.label] ?? b.label)}</span>
                            <span className="font-medium">{b.value}%</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${b.value}%`,
                                background:
                                  b.value >= 80
                                    ? "hsl(var(--success))"
                                    : b.value >= 50
                                      ? "hsl(var(--warning))"
                                      : "hsl(var(--destructive))",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {(clauseGaps[product.id]?.length ?? 0) > 0 && (
                      <div className="mt-4 border-t border-border pt-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">{t("audit.clauseGaps")}</p>
                        <ul className="space-y-1.5">
                          {clauseGaps[product.id].map((g, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs">
                              <span
                                className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full"
                                style={{ background: g.severity === "high" ? "hsl(var(--destructive))" : "hsl(var(--warning))" }}
                              />
                              <span>
                                <span className="font-medium">{g.standardCode} {g.clauseNo}</span>
                                <span className="text-muted-foreground"> — {g.message}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
