import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/providers";
import { BRAND_LOGOS, BRAND_META_DESCRIPTION, BRAND_META_TITLE, STORAGE_KEY_LANG, STORAGE_KEY_LANG_LEGACY, STORAGE_KEY_THEME, STORAGE_KEY_THEME_LEGACY } from "@/lib/brand";
import { APP_LOCALES } from "@/lib/i18n/locales";

export const metadata: Metadata = {
  title: BRAND_META_TITLE,
  description: BRAND_META_DESCRIPTION,
  icons: {
    icon: BRAND_LOGOS.icon,
    apple: BRAND_LOGOS.icon,
  },
};

// Runs before hydration to avoid a flash of the wrong theme/language.
const noFlashScript = `
(function () {
  try {
    var t = localStorage.getItem('${STORAGE_KEY_THEME}') || localStorage.getItem('${STORAGE_KEY_THEME_LEGACY}');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (t === 'dark') document.documentElement.classList.add('dark');
    var l = localStorage.getItem('${STORAGE_KEY_LANG}') || localStorage.getItem('${STORAGE_KEY_LANG_LEGACY}');
    var locales = ['${APP_LOCALES.join("','")}'];
    if (locales.indexOf(l) !== -1) document.documentElement.lang = l;
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
