"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { translateGsprApiError } from "@/lib/domain/gspr-api-errors";

export function GsprBulkStatusButtons({
  productId,
  canEdit,
  canApprove,
}: {
  productId: string;
  canEdit: boolean;
  canApprove: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState<"IN_REVIEW" | "APPROVED" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!canEdit) return null;

  async function run(status: "IN_REVIEW" | "APPROVED") {
    setLoading(status);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${productId}/gspr/bulk-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(translateGsprApiError(data.error, t));
        return;
      }
      setMessage(
        t("gspr.bulk.result")
          .replace("{updated}", String(data.updated ?? 0))
          .replace("{skipped}", String(data.skipped ?? 0)),
      );
      router.refresh();
    } catch {
      setMessage(t("gspr.status.err.generic"));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!!loading}
          onClick={() => run("IN_REVIEW")}
        >
          {loading === "IN_REVIEW" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {t("gspr.bulkReview")}
        </Button>
        {canApprove && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-success"
            disabled={!!loading}
            onClick={() => run("APPROVED")}
          >
            {loading === "APPROVED" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {t("gspr.bulkApprove")}
          </Button>
        )}
      </div>
      {message && <p className="max-w-md text-right text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
