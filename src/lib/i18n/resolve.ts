import { dictionaries } from "@/lib/i18n/dictionaries";
import { PUBLIC_LOCALE_TRANSLATIONS } from "@/lib/i18n/public-locale-translations";
import { SHELL_TRANSLATIONS } from "@/lib/i18n/shell-translations";
import type { Lang } from "@/lib/i18n/locales";

export function resolveDictionary(lang: Lang): Record<string, string> {
  if (lang === "tr") return dictionaries.tr;
  if (lang === "en") return dictionaries.en;
  const shell = SHELL_TRANSLATIONS[lang];
  const publicPack = PUBLIC_LOCALE_TRANSLATIONS[lang] ?? {};
  return shell
    ? ({ ...dictionaries.en, ...shell, ...publicPack } as Record<string, string>)
    : dictionaries.en;
}

export function translate(lang: Lang, key: string): string {
  const dict = resolveDictionary(lang);
  return dict[key] ?? dictionaries.en[key] ?? dictionaries.tr[key] ?? key;
}
