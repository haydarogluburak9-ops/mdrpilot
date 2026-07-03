"use client";

import { useState } from "react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentControlView } from "@/components/document-control/document-control-view";

export function DocumentControlPageView({
  products,
  canApprove,
  canWorkflow,
}: {
  products: { id: string; name: string }[];
  canApprove: boolean;
  canWorkflow: boolean;
}) {
  const { t } = useI18n();
  const [productId, setProductId] = useState("");

  return (
    <div>
      <PageHeader title={t("docControl.title")} description={t("docControl.desc")} />
      <div className="mb-4">
        <label className="text-xs text-muted-foreground">{t("docControl.filterProduct")}</label>
        <select
          className="mt-1 block w-full max-w-md rounded-md border border-input px-3 py-2 text-sm"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          <option value="">{t("docControl.allProducts")}</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <DocumentControlView
        productId={productId || undefined}
        canApprove={canApprove}
        canWorkflow={canWorkflow}
      />
    </div>
  );
}
