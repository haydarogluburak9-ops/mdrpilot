"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";

function VerifyBody() {
  const { t } = useI18n();
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((r) => setState(r.ok ? "ok" : "error"))
      .catch(() => setState("error"));
  }, [token]);

  if (state === "loading") {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <p className={`mt-6 text-sm ${state === "ok" ? "text-success" : "text-destructive"}`}>
      {state === "ok" ? t("auth.verify.success") : t("auth.verify.failed")}
    </p>
  );
}

export default function VerifyEmailPage() {
  const { t } = useI18n();
  return (
    <div className="container max-w-md py-16 text-center">
      <h1 className="text-2xl font-bold">{t("auth.verify.title")}</h1>
      <Suspense>
        <VerifyBody />
      </Suspense>
      <Link href="/dashboard" className="mt-6 inline-block text-sm text-primary hover:underline">
        {t("auth.verify.continue")}
      </Link>
    </div>
  );
}
