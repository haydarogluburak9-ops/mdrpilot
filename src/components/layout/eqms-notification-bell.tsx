"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";

interface Reminder {
  id: string;
  kind: string;
  title: string;
  dueDate: string | null;
  href: string;
  priority: "high" | "medium" | "low";
}

const DISMISS_KEY = "eqms-dismissed-reminders";

function loadDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  localStorage.setItem(DISMISS_KEY, JSON.stringify([...ids]));
}

export function EqmsNotificationBell() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/eqms/reminders");
      const data = await res.json().catch(() => ({}));
      if (res.ok) setReminders(data.reminders ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setDismissed(loadDismissed());
    refresh();
  }, [refresh]);

  const visible = reminders.filter((r) => !dismissed.has(r.id));
  const count = visible.length;

  function dismiss(id: string) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    saveDismissed(next);
  }

  async function sendEmailDigest() {
    setEmailBusy(true);
    try {
      await fetch("/api/eqms/reminders/email", { method: "POST" });
    } finally {
      setEmailBusy(false);
    }
  }

  function kindLabel(kind: string): string {
    const map: Record<string, string> = {
      CAPA_DUE: "eqms.reminder.capaDue",
      CAPA_OVERDUE: "eqms.reminder.capaOverdue",
      OPERATIONAL_DUE: "eqms.reminder.operationalDue",
      DOC_REVIEW_DUE: "eqms.reminder.docReviewDue",
      DOC_REVIEW_OVERDUE: "eqms.reminder.docReviewOverdue",
      SUPPLIER_REEVAL: "eqms.reminder.supplierReeval",
      INTERNAL_AUDIT_OPEN: "eqms.reminder.internalAuditOpen",
      TRAINING_DUE: "eqms.reminder.trainingDue",
    };
    const key = map[kind] ?? "eqms.reminder.generic";
    return t(key);
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("topbar.notifications")}
        className="relative"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) refresh();
        }}
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-80 rounded-lg border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <p className="text-sm font-semibold">{t("eqms.notify.title")}</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                disabled={emailBusy}
                onClick={sendEmailDigest}
              >
                {emailBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                {t("eqms.notify.email")}
              </Button>
            </div>
            <div className="max-h-72 overflow-auto p-2">
              {loading ? (
                <p className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("eqms.revision.loading")}
                </p>
              ) : visible.length === 0 ? (
                <p className="p-2 text-xs text-muted-foreground">{t("eqms.reminder.none")}</p>
              ) : (
                <ul className="space-y-1">
                  {visible.map((r) => (
                    <li key={r.id} className="rounded-md border border-border p-2 text-xs">
                      <p className="font-medium text-[10px] uppercase text-muted-foreground">
                        {kindLabel(r.kind)}
                      </p>
                      <Link
                        href={r.href}
                        className="mt-0.5 block font-medium hover:text-primary"
                        onClick={() => setOpen(false)}
                      >
                        {r.title}
                      </Link>
                      {r.dueDate && (
                        <p className="mt-0.5 text-muted-foreground">{r.dueDate}</p>
                      )}
                      <button
                        type="button"
                        className="mt-1 text-[10px] text-muted-foreground underline"
                        onClick={() => dismiss(r.id)}
                      >
                        {t("eqms.notify.dismiss")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
