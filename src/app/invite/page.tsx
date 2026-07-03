"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";

function InviteAccept() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function accept() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/team/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? t("team.invite.failed"));
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (!token) {
    return <p className="text-sm text-destructive">{t("team.invite.invalid")}</p>;
  }

  return (
    <div className="mt-6 space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={accept} disabled={loading} className="w-full">
        {loading ? t("team.invite.accepting") : t("team.invite.accept")}
      </Button>
      <p className="text-xs text-muted-foreground">{t("team.invite.loginHint")}</p>
      <Link href="/login" className="text-sm text-primary hover:underline">
        {t("landing.nav.signin")}
      </Link>
    </div>
  );
}

export default function InvitePage() {
  const { t } = useI18n();
  return (
    <div className="container flex min-h-screen max-w-md items-center justify-center py-12">
      <div className="w-full">
        <h1 className="text-2xl font-bold">{t("team.invite.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("team.invite.subtitle")}</p>
        <Suspense>
          <InviteAccept />
        </Suspense>
      </div>
    </div>
  );
}
