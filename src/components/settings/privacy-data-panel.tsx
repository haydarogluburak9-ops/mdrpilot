"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Trash2 } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function PrivacyDataPanel({ isOwner }: { isOwner: boolean }) {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <Card className="lg:col-span-2 border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          {t("settings.privacy.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">{t("settings.privacy.desc")}</p>
        <p className="text-sm text-muted-foreground">
          <Link href="/privacy" className="text-primary hover:underline">
            {t("legal.privacy")}
          </Link>
          {" · "}
          <Link href="/terms" className="text-primary hover:underline">
            {t("legal.terms")}
          </Link>
        </p>

        {isOwner ? (
          <DeleteBlock
            title={t("settings.privacy.deleteCompanyTitle")}
            desc={t("settings.privacy.deleteCompanyDesc")}
            confirmPhrase="FIRMA VERILERINI SIL"
            confirmLabel={t("settings.privacy.deleteCompanyConfirm")}
            buttonLabel={t("settings.privacy.deleteCompanyButton")}
            endpoint="/api/settings/delete-company"
            onSuccess={() => router.push("/login")}
          />
        ) : null}

        <DeleteBlock
          title={t("settings.privacy.deleteAccountTitle")}
          desc={t("settings.privacy.deleteAccountDesc")}
          confirmPhrase="HESABIMI SIL"
          confirmLabel={t("settings.privacy.deleteAccountConfirm")}
          buttonLabel={t("settings.privacy.deleteAccountButton")}
          endpoint="/api/settings/delete-account"
          onSuccess={() => router.push("/login")}
        />
      </CardContent>
    </Card>
  );
}

function DeleteBlock({
  title,
  desc,
  confirmPhrase,
  confirmLabel,
  buttonLabel,
  endpoint,
  onSuccess,
}: {
  title: string;
  desc: string;
  confirmPhrase: string;
  confirmLabel: string;
  buttonLabel: string;
  endpoint: string;
  onSuccess: () => void;
}) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onDelete() {
    if (confirm !== confirmPhrase) {
      setError(confirmLabel);
      return;
    }
    if (!window.confirm(t("settings.privacy.finalConfirm"))) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirm: confirmPhrase }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("settings.privacy.deleteFailed"));
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.privacy.deleteFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <h3 className="font-semibold text-destructive">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("settings.privacy.password")}</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{confirmLabel}</label>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={confirmPhrase} />
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <Button
        type="button"
        variant="destructive"
        className="mt-4 gap-1.5"
        disabled={loading}
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
        {loading ? t("settings.privacy.deleting") : buttonLabel}
      </Button>
    </div>
  );
}
