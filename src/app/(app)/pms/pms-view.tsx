"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { ProductSwitcher } from "@/components/modules/product-switcher";
import { AiPanel } from "@/components/ai/ai-panel";
import { PmsManagementTabs } from "@/components/pms/pms-management-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { productAiInput } from "@/lib/domain/ai-input";
import type { Product } from "@/lib/domain/types";

export function PmsView({ products, canEdit = false }: { products: Product[]; canEdit?: boolean }) {
  const { t } = useI18n();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const product = products.find((p) => p.id === productId);

  return (
    <div>
      <PageHeader title={t("pms.title")} description={t("pms.desc")} />
      {product ? (
        <>
          <ProductSwitcher products={products} value={productId} onChange={setProductId} />
          <div className="mt-4 space-y-4">
            <AiPanel
              promptId="pms"
              input={{ ...productAiInput(product), productId: product.id }}
              title={t("pms.title")}
            />
            <PmsManagementTabs product={product} canEdit={canEdit} />
          </div>
        </>
      ) : (
        <EmptyState icon={Activity} title={t("products.title")} description={t("products.desc")} />
      )}
    </div>
  );
}
