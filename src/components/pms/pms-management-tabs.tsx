"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ExportButtons } from "@/components/modules/export-buttons";
import { PostMarketSectionPanel } from "@/components/pms/post-market-section-panel";
import { useI18n } from "@/components/providers/i18n-provider";
import { POST_MARKET_SECTION_KEYS } from "@/lib/domain/constants";
import type { Product, TechnicalSection } from "@/lib/domain/types";

const TAB_KEYS = ["pms-plan", "pmcf-plan", "pmcf-report", "psur-report"] as const;

export function PmsManagementTabs({ product, canEdit }: { product: Product; canEdit: boolean }) {
  const { t } = useI18n();

  const byKey = new Map<string, TechnicalSection>();
  for (const s of product.technicalSections) {
    if (POST_MARKET_SECTION_KEYS.includes(s.key as typeof POST_MARKET_SECTION_KEYS[number])) byKey.set(s.key, s);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t("pms.tab.hint")}</p>
        <ExportButtons
          productId={product.id}
          items={[{ type: "PMS_PMCF_DOCX", label: "DOCX" }]}
        />
      </div>

      <Tabs defaultValue="pms-plan" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap gap-1 p-1">
          <TabsTrigger value="pms-plan">{t("pms.tab.plan")}</TabsTrigger>
          <TabsTrigger value="pmcf-plan">{t("pms.tab.pmcf")}</TabsTrigger>
          <TabsTrigger value="pmcf-report">{t("pms.tab.pmcfReport")}</TabsTrigger>
          <TabsTrigger value="psur-report">{t("pms.tab.psur")}</TabsTrigger>
        </TabsList>

        {TAB_KEYS.map((key) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardContent className="pt-6">
                <PostMarketSectionPanel
                  productId={product.id}
                  section={byKey.get(key)}
                  canEdit={canEdit}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
