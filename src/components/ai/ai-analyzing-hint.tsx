"use client";

import { useI18n } from "@/components/providers/i18n-provider";
import { cn } from "@/lib/utils";

/** Shown while an AI request is in progress (large models may take 1–2 minutes). */
export function AiAnalyzingHint({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {t("ai.analyzingHint")}
    </p>
  );
}
