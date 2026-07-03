"use client";

import { useEffect, useState } from "react";
import { Stethoscope } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { ProductSwitcher } from "@/components/modules/product-switcher";
import { ClinicalGenerateButton } from "@/components/clinical/clinical-generate-button";
import { ClinicalSectionPanel } from "@/components/clinical/clinical-section-panel";
import { ClinicalLiteratureWizard } from "@/components/clinical/clinical-literature-wizard";
import { ClinicalStudiesPanel } from "@/components/clinical/clinical-studies-panel";
import { ClinicalExportButton, ClinicalPmcfSyncButton } from "@/components/clinical/clinical-export-button";
import { ClinicalEquivalentPanel } from "@/components/clinical/clinical-equivalent-panel";
import { ClinicalCepPanel } from "@/components/clinical/clinical-cep-panel";
import { ClinicalReadinessBanner } from "@/components/clinical/clinical-readiness-banner";
import { ClinicalWorkflowPanel } from "@/components/clinical/clinical-workflow-panel";
import { ClinicalGapMatrixPanel } from "@/components/clinical/clinical-gap-matrix-panel";
import { ClinicalQpPanel } from "@/components/clinical/clinical-qp-panel";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CLINICAL_SECTION_KEYS,
  sectionStatus,
  type ClinicalEvaluationData,
} from "@/lib/domain/clinical-evaluation";
import type { Product } from "@/lib/domain/types";

