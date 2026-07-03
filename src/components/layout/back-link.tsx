"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";

export function BackLink({ href, labelKey }: { href: string; labelKey: string }) {
  const { t } = useI18n();
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> {t(labelKey)}
    </Link>
  );
}
