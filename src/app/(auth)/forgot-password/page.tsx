"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/providers/i18n-provider";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("auth.forgot.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("auth.forgot.subtitle")}</p>
      {sent ? (
        <p className="mt-6 text-sm text-success">{t("auth.forgot.sent")}</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("auth.forgot.submitting") : t("auth.forgot.submit")}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">
          {t("auth.forgot.back")}
        </Link>
      </p>
    </div>
  );
}
