"use client";

import { Badge } from "./badge";
import { useI18n } from "@/components/providers/i18n-provider";
import { cn } from "@/lib/utils";
import type { DocStatus, RiskLevel } from "@/lib/domain/types";

/** GSPR / doc status pill colors: missing=red, draft=white, review=yellow, approved=green */
export const STATUS_TONE_CLASS: Record<DocStatus, string> = {
  MISSING: "border-destructive/50 bg-destructive/15 text-destructive",
  DRAFT: "border-border bg-white text-foreground shadow-sm dark:bg-card",
  IN_REVIEW: "border-warning/50 bg-warning/20 text-warning-foreground",
  APPROVED: "border-success/50 bg-success/15 text-success",
  REJECTED: "border-destructive/50 bg-destructive/15 text-destructive",
};

/** CAPA workflow: open=blue, in progress=amber, closed=green, overdue=red */
export const CAPA_STATUS_TONE_CLASS: Record<string, string> = {
  OPEN: "border-primary/50 bg-primary/10 text-primary",
  IN_PROGRESS: "border-warning/50 bg-warning/20 text-warning-foreground",
  CLOSED: "border-success/50 bg-success/15 text-success",
  OVERDUE: "border-destructive/50 bg-destructive/15 text-destructive font-semibold",
};

/** Complaint workflow: open=blue, monitoring/CAPA=amber, closed=green */
export const COMPLAINT_STATUS_TONE_CLASS: Record<string, string> = {
  OPEN: "border-primary/50 bg-primary/10 text-primary",
  MONITORING: "border-warning/50 bg-warning/20 text-warning-foreground",
  CLOSED: "border-success/50 bg-success/15 text-success",
};

/** Generic operational records (IA, NCP, FSCA, etc.) */
export const OPERATIONAL_STATUS_TONE_CLASS: Record<string, string> = {
  OPEN: "border-primary/50 bg-primary/10 text-primary",
  IN_PROGRESS: "border-warning/50 bg-warning/20 text-warning-foreground",
  MONITORING: "border-warning/50 bg-warning/20 text-warning-foreground",
  CLOSED: "border-success/50 bg-success/15 text-success",
  OVERDUE: "border-destructive/50 bg-destructive/15 text-destructive font-semibold",
};

export function workflowStatusTone(
  toneMap: Record<string, string>,
  status: string,
): string {
  return toneMap[status] ?? "border-border bg-card text-foreground";
}

export function CapaStatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useI18n();
  return (
    <Badge
      variant="outline"
      className={cn("rounded-md font-medium", workflowStatusTone(CAPA_STATUS_TONE_CLASS, status), className)}
    >
      {t(`capaStatus.${status}`)}
    </Badge>
  );
}

export function ComplaintStatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useI18n();
  return (
    <Badge
      variant="outline"
      className={cn("rounded-md font-medium", workflowStatusTone(COMPLAINT_STATUS_TONE_CLASS, status), className)}
    >
      {t(`complaintStatus.${status}`)}
    </Badge>
  );
}

export function WorkflowStatusSelect({
  value,
  options,
  labelPrefix,
  toneMap,
  onChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  options: readonly string[];
  labelPrefix: string;
  toneMap: Record<string, string>;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const { t } = useI18n();

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className={cn(
        "min-w-[9.5rem] rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
        workflowStatusTone(toneMap, value),
        className,
      )}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {t(`${labelPrefix}.${opt}`)}
        </option>
      ))}
    </select>
  );
}

export function StatusBadge({ status, className }: { status: DocStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <Badge
      variant="outline"
      className={cn("rounded-md font-medium", STATUS_TONE_CLASS[status], className)}
    >
      {t(`status.${status}`)}
    </Badge>
  );
}

const riskVariant: Record<RiskLevel, React.ComponentProps<typeof Badge>["variant"]> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "destructive",
  CRITICAL: "destructive",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const { t } = useI18n();
  return <Badge variant={riskVariant[level]}>{t(`risk.level.${level}`)}</Badge>;
}
