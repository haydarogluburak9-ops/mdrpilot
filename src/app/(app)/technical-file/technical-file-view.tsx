"use client";

import { useState } from "react";
import { FileStack } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { ProductSwitcher } from "@/components/modules/product-switcher";
import { TechnicalFileTable } from "@/components/modules/technical-file-table";
import { ExportButtons } from "@/components/modules/export-buttons";
import { AiPanel } from "@/components/ai/ai-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { productAiInput } from "@/lib/domain/ai-input";
import type { Product } from "@/lib/domain/types";

export function TechnicalFileView({ products, canEdit = false }: { products: Product[]; canEdit?: boolean }) {
  const { t } = useI18n();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const product = products.find((p) => p.id === productId);

  return (
    <div>
      <PageHeader
        title={t("technicalFile.title")}
        description={t("technicalFile.desc")}
        actions={
          <ExportButtons
            productId={product?.id}
            disabled={!product}
            items={[
              { type: "TECHNICAL_FILE_DOCX", label: "DOCX" },
              { type: "FULL_MDR_TECHNICAL_FILE_ZIP", label: t("technicalFile.fullZip") },
            ]}
          />
        }
      />
      {product ? (
        <>
          <ProductSwitcher products={products} value={productId} onChange={setProductId} />
          <div className="space-y-4">
            <TechnicalFileTable
              key={product.id}
              sections={product.technicalSections}
              productId={product.id}
              canEdit={canEdit}
            />
            <AiPanel
              promptId="technical-file"
              input={{ ...productAiInput(product), productId: product.id }}
              title={t("technicalFile.title")}
            />
          </div>
        </>
      ) : (
        <EmptyState icon={FileStack} title={t("products.title")} description={t("products.desc")} />
      )}
    </div>
  );
}
