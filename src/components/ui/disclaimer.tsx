"use client";

import { ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/i18n-provider";

export function Disclaimer({
  className,
  text,
  variant = "warning",
}: {
  className?: string;
  text?: string;
  variant?: "warning" | "info";
}) {
  const { t } = useI18n();
  if (variant === "info") {
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground",
          className,
        )}
      >
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>{text ?? t("common.aiDraftNotice")}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground",
        className,
      )}
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <span>{text ?? t("common.disclaimer")}</span>
    </div>
  );
}

// Compact inline AI-draft trust badge for headers and cards.
export function AiDraftBadge({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary",
        className,
      )}
    >
      <Sparkles className="h-3 w-3" /> {t("common.aiDraftBadge")}
    </span>
  );
}
