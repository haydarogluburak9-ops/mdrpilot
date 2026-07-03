"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { NAV_GROUPS } from "./nav-config";
import { useI18n } from "@/components/providers/i18n-provider";
import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function MobileNav({ company }: { company: { name: string; plan: string } }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="lg:hidden shrink-0"
        aria-label={t("nav.menu")}
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(100%,18rem)] flex-col border-r border-border bg-card shadow-xl lg:hidden">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <BrandLogo variant="logo" size="sm" />              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {NAV_GROUPS.map((group) => (
                <div key={group.titleKey} className="mb-4">
                  <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t(group.titleKey)}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium",
                            active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {t(item.labelKey)}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
            <div className="border-t border-border p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">{company.name}</p>
              <p>
                {company.plan} {t("nav.plan")}
              </p>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
