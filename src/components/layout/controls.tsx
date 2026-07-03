"use client";

import { Moon, Sun, Languages } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { LANGS, type Lang } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, toggle, t } = useThemeWithI18n();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
      title={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function useThemeWithI18n() {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  return { theme, toggle, t };
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1",
        className,
      )}
    >
      <Languages className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <label htmlFor="ui-lang" className="sr-only">
        Language
      </label>
      <select
        id="ui-lang"
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="max-w-[9.5rem] cursor-pointer bg-transparent text-xs font-semibold text-foreground outline-none"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.short} — {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}
