"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useI18n } from "@/components/providers/i18n-provider";
import { workflowStatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

export function OperationalStatusColumns<T>({
  items,
  statusOrder,
  labelPrefix,
  toneMap,
  getStatus,
  renderItem,
  focusStatus,
}: {
  items: T[];
  statusOrder: readonly string[];
  labelPrefix: string;
  toneMap: Record<string, string>;
  getStatus: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Switch to this status tab after a record status update */
  focusStatus?: string | null;
}) {
  const { t } = useI18n();

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const status of statusOrder) {
      map[status] = items.filter((item) => getStatus(item) === status).length;
    }
    return map;
  }, [items, statusOrder, getStatus]);

  const defaultTab = useMemo(() => {
    const withItems = statusOrder.find((s) => counts[s] > 0);
    return withItems ?? statusOrder[0];
  }, [statusOrder, counts]);

  const [active, setActive] = useState(defaultTab);

  useEffect(() => {
    if (!statusOrder.includes(active)) setActive(defaultTab);
  }, [active, defaultTab, statusOrder]);

  useEffect(() => {
    if (focusStatus && statusOrder.includes(focusStatus)) setActive(focusStatus);
  }, [focusStatus, statusOrder]);

  const activeGroup = items.filter((item) => getStatus(item) === active);
  const activeTone = workflowStatusTone(toneMap, active);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {statusOrder.map((status) => {
          const tone = workflowStatusTone(toneMap, status);
          const selected = active === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setActive(status)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                selected ? tone : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted",
              )}
            >
              <span>{t(`${labelPrefix}.${status}`)}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs tabular-nums",
                  selected ? "bg-background/70" : "bg-background text-foreground/70",
                )}
              >
                {counts[status] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <section className="space-y-3">
        <div className={cn("rounded-lg border px-3 py-2 shadow-sm", activeTone)}>
          <h3 className="text-sm font-semibold">{t(`${labelPrefix}.${active}`)}</h3>
        </div>
        {activeGroup.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">{t("operational.statusColumnEmpty")}</p>
        ) : (
          activeGroup.map((item) => renderItem(item))
        )}
      </section>
    </div>
  );
}
