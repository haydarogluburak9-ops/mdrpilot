"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/providers/i18n-provider";

type Metric = { label: string; value: number; trend: "up" | "down" | "flat"; href?: string };

const LABEL_KEYS: Record<string, string> = {
  complaints_6m: "analytics.complaints6m",
  capa_6m: "analytics.capa6m",
  vigilance_6m: "analytics.vigilance6m",
  calibration_records: "analytics.calibration",
  open_capa: "analytics.openCapa",
};

function TrendIcon({ trend }: { trend: Metric["trend"] }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-amber-600" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-emerald-600" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export function AnalyticsTrendsView() {
  const { t } = useI18n();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/trends")
      .then((r) => r.json())
      .then((d) => setMetrics(d.metrics ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title={t("analytics.title")} description={t("analytics.desc")} />
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((m) => (
            <Card key={m.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{t(LABEL_KEYS[m.label] ?? m.label)}</span>
                  <TrendIcon trend={m.trend} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{m.value}</p>
                {m.href && (
                  <Link href={m.href} className="text-xs text-primary hover:underline mt-2 inline-block">
                    {t("analytics.viewModule")}
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
