"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { useI18n } from "@/components/providers/i18n-provider";

export function DemoTourShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/demo");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-14 items-center justify-between gap-4">
          <BrandLockup size="sm" href="/" variant="logo" />
          <div className="flex flex-wrap items-center justify-end gap-4 text-sm">
            <Link href="/demo" className="text-muted-foreground hover:text-foreground">
              {t("demo.tour.backToIntro")}
            </Link>
            <button type="button" onClick={logout} className="text-muted-foreground hover:text-foreground">
              {t("topbar.logout")}
            </button>
          </div>
        </div>
      </header>
      <main className="container max-w-5xl py-8 pb-16">{children}</main>
    </div>
  );
}
