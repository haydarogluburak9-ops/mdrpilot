"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { StatusBadge, STATUS_TONE_CLASS } from "@/components/ui/status-badge";
import { useI18n } from "@/components/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { qmsStatusOptions } from "@/lib/qms/document-status";
import type { DocStatus } from "@/lib/domain/types";

export function QmsDocStatusSelect({
  docId,
  storedStatus,
  canEdit,
  canApprove,
}: {
  docId: string;
  storedStatus: DocStatus;
  canEdit: boolean;
  canApprove: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [status, setStatus] = useState(storedStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<DocStatus | null>(null);

  useEffect(() => {
    const pending = pendingRef.current;
    if (pending) {
      if (storedStatus === pending) {
        pendingRef.current = null;
        setStatus(storedStatus);
      } else {
        setStatus(pending);
      }
      return;
    }
    setStatus(storedStatus);
  }, [storedStatus]);

  async function onChange(next: DocStatus) {
    if (!canEdit || next === status) return;
    const previous = status;
    pendingRef.current = next;
    setStatus(next);
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/qms/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        pendingRef.current = null;
        setStatus(previous);
        const key = typeof data.error === "string" ? data.error : "qms.status.err.generic";
        setError(t(key) !== key ? t(key) : key);
        return;
      }
      pendingRef.current = null;
      setStatus((data.item?.status as DocStatus) ?? next);
      router.refresh();
    } catch {
      pendingRef.current = null;
      setStatus(previous);
      setError(t("qms.status.err.generic"));
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return <StatusBadge status={status} />;
  }

  const options = qmsStatusOptions(canApprove);

  return (
    <div className="min-w-[120px]">
      <select
        value={status}
        disabled={saving}
        onChange={(e) => onChange(e.target.value as DocStatus)}
        className={cn("w-full rounded-md border px-2 py-1.5 text-xs font-medium", STATUS_TONE_CLASS[status])}
        aria-label={t("qms.col.status")}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {t(`status.${opt}`)}
          </option>
        ))}
      </select>
      {saving && <Loader2 className="mt-1 h-3 w-3 animate-spin text-muted-foreground" />}
      {error && <p className="mt-1 text-[10px] leading-snug text-destructive">{error}</p>}
    </div>
  );
}
