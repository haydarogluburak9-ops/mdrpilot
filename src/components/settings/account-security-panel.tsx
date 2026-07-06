"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AccountSecurityPanel() {
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError(t("settings.security.passwordMismatch"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/settings/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("settings.security.changeFailed"));
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.security.changeFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          {t("settings.security.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">{t("settings.security.desc")}</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <PasswordField
            label={t("settings.security.currentPassword")}
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
            showLabel={t("auth.login.showPassword")}
            hideLabel={t("auth.login.hidePassword")}
          />
          <PasswordField
            label={t("settings.security.newPassword")}
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            onToggle={() => setShowNew((v) => !v)}
            showLabel={t("auth.login.showPassword")}
            hideLabel={t("auth.login.hidePassword")}
            minLength={8}
          />
          <PasswordField
            label={t("settings.security.confirmPassword")}
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showNew}
            onToggle={() => setShowNew((v) => !v)}
            showLabel={t("auth.login.showPassword")}
            hideLabel={t("auth.login.hidePassword")}
            minLength={8}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{t("settings.security.changed")}</p> : null}
          <Button type="submit" disabled={loading}>
            {loading ? t("settings.security.saving") : t("settings.security.submit")}
          </Button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">
          {t("settings.security.forgotHint")}{" "}
          <Link href="/forgot-password" className="text-primary hover:underline">
            {t("auth.login.forgot")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  showLabel,
  hideLabel,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
  minLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={minLength}
          className="pr-10"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
          aria-label={show ? hideLabel : showLabel}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
