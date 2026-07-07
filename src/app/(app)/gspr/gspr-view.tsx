"use client";



import { useState, useMemo } from "react";

import { ListChecks, CheckCircle2, AlertCircle, FilePenLine, Clock } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";

import { PageHeader } from "@/components/layout/page-header";

import { ProductSwitcher } from "@/components/modules/product-switcher";

import { GsprTable } from "@/components/modules/gspr-table";

import { GsprAutoFillButton } from "@/components/modules/gspr-auto-fill-button";
import { GsprBulkStatusButtons } from "@/components/modules/gspr-bulk-status-buttons";

import { ExportButtons } from "@/components/modules/export-buttons";

import { GSPR_TEMPLATE_COUNT } from "@/lib/domain/gspr-template";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import { AiPanel } from "@/components/ai/ai-panel";

import { StatCard } from "@/components/ui/stat-card";

import { EmptyState } from "@/components/ui/empty-state";

import { productAiInput } from "@/lib/domain/ai-input";

import { GsprNextActionBanner } from "@/components/modules/gspr-next-action-banner";
import { findNextGsprAction } from "@/lib/domain/gspr-next-action";
import { countEffectiveGsprStatuses, countNotApplicableGsprRows } from "@/lib/domain/gspr-row-status";
import type { Product } from "@/lib/domain/types";

import type { EvidenceFile, FileOption } from "@/components/modules/evidence-panel";

export function GsprView({

  products,

  canEdit,

  canApprove,

  evidenceByProduct,

  fileOptions,

  recommendations,

}: {

  products: Product[];

  canEdit: boolean;

  canApprove: boolean;

  evidenceByProduct: Record<string, Record<string, EvidenceFile[]>>;

  fileOptions: FileOption[];

  recommendations: Record<string, string[]>;

}) {

  const { t } = useI18n();

  const [productId, setProductId] = useState(products[0]?.id ?? "");

  const product = products.find((p) => p.id === productId);



  const evidence = evidenceByProduct[productId] ?? {};

  const statusCounts = useMemo(() => {
    const linkedFileCountById: Record<string, number> = {};
    for (const [itemId, files] of Object.entries(evidence)) {
      linkedFileCountById[itemId] = files.length;
    }
    return countEffectiveGsprStatuses(product?.gsprItems ?? [], linkedFileCountById);
  }, [product?.gsprItems, evidence]);

  const notApplicableCount = useMemo(
    () => countNotApplicableGsprRows(product?.gsprItems ?? []),
    [product?.gsprItems],
  );

  const gsprCount = product?.gsprItems.length ?? 0;

  const gsprComplete = gsprCount >= GSPR_TEMPLATE_COUNT;



  const evidenceForTable = evidence;

  const nextGsprAction = useMemo(() => {
    if (!product) return null;
    const linkedFileCountById: Record<string, number> = {};
    for (const [itemId, files] of Object.entries(evidence)) {
      linkedFileCountById[itemId] = files.length;
    }
    return findNextGsprAction(product.gsprItems, linkedFileCountById);
  }, [product, evidence]);

  return (

    <div>

      <PageHeader

        title={t("gspr.title")}

        description={t("gspr.desc")}

        actions={<ExportButtons productId={product?.id} disabled={!product} items={[{ type: "GSPR_XLSX", label: "XLSX" }]} />}

      />

      {product ? (

        <>

          <ProductSwitcher products={products} value={productId} onChange={setProductId} />

          {!gsprComplete && (

            <p className="mb-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">

              {t("gspr.incompleteList")

                .replace("{current}", String(gsprCount))

                .replace("{total}", String(GSPR_TEMPLATE_COUNT))}

              {" "}

              {t("gspr.incompleteHint")}

            </p>

          )}

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">

            <div className="flex flex-wrap items-center gap-2">

              <GsprAutoFillButton productId={product.id} canEdit={canEdit} />

              <GsprBulkStatusButtons productId={product.id} canEdit={canEdit} canApprove={canApprove} />

              <Link

                href={`/products/${product.id}`}

                className={buttonVariants({ variant: "ghost", size: "sm" })}

              >

                {t("gspr.openProductEvidence")}

              </Link>

            </div>

            <span className="text-xs text-muted-foreground">

              {t("gspr.rowCount").replace("{n}", String(gsprCount))}

            </span>

          </div>

          <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <StatCard label={t("status.MISSING")} value={statusCounts.MISSING} icon={AlertCircle} tone="danger" />

            <StatCard label={t("status.DRAFT")} value={statusCounts.DRAFT} icon={FilePenLine} tone="draft" />

            <StatCard label={t("status.IN_REVIEW")} value={statusCounts.IN_REVIEW} icon={Clock} tone="warning" />

            <StatCard label={t("status.APPROVED")} value={statusCounts.APPROVED} icon={CheckCircle2} tone="success" />

          </div>

          <p className="mb-4 text-xs text-muted-foreground">
            {t("gspr.statusLegend")}
            {notApplicableCount > 0 && (
              <> {t("gspr.statusLegendNa").replace("{n}", String(notApplicableCount))}</>
            )}
          </p>

          <div className="space-y-4">

            {nextGsprAction && <GsprNextActionBanner action={nextGsprAction} />}

            <GsprTable
              items={product.gsprItems}
              evidenceByItemId={evidenceForTable}
              fileOptions={fileOptions}
              recommendations={recommendations}
              productId={product.id}
              canEdit={canEdit}
              canApprove={canApprove}
            />

            <AiPanel

              promptId="gspr"

              input={{ ...productAiInput(product), productId: product.id }}

              title={t("gspr.title")}

            />

          </div>

        </>

      ) : (

        <EmptyState icon={ListChecks} title={t("products.title")} description={t("products.desc")} />

      )}

    </div>

  );

}

