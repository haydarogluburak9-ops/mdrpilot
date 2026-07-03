"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/providers/i18n-provider";

function ResetForm() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? t("auth.reset.failed"));
      setLoading(false);
      return;
    }
    router.push("/login");
  }

  if (!token) {
    return <p className="text-sm text-destructive">{t("auth.reset.invalid")}</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <Input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("auth.reset.submitting") : t("auth.reset.submit")}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { t } = useI18n();
  return (
    <div>
      <h1 className="text-2xl font-bold">{t("auth.reset.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("auth.reset.subtitle")}</p>
      <Suspense>
        <ResetForm />
      </Suspense>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">
          {t("auth.forgot.back")}
        </Link>
      </p>
    </div>
  );
}
