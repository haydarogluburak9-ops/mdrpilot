"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useI18n } from "@/components/providers/i18n-provider";
import { RiskAnnexATable } from "@/components/risk/risk-annex-a-table";
import { RiskDocGenerate } from "@/components/risk/risk-doc-generate";
import { RiskSectionFileCard } from "@/components/risk/risk-section-file-card";
import { RiskTable } from "@/components/modules/risk-table";
import { RiskMatrix } from "@/components/risk/risk-matrix";
import { AddRiskModal } from "@/components/risk/add-risk-modal";
import { AddRiskWithAiButton } from "@/components/risk/add-risk-with-ai-button";
import { RiskAiPanel } from "@/components/risk/risk-ai-panel";
import { RiskFmeaBenefitRisk } from "@/components/risk/risk-fmea-benefit-risk";
import { RiskAutoFillButton } from "@/components/risk/risk-auto-fill-button";
import { riskAiInput } from "@/lib/domain/ai-input";
import { formatRiskFormRef } from "@/lib/domain/risk-management-templates";
import { annexAHasAnswers } from "@/lib/domain/risk-annex-a";
import { RiskTableEPanel } from "@/components/risk/risk-table-e-panel";
import type { Product } from "@/lib/domain/types";

export function RiskManagementTabs({ product, canEdit }: { product: Product; canEdit: boolean }) {
  const { t, lang } = useI18n();
  const [addOpen, setAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("plan");
  const rm = product.riskManagementFile;
  const langKey = lang === "tr" ? "tr" : "en";

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t("risk.mgmt.templateHint")}</p>
        <RiskAutoFillButton productId={product.id} canEdit={canEdit} />
      </div>

      <TabsList className="flex h-auto w-full flex-wrap gap-1 p-1">
        <TabsTrigger value="plan">{t("risk.mgmt.tab.plan")}</TabsTrigger>
        <TabsTrigger value="tableE">{t("risk.mgmt.tab.tableE")}</TabsTrigger>
        <TabsTrigger value="annexA">{t("risk.mgmt.tab.annexA")}</TabsTrigger>
        <TabsTrigger value="fmea">{t("risk.mgmt.tab.fmea")}</TabsTrigger>
        <TabsTrigger value="report">{t("risk.mgmt.tab.report")}</TabsTrigger>
        <TabsTrigger value="policy">{t("risk.mgmt.tab.policy")}</TabsTrigger>
      </TabsList>

      <TabsContent value="plan">
        <Card>
          <CardContent className="pt-6">
            <RiskDocGenerate
              productId={product.id}
              kind="plan"
              title={t("risk.mgmt.plan.title")}
              description={t("risk.mgmt.plan.generateDesc")}
              formRef={formatRiskFormRef("plan", langKey)}
              content={rm?.plan}
              uploadedFile={rm?.planFile}
              canEdit={canEdit}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tableE">
        <Card>
          <CardContent className="pt-6">
            <RiskTableEPanel
              productId={product.id}
              initialE1={rm?.planTableE1Rows}
              initialE2={rm?.planTableE2Rows}
              canEdit={canEdit}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="annexA">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <RiskSectionFileCard
              productId={product.id}
              section="annexA"
              ready={annexAHasAnswers(rm?.annexARows ?? [])}
            />
            <RiskAnnexATable
              productId={product.id}
              initialRows={rm?.annexARows}
              canEdit={canEdit}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="fmea">
        <div className="space-y-4">
          <RiskSectionFileCard
            productId={product.id}
            section="fmea"
            ready={product.riskItems.length > 0}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold">{t("risk.mgmt.fmea.title")}</h3>
              <p className="text-sm text-muted-foreground">{t("risk.mgmt.fmea.desc")}</p>
              <p className="text-xs text-muted-foreground">{formatRiskFormRef("fmea", langKey)}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>{t("risk.initialMatrix")}</CardTitle></CardHeader>
              <CardContent><RiskMatrix risks={product.riskItems} mode="initial" /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{t("risk.residualMatrix")}</CardTitle></CardHeader>
              <CardContent><RiskMatrix risks={product.riskItems} mode="residual" /></CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {product.riskItems.length} {t("risk.items")}
            </p>
            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" /> {t("common.addRisk")}
                </Button>
                <AddRiskWithAiButton
                  productId={product.id}
                  input={riskAiInput(product)}
                  existingHazards={product.riskItems.map((r) => r.hazardousSituation ?? r.hazard)}
                />
              </div>
            )}
          </div>

          <RiskTable risks={product.riskItems} productId={product.id} canEdit={canEdit} />
          <RiskFmeaBenefitRisk
            productId={product.id}
            initialText={rm?.fmeaBenefitRiskAnalysis}
            canEdit={canEdit}
            hasRisks={product.riskItems.length > 0}
          />
          <RiskAiPanel input={riskAiInput(product)} />
          {addOpen && <AddRiskModal productId={product.id} onClose={() => setAddOpen(false)} />}
        </div>
      </TabsContent>

      <TabsContent value="report">
        <Card>
          <CardContent className="pt-6">
            <RiskDocGenerate
              productId={product.id}
              kind="report"
              title={t("risk.mgmt.report.title")}
              description={t("risk.mgmt.report.generateDesc")}
              formRef={formatRiskFormRef("report", langKey)}
              content={rm?.report}
              uploadedFile={rm?.reportFile}
              canEdit={canEdit}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="policy">
        <Card>
          <CardContent className="pt-6">
            <RiskDocGenerate
              productId={product.id}
              kind="policy"
              title={t("risk.mgmt.policy.title")}
              description={t("risk.mgmt.policy.generateDesc")}
              formRef={formatRiskFormRef("policy", langKey)}
              content={rm?.managementPolicy}
              uploadedFile={rm?.policyFile}
              canEdit={canEdit}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
