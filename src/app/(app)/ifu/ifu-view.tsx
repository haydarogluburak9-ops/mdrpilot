"use client";

import { useState, useEffect } from "react";
import { FileText, Sparkles } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { ProductSwitcher } from "@/components/modules/product-switcher";
import { AiPanel } from "@/components/ai/ai-panel";
import { IfuCreatePanel } from "@/components/modules/ifu-create-panel";
import { LabelPreviewPanel } from "@/components/modules/label-preview-panel";
import { IfuUploadAudit } from "@/components/modules/ifu-upload-audit";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { productAiInput } from "@/lib/domain/ai-input";
import type { CompanyLabelProfile } from "@/lib/domain/label-data";
import type { Product } from "@/lib/domain/types";

export function IfuView({
  products,
  company,
}: {
  products: Product[];
  company: CompanyLabelProfile;
}) {
  const { t } = useI18n();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const product = products.find((p) => p.id === productId);

  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedModelIds([]);
  }, [product?.id]);

  return (
    <div>
      <PageHeader title={t("ifu.title")} description={t("ifu.desc")} />

      {product ? (
        <>
          <ProductSwitcher products={products} value={productId} onChange={setProductId} />
          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t("ifu.labelPreview")}</CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                <LabelPreviewPanel
                  product={product}
                  company={company}
                  selectedIds={selectedModelIds}
                  onSelectedIdsChange={setSelectedModelIds}
                  selectionMode
                />
              </CardContent>
            </Card>

            <div className="space-y-4 lg:col-span-3">
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-primary" />
                    {t("ifu.createTitle")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{t("ifu.createDesc")}</p>
                </CardHeader>
                <CardContent>
                  <IfuCreatePanel
                    product={product}
                    selectedModelIds={selectedModelIds}
                    onSelectedModelIdsChange={setSelectedModelIds}
                  />
                </CardContent>
              </Card>

              <IfuUploadAudit productId={product.id} />

              <AiPanel
                promptId="ifu"
                input={{ ...productAiInput(product), productId: product.id }}
                title={t("ifu.auditTitle")}
                label={t("common.auditAI")}
              />
            </div>
          </div>
        </>
      ) : (
        <EmptyState icon={Sparkles} title={t("products.title")} description={t("products.desc")} />
      )}
    </div>
  );
}
