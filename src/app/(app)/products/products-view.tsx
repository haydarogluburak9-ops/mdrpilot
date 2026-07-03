"use client";

import Link from "next/link";
import { Plus, ChevronRight, PackageOpen } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/ui/score-ring";
import { EmptyState } from "@/components/ui/empty-state";
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import { formatDate } from "@/lib/utils";
import type { Product } from "@/lib/domain/types";

export function ProductsView({ products }: { products: Product[] }) {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader
        title={t("products.title")}
        description={t("products.desc")}
        actions={
          <Link href="/products/new" className={buttonVariants({ className: "gap-2" })}>
            <Plus className="h-4 w-4" /> {t("products.new")}
          </Link>
        }
      />

      {products.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={t("products.title")}
          description={t("products.desc")}
          action={
            <Link href="/products/new" className={buttonVariants({ className: "gap-2" })}>
              <Plus className="h-4 w-4" /> {t("products.new")}
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => {
            const missing = p.technicalSections.filter((s) => s.status === "MISSING").length;
            const total = p.technicalSections.length;
            return (
              <Link key={p.id} href={`/products/${p.id}`}>
                <Card className="h-full p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Badge variant="secondary" className="mb-2">
                        {DEVICE_CLASS_LABEL[p.deviceClass]}
                      </Badge>
                      <h3 className="truncate text-base font-semibold">{p.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {p.brand} · {p.model}
                      </p>
                    </div>
                    <ScoreRing score={p.complianceScore} size={72} strokeWidth={7} label={t("common.score")} />
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.intendedPurpose}</p>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                    <span>
                      {total - missing}/{total} {t("common.sectionsReady")}
                    </span>
                    <span>{t("common.updated")} {formatDate(p.updatedAt)}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    {missing > 0 ? (
                      <Badge variant="destructive">{missing} {t("common.missing")}</Badge>
                    ) : (
                      <Badge variant="success">{t("common.complete")}</Badge>
                    )}
                    <span className="flex items-center gap-1 text-sm font-medium text-primary">
                      {t("common.open")} <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
