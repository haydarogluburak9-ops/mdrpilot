"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/providers/i18n-provider";

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function postLoginPath(
  data: { hasCompany?: boolean; requiresVerification?: boolean },
  next: string | null,
): string {
  if (data.requiresVerification) return "/check-email";
  if (data.hasCompany) return safeNextPath(next) ?? "/dashboard";
  return "/onboarding";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("auth.login.failed"));
        setLoading(false);
        return;
      }
      router.push(postLoginPath(data, searchParams.get("next")));
      router.refresh();
    } catch {
      setError(t("auth.networkError"));
      setLoading(false);
    }
  }

  return (
    <>
      {searchParams.get("reason") === "idle" && (
        <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-900 dark:text-amber-200">
          {t("auth.login.idleLogout")}
        </p>
      )}
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("auth.login.email")}</label>
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">{t("auth.login.password")}</label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              {t("auth.login.forgot")}
            </Link>
          </div>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("auth.login.submitting") : t("auth.login.submit")}
        </Button>
      </form>
    </>
  );
}

export default function LoginPage() {
  const { t } = useI18n();

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("auth.login.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("auth.login.subtitle")}</p>

      <Suspense fallback={<p className="mt-8 text-sm text-muted-foreground">{t("common.loading")}</p>}>
        <LoginForm />
      </Suspense>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.login.noAccount")}{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t("auth.login.createOne")}
        </Link>
      </p>
    </div>
  );
}
