"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Lock, Sparkles } from "lucide-react";
import { useState } from "react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/components/providers/i18n-provider";
import { SalesRequestPanel } from "@/components/sales/sales-request-panel";

const HIGHLIGHT_KEYS = [
  "demo.landing.h1",
  "demo.landing.h2",
  "demo.landing.h3",
  "demo.landing.h4",
] as const;

export function DemoLandingView() {
  const { t } = useI18n();
  const [demoTrialOpen, setDemoTrialOpen] = useState(false);
  const tourHref = "/demo/tour";
  const startHref = `/login?next=${encodeURIComponent(tourHref)}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-14 items-center justify-between gap-4">
          <BrandLockup size="sm" href="/" variant="logo" />
          <div className="flex flex-wrap items-center justify-end gap-4 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              {t("help.backHome")}
            </Link>
            <Link href="/login" className="text-primary hover:underline">
              {t("landing.nav.signin")}
            </Link>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl py-12 pb-16">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight">{t("landing.bookdemo.title")}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{t("landing.bookdemo.subtitle")}</p>
        </div>

        <Card className="mt-10 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <p className="font-semibold">{t("demo.title")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("demo.desc")}</p>
            <p className="mt-3 text-sm text-muted-foreground">{t("demo.scenarioDesc")}</p>
          </CardContent>
        </Card>

        <ul className="mt-8 space-y-3">
          {HIGHLIGHT_KEYS.map((key) => (
            <li key={key} className="flex items-start gap-3 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>

        <Card className="mt-10">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Lock className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{t("demo.landing.authTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("demo.landing.authDesc")}</p>
            </div>
            <Link href={startHref}>
              <Button size="lg" className="gap-2">
                {t("demo.landing.signInToStart")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("demo.landing.noAccount")}{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            {t("auth.login.createOne")}
          </Link>
        </p>

        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => setDemoTrialOpen(true)}>
            {t("sales.demo.cta")} — Pro
          </Button>
        </div>
      </main>

      <SalesRequestPanel
        open={demoTrialOpen}
        onClose={() => setDemoTrialOpen(false)}
        kind="demo_trial"
        planKey="pro"
      />
    </div>
  );
}
