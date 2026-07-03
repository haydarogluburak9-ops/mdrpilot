"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ClipboardCheck,
  ExternalLink,
  Loader2,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";
import type { RegulatoryReminder } from "@/lib/compliance/regulatory-calendar";
import { formatDate } from "@/lib/utils";

type QualityRecord = {
  id: string;
  kind: string;
  referenceNo: string | null;
  title: string;
  status: string;
  updatedAt: string;
  href: string;
  dueDate?: string | null;
};

type QualityBundle = {
  records: QualityRecord[];
  counts: {
    complaints: number;
    capas: number;
    ncp: number;
    vigilance: number;
    fsca: number;
    changeControl: number;
  };
  reminders: RegulatoryReminder[];
};

const REMINDER_VARIANT: Record<string, "success" | "warning" | "destructive" | "muted"> = {
  OK: "success",
  DUE_SOON: "warning",
  OVERDUE: "destructive",
  NOT_APPLICABLE: "muted",
};

const KIND_ICON: Record<string, typeof ClipboardCheck> = {
  complaint: ClipboardCheck,
  capa: AlertTriangle,
  ncp: AlertTriangle,
  vigilance: ShieldAlert,
  fsca: ShieldAlert,
  "change-control": ClipboardCheck,
};

export function ProductQualityPanel({ productId, canEdit }: { productId: string; canEdit: boolean }) {
  const { t, lang } = useI18n();
  const [data, setData] = useState<QualityBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/products/${productId}/quality-records?locale=${lang}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch(() => {
        if (!cancelled) setError(t("quality.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, lang, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-destructive">{error ?? t("quality.loadError")}</p>;
  }

  const quickLinks = [
    { href: `/operational/complaints?productId=${productId}`, label: t("nav.complaints"), count: data.counts.complaints },
    { href: `/operational/capa?productId=${productId}`, label: t("nav.capa"), count: data.counts.capas },
    { href: `/operational/ncp?productId=${productId}`, label: t("operational.modules.ncp"), count: data.counts.ncp },
    { href: `/operational/vigilance?productId=${productId}`, label: t("operational.modules.vigilance"), count: data.counts.vigilance },
    { href: `/operational/fsca?productId=${productId}`, label: t("operational.modules.fsca"), count: data.counts.fsca },
    { href: `/operational/change-control?productId=${productId}`, label: t("operational.modules.changeControl"), count: data.counts.changeControl },
  ];

  return (
    <div className="space-y-4">
      {data.reminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("quality.remindersTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.reminders.map((r, i) => (
              <div
                key={`${r.kind}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.reference}</p>
                  {r.note && <p className="text-xs text-muted-foreground mt-0.5">{r.note}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.dueDate && (
                    <span className="text-xs text-muted-foreground">
                      {t("quality.due")}: {formatDate(r.dueDate)}
                    </span>
                  )}
                  <Badge variant={REMINDER_VARIANT[r.status] ?? "muted"}>
                    {t(`quality.reminder.${r.status}`)}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t("quality.recordsTitle")}</CardTitle>
          {canEdit && (
            <Link
              href={`/operational/complaints?productId=${productId}&new=1`}
              className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1" })}
            >
              <Plus className="h-4 w-4" /> {t("quality.newRecord")}
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {data.records.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("quality.noRecords")}</p>
          ) : (
            <div className="space-y-2">
              {data.records.map((rec) => {
                const Icon = KIND_ICON[rec.kind] ?? ClipboardCheck;
                return (
                  <Link
                    key={`${rec.kind}-${rec.id}`}
                    href={rec.href}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {rec.referenceNo ? `${rec.referenceNo} · ` : ""}
                          {rec.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t(`quality.kind.${rec.kind}`)} · {formatDate(rec.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">{rec.status}</Badge>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-2 sm:grid-cols-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40"
          >
            {link.label}
            <Badge variant="muted" className="ml-2">
              {link.count}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
