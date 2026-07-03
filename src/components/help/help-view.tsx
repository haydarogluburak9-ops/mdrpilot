"use client";

import Link from "next/link";
import { Mail, MessageCircle, Clock } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportContactForm } from "@/components/support/support-contact-form";

export function HelpView() {
  const { t } = useI18n();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t("help.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("help.desc")}</p>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0 text-primary" />
          {t("help.response")}
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("help.quick.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{t("help.quick.aiPublic")}</p>
            <p>
              <Link href="/login" className="text-primary hover:underline">
                {t("landing.nav.signin")}
              </Link>{" "}
              — {t("help.quick.demo")}
            </p>
            <p>
              <Link href="/login" className="text-primary hover:underline">
                {t("landing.nav.openApp")}
              </Link>{" "}
              — {t("help.quick.billing")}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              support@mdrpilot.com
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4" />
              {t("help.form.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SupportContactForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
