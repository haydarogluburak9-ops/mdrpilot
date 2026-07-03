"use client";

import { LegalDocument } from "@/components/legal/legal-document";
import { PRIVACY_EN, PRIVACY_TR } from "@/lib/legal/content";
import { useI18n } from "@/components/providers/i18n-provider";

export default function PrivacyPage() {
  const { lang } = useI18n();
  return <LegalDocument content={lang === "tr" ? PRIVACY_TR : PRIVACY_EN} />;
}
