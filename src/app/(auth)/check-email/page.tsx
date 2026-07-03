"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";

export default function CheckEmailPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setSending(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("auth.checkEmail.resendFailed"));
        return;
      }
      setMessage(
        data.alreadyVerified ? t("auth.checkEmail.alreadyVerified") : t("auth.checkEmail.sent"),
      );
      if (data.alreadyVerified) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError(t("auth.networkError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("auth.checkEmail.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("auth.checkEmail.subtitle")}</p>

      <div className="mt-8 space-y-3">
        <Button type="button" className="w-full" disabled={sending} onClick={resend}>
          {sending ? t("auth.checkEmail.sending") : t("auth.checkEmail.resend")}
        </Button>
        {message && <p className="text-sm text-success">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("auth.checkEmail.backToLogin")}
        </Link>
      </p>
    </div>
  );
}
