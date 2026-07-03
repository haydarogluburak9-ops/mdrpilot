"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { APP_LOCALES, isAppLocale, type Lang } from "@/lib/i18n/locales";
import { translate } from "@/lib/i18n/resolve";
import { STORAGE_KEY_LANG, STORAGE_KEY_LANG_LEGACY } from "@/lib/brand";

const I18nContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
} | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("tr");

  useEffect(() => {
    const stored =
      (localStorage.getItem(STORAGE_KEY_LANG) as Lang | null) ??
      (localStorage.getItem(STORAGE_KEY_LANG_LEGACY) as Lang | null);
    if (isAppLocale(stored)) {
      setLangState(stored);
      document.documentElement.lang = stored;
    }
  }, []);

  function setLang(l: Lang) {
    localStorage.setItem(STORAGE_KEY_LANG, l);
    document.documentElement.lang = l;
    setLangState(l);
  }

  function t(key: string): string {
    return translate(lang, key);
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

/** All supported UI locales (seven languages). */
export const SUPPORTED_UI_LANGS = APP_LOCALES;
