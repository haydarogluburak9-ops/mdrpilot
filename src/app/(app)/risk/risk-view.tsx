"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { ProductSwitcher } from "@/components/modules/product-switcher";
import { RiskManagementTabs } from "@/components/risk/risk-management-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import type { Product } from "@/lib/domain/types";

export function RiskView({ products, canEdit }: { products: Product[]; canEdit: boolean }) {
  const { t } = useI18n();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const product = products.find((p) => p.id === productId);

  return (
    <div>
      <PageHeader title={t("risk.title")} description={t("risk.desc")} />
      {product ? (
        <>
          <ProductSwitcher products={products} value={productId} onChange={setProductId} />
          <RiskManagementTabs product={product} canEdit={canEdit} />
        </>
      ) : (
        <EmptyState icon={ShieldAlert} title={t("products.title")} description={t("products.desc")} />
      )}
    </div>
  );
}
