"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { STORAGE_KEY_THEME, STORAGE_KEY_THEME_LEGACY } from "@/lib/brand";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stored =
      (localStorage.getItem(STORAGE_KEY_THEME) as Theme | null) ??
      (localStorage.getItem(STORAGE_KEY_THEME_LEGACY) as Theme | null);
    const initial: Theme =
      stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(initial);
    setThemeState(initial);
  }, []);

  function applyTheme(t: Theme) {
    const root = document.documentElement;
    root.classList.toggle("dark", t === "dark");
  }

  function setTheme(t: Theme) {
    applyTheme(t);
    localStorage.setItem(STORAGE_KEY_THEME, t);
    setThemeState(t);
  }

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
