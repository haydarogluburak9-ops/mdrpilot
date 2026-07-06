"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type SetupPayload = {
  qrDataUrl: string;
  manualKey: string;
};

export function TwoFactorPanel() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/settings/two-factor");
        const data = await res.json();
        if (res.ok) setEnabled(Boolean(data.enabled));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function startSetup() {
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const res = await fetch("/api/settings/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("settings.twoFactor.setupFailed"));
      setSetup({ qrDataUrl: data.qrDataUrl, manualKey: data.manualKey });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.twoFactor.setupFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const res = await fetch("/api/settings/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", code: confirmCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("settings.twoFactor.confirmFailed"));
      setEnabled(true);
      setSetup(null);
      setConfirmCode("");
      setSuccess(t("settings.twoFactor.enabledSuccess"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.twoFactor.confirmFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function cancelSetup() {
    setBusy(true);
    try {
      await fetch("/api/settings/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
    } finally {
      setSetup(null);
      setConfirmCode("");
      setBusy(false);
    }
  }

  async function disable2fa(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const res = await fetch("/api/settings/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disable",
          password: disablePassword,
          code: disableCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("settings.twoFactor.disableFailed"));
      setEnabled(false);
      setDisablePassword("");
      setDisableCode("");
      setSuccess(t("settings.twoFactor.disabledSuccess"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.twoFactor.disableFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          {t("settings.twoFactor.title")}
          {enabled ? (
            <Badge variant="success" className="ml-1">
              {t("settings.twoFactor.statusOn")}
            </Badge>
          ) : (
            <Badge variant="secondary" className="ml-1">
              {t("settings.twoFactor.statusOff")}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">{t("settings.twoFactor.desc")}</p>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : enabled ? (
          <form onSubmit={disable2fa} className="space-y-3">
            <p className="text-sm">{t("settings.twoFactor.disableDesc")}</p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("settings.security.currentPassword")}</label>
              <Input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("settings.twoFactor.code")}</label>
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                required
                autoComplete="one-time-code"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{success}</p> : null}
            <Button type="submit" variant="destructive" disabled={busy} className="gap-2">
              <ShieldOff className="h-4 w-4" />
              {busy ? t("settings.twoFactor.disabling") : t("settings.twoFactor.disable")}
            </Button>
          </form>
        ) : setup ? (
          <form onSubmit={confirmSetup} className="space-y-4">
            <p className="text-sm">{t("settings.twoFactor.scanQr")}</p>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Image
                src={setup.qrDataUrl}
                alt={t("settings.twoFactor.qrAlt")}
                width={220}
                height={220}
                className="rounded-lg border bg-white p-2"
                unoptimized
              />
              <div className="space-y-2 text-sm">
                <p className="font-medium">{t("settings.twoFactor.manualKey")}</p>
                <code className="block break-all rounded-md bg-muted px-2 py-1 text-xs">{setup.manualKey}</code>
                <p className="text-muted-foreground">{t("settings.twoFactor.appsHint")}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("settings.twoFactor.enterCode")}</label>
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                required
                autoComplete="one-time-code"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy || confirmCode.length !== 6}>
                {busy ? t("settings.twoFactor.confirming") : t("settings.twoFactor.confirm")}
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => void cancelSetup()}>
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{success}</p> : null}
            <Button onClick={() => void startSetup()} disabled={busy}>
              {busy ? t("settings.twoFactor.settingUp") : t("settings.twoFactor.enable")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
