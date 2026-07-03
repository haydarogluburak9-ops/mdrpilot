"use client";

import { useI18n } from "@/components/providers/i18n-provider";import { ThemeToggle, LanguageSwitcher } from "@/components/layout/controls";
import { BrandLockup } from "@/components/brand/brand-lockup";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hero-gradient hidden flex-col justify-between p-12 lg:flex">
        <BrandLockup size="lg" href="/" variant="slogan" />
        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight">{t("auth.side.title")}</h2>
          <p className="mt-4 text-muted-foreground">{t("auth.side.subtitle")}</p>
        </div>
        <p className="text-xs text-muted-foreground">{t("auth.side.note")}</p>
      </div>
      <div className="flex flex-col p-6">
        <div className="flex justify-end gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
