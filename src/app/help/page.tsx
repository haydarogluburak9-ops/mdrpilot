"use client";

import Link from "next/link";
import { HelpView } from "@/components/help/help-view";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { useI18n } from "@/components/providers/i18n-provider";

export default function HelpPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-14 items-center justify-between gap-4">
          <BrandLockup size="sm" href="/" variant="logo" />
          <div className="flex flex-wrap items-center justify-end gap-4 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              {t("help.backHome")}
            </Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground">
              {t("legal.terms")}
            </Link>
            <Link href="/login" className="text-primary hover:underline">
              {t("landing.nav.signin")}
            </Link>
          </div>
        </div>
      </header>
      <main className="container max-w-4xl py-10 pb-16">
        <HelpView />
      </main>
    </div>
  );
}
