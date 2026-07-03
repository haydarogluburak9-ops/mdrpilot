"use client";

import { LegalDocument } from "@/components/legal/legal-document";
import { TERMS_EN, TERMS_TR } from "@/lib/legal/content";
import { useI18n } from "@/components/providers/i18n-provider";

export default function TermsPage() {
  const { lang } = useI18n();
  return <LegalDocument content={lang === "tr" ? TERMS_TR : TERMS_EN} />;
}
