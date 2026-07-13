"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/providers/i18n-provider";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptTerms) {
      setError(t("auth.register.mustAccept"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.register.passwordMismatch"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, acceptTerms: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        const raw = typeof data.error === "string" ? data.error : "";
        if (data.code === "EMAIL_EXISTS" || res.status === 409 || raw === "auth.register.emailExists") {
          setError(t("auth.register.emailExists"));
        } else if (raw.startsWith("auth.")) {
          setError(t(raw));
        } else {
          setError(raw || t("auth.register.failed"));
        }
        setLoading(false);
        return;
      }
      router.push(data.requiresVerification ? "/check-email" : "/onboarding");
      router.refresh();
    } catch {
      setError(t("auth.networkError"));
      setLoading(false);
    }
  }

  function PasswordField({
    id,
    label,
    value,
    onChange,
    autoComplete,
  }: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    autoComplete: string;
  }) {
    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <div className="relative">
          <Input
            id={id}
            type={showPassword ? "text" : "password"}
            placeholder={t("auth.register.passwordHint")}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            minLength={8}
            required
            autoComplete={autoComplete}
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
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("auth.register.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("auth.register.subtitle")}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("auth.register.name")}</label>
          <Input placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("auth.register.email")}</label>
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <PasswordField
          id="register-password"
          label={t("auth.register.password")}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <PasswordField
          id="register-confirm-password"
          label={t("auth.register.confirmPassword")}
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            required
          />
          <span>
            {t("auth.register.acceptPrefix")}{" "}
            <Link href="/terms" className="text-primary hover:underline" target="_blank">
              {t("legal.terms")}
            </Link>{" "}
            {t("auth.register.acceptAnd")}{" "}
            <Link href="/privacy" className="text-primary hover:underline" target="_blank">
              {t("legal.privacy")}
            </Link>
          </span>
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("auth.register.submitting") : t("auth.register.submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.register.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("auth.register.signin")}
        </Link>
      </p>
    </div>
  );
}