export function ClinicalView({
  products,
  canEdit = false,
  canApprove = false,
}: {
  products: Product[];
  canEdit?: boolean;
  canApprove?: boolean;
}) {
  const { t } = useI18n();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const product = products.find((p) => p.id === productId);
  const [evaluation, setEvaluation] = useState<ClinicalEvaluationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sectionEpoch, setSectionEpoch] = useState(0);
  const [activeTab, setActiveTab] = useState("sections");

  const studyCount = evaluation?.clinicalStudies?.length ?? 0;
  const equivCount = evaluation?.equivalentDevicesData?.devices?.length ?? 0;

  function onEvaluationUpdated(ev: ClinicalEvaluationData) {
    setEvaluation(ev);
    setSectionEpoch((n) => n + 1);
  }

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/products/${productId}/clinical-evaluation`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setEvaluation(data.evaluation ?? null);
          setSectionEpoch((n) => n + 1);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  return (
    <div>
      <PageHeader title={t("clinical.title")} description={t("clinical.desc")} />
      {product ? (
        <>
          <ProductSwitcher products={products} value={productId} onChange={setProductId} />
          <div className="mt-4">
            <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{t("clinical.title")}</CardTitle>
                    {evaluation && <StatusBadge status={evaluation.status} />}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canEdit && (
                      <ClinicalGenerateButton
                        productId={product.id}
                        onGenerated={onEvaluationUpdated}
                      />
                    )}
                    <ClinicalExportButton productId={product.id} />
                  </div>
                </CardHeader>
                <CardContent>
                  {evaluation && (
                    <ClinicalReadinessBanner
                      evaluation={evaluation}
                      onNavigate={(tab) => setActiveTab(tab)}
                    />
                  )}
                  {evaluation && (
                    <div className="mb-4">
                      <ClinicalWorkflowPanel
                        productId={product.id}
                        evaluation={evaluation}
                        canEdit={canEdit}
                        canApprove={canApprove}
                        onUpdated={onEvaluationUpdated}
                      />
                    </div>
                  )}
                  {loading && !evaluation ? (
                    <p className="text-sm text-muted-foreground">{t("clinical.loading")}</p>
                  ) : (
                    <Tabs defaultValue="sections" value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="mb-4 flex h-auto flex-wrap gap-1">
                        <TabsTrigger value="cep">{t("clinical.tab.cep")}</TabsTrigger>
                        <TabsTrigger value="sections">{t("clinical.tab.sections")}</TabsTrigger>
                        <TabsTrigger value="equivalents">
                          {t("clinical.tab.equivalents")}
                          {equivCount > 0 ? ` (${equivCount})` : ""}
                        </TabsTrigger>
                        <TabsTrigger value="literature">{t("clinical.tab.literature")}</TabsTrigger>
                        <TabsTrigger value="studies">
                          {t("clinical.tab.studies")}
                          {studyCount > 0 ? ` (${studyCount})` : ""}
                        </TabsTrigger>
                        <TabsTrigger value="pms">{t("clinical.tab.pms")}</TabsTrigger>
                        <TabsTrigger value="gap">{t("clinical.tab.gap")}</TabsTrigger>
                        <TabsTrigger value="qp">{t("clinical.tab.qp")}</TabsTrigger>
                      </TabsList>

                      <TabsContent value="cep">
                        <ClinicalCepPanel
                          key={`cep-${sectionEpoch}`}
                          productId={product.id}
                          evaluation={evaluation}
                          canEdit={canEdit}
                          onSaved={onEvaluationUpdated}
                          onNavigate={setActiveTab}
                        />
                      </TabsContent>

                      <TabsContent value="sections" className="space-y-3">
                        {CLINICAL_SECTION_KEYS.filter(
                          (key) => key !== "equivalentDevices" && key !== "plan",
                        ).map((key) => (
                          <ClinicalSectionPanel
                            key={`${key}-${sectionEpoch}`}
                            productId={product.id}
                            sectionKey={key}
                            content={evaluation?.[key]}
                            status={sectionStatus(evaluation, key)}
                            canEdit={canEdit}
                          />
                        ))}
                      </TabsContent>

                      <TabsContent value="equivalents">
                        <ClinicalEquivalentPanel
                          key={`equiv-${sectionEpoch}`}
                          productId={product.id}
                          productName={product.name}
                          initial={evaluation?.equivalentDevicesData}
                          canEdit={canEdit}
                          onSaved={onEvaluationUpdated}
                        />
                      </TabsContent>

                      <TabsContent value="literature">
                        <ClinicalLiteratureWizard
                          key={`lit-${sectionEpoch}`}
                          productId={product.id}
                          productName={product.name}
                          productIndications={product.indications}
                          initial={evaluation?.literatureData}
                          canEdit={canEdit}
                          onSaved={onEvaluationUpdated}
                          onGoToFindings={() => setActiveTab("studies")}
                        />
                      </TabsContent>

                      <TabsContent value="studies">
                        <ClinicalStudiesPanel
                          key={`studies-${sectionEpoch}`}
                          productId={product.id}
                          initial={evaluation?.clinicalStudies}
                          canEdit={canEdit}
                          onSaved={onEvaluationUpdated}
                        />
                      </TabsContent>

                      <TabsContent value="pms" className="space-y-4">
                        {canEdit && (
                          <ClinicalPmcfSyncButton
                            productId={product.id}
                            onSynced={onEvaluationUpdated}
                          />
                        )}
                        <ClinicalSectionPanel
                          key={`pms-${sectionEpoch}`}
                          productId={product.id}
                          sectionKey="pmsPmcfInputs"
                          content={evaluation?.pmsPmcfInputs}
                          status={sectionStatus(evaluation, "pmsPmcfInputs")}
                          canEdit={canEdit && evaluation?.status !== "APPROVED" && evaluation?.status !== "IN_REVIEW"}
                        />
                      </TabsContent>

                      <TabsContent value="gap">
                        <ClinicalGapMatrixPanel
                          key={`gap-${sectionEpoch}`}
                          productId={product.id}
                          evaluation={evaluation}
                          canEdit={canEdit}
                          onUpdated={onEvaluationUpdated}
                        />
                      </TabsContent>

                      <TabsContent value="qp">
                        <ClinicalQpPanel
                          key={`qp-${sectionEpoch}`}
                          productId={product.id}
                          evaluation={evaluation}
                          canEdit={canEdit && evaluation?.status !== "APPROVED" && evaluation?.status !== "IN_REVIEW"}
                          onSaved={onEvaluationUpdated}
                        />
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
              </Card>
          </div>
        </>
      ) : (
        <EmptyState icon={Stethoscope} title={t("products.title")} description={t("products.desc")} />
      )}
    </div>
  );
}
