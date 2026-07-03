"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type BillingPeriod = "monthly" | "annual";

export function BillingPeriodToggle({
  value,
  onChange,
  monthlyLabel,
  annualLabel,
  savingsHint,
  className,
}: {
  value: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
  monthlyLabel: string;
  annualLabel: string;
  savingsHint?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        className="inline-flex rounded-xl border-2 border-primary/30 bg-card p-1 shadow-sm"
        role="group"
        aria-label={`${monthlyLabel} / ${annualLabel}`}
      >
        <button
          type="button"
          onClick={() => onChange("monthly")}
          className={cn(
            "min-w-[7rem] rounded-lg px-5 py-2.5 text-sm font-semibold transition-all",
            value === "monthly"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {monthlyLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange("annual")}
          className={cn(
            "min-w-[7rem] rounded-lg px-5 py-2.5 text-sm font-semibold transition-all",
            value === "annual"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            {annualLabel}
            {savingsHint && (
              <Badge variant="success" className="px-1.5 py-0 text-[10px] leading-4">
                {savingsHint}
              </Badge>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
