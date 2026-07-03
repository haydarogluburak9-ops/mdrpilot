"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";
import type { EqmsReminder } from "@/lib/eqms/reminders";

const KIND_LABEL: Record<string, string> = {
  CAPA_DUE: "eqms.reminder.capaDue",
  CAPA_OVERDUE: "eqms.reminder.capaOverdue",
  OPERATIONAL_DUE: "eqms.reminder.operationalDue",
  DOC_REVIEW_DUE: "eqms.reminder.docReviewDue",
  DOC_REVIEW_OVERDUE: "eqms.reminder.docReviewOverdue",
  SUPPLIER_REEVAL: "eqms.reminder.supplierReeval",
  INTERNAL_AUDIT_OPEN: "eqms.reminder.internalAuditOpen",
  TRAINING_DUE: "eqms.reminder.trainingDue",
};

export function EqmsRemindersCard() {
  const { t } = useI18n();
  const [reminders, setReminders] = useState<EqmsReminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/eqms/reminders");
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) setReminders(data.reminders ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const high = reminders.filter((r) => r.priority === "high");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-primary" />
          {t("eqms.reminder.title")}
          {!loading && reminders.length > 0 && (
            <Badge variant={high.length > 0 ? "destructive" : "secondary"} className="text-[10px]">
              {reminders.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
          </p>
        ) : reminders.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("eqms.reminder.none")}</p>
        ) : (
          <ul className="space-y-2">
            {reminders.slice(0, 8).map((r) => (
              <li key={r.id}>
                <Link
                  href={r.href}
                  className="flex items-start gap-2 rounded-md border border-border p-2 text-sm hover:bg-muted/50"
                >
                  {r.priority === "high" ? (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                  ) : (
                    <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{r.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {t(KIND_LABEL[r.kind] ?? "eqms.reminder.generic")}
                      {r.dueDate ? ` · ${r.dueDate}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
