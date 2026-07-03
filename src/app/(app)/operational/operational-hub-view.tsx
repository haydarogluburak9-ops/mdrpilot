"use client";

import Link from "next/link";
import { Truck } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OperationalModuleIcon } from "@/components/operational/operational-module-icon";
import type { OperationalHubItem } from "@/lib/operational/modules";

export function OperationalHubView({
  modules,
}: {
  modules: Array<{
    item: OperationalHubItem;
    total: number;
    open: number;
  }>;
}) {
  const { t } = useI18n();

  return (
    <div>
      <PageHeader title={t("operational.hubTitle")} description={t("operational.hubDesc")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(({ item, total, open }) => (
          <Link key={item.slug} href={item.href}>
            <Card className="transition-colors hover:bg-muted/40">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <OperationalModuleIcon iconKey={item.iconKey} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium">{t(item.labelKey)}</h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {t(item.descKey)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="secondary">{t("operational.total")}: {total}</Badge>
                    {open > 0 && (
                      <Badge variant="outline">{t("operational.open")}: {open}</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        <Link href="/operational/approved-suppliers">
          <Card className="transition-colors hover:bg-muted/40">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Truck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium">{t("suppliers.title")}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t("suppliers.desc")}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
