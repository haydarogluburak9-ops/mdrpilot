"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bot, ChevronDown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiAssistantDrawer } from "./ai-assistant";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle, LanguageSwitcher } from "./controls";
import { EqmsNotificationBell } from "./eqms-notification-bell";
import { useI18n } from "@/components/providers/i18n-provider";

export function Topbar({
  user,
  company,
}: {
  user: { name: string; email: string; role: string };
  company: { name: string; plan: string };
}) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useI18n();
  const router = useRouter();

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-card/80 px-4 backdrop-blur md:gap-3 md:px-6">
        <MobileNav company={company} />
        <div className="relative flex-1 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder={t("topbar.search")}
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <Button variant="accent" onClick={() => setAssistantOpen(true)} className="gap-2">
          <Bot className="h-4 w-4" />
          <span className="hidden sm:inline">{t("topbar.aiAssistant")}</span>
        </Button>

        <LanguageSwitcher />
        <ThemeToggle />

        <EqmsNotificationBell />

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {initials}
            </div>
            <div className="hidden leading-tight md:block">
              <p className="text-xs font-semibold">{user.name}</p>
              <p className="text-[11px] text-muted-foreground">{t(`role.${user.role}`)}</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-12 z-50 w-56 rounded-lg border border-border bg-card p-1.5 shadow-lg">
                <div className="px-2.5 py-2">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive hover:bg-muted"
                >
                  <LogOut className="h-4 w-4" /> {t("topbar.logout")}
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <AiAssistantDrawer open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </>
  );
}
