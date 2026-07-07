"use client";

import { useState, useMemo } from "react";
import {
  FileStack,
  ListChecks,
  ShieldAlert,
  Activity,
  FileText,
  Gauge,
  Bot,
  Info,
  Plus,
  PenLine,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/components/providers/i18n-provider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import { Disclaimer } from "@/components/ui/disclaimer";
import { TechnicalFileTable } from "@/components/modules/technical-file-table";
import { GsprTable } from "@/components/modules/gspr-table";
import { gsprRequirementText } from "@/lib/domain/gspr-text";
import { GsprAutoFillButton } from "@/components/modules/gspr-auto-fill-button";
import { GsprBulkStatusButtons } from "@/components/modules/gspr-bulk-status-buttons";
import { PmsManagementTabs } from "@/components/pms/pms-management-tabs";
import { RiskManagementTabs } from "@/components/risk/risk-management-tabs";
import { IfuCreatePanel } from "@/components/modules/ifu-create-panel";
import { ExportButtons } from "@/components/modules/export-buttons";
import { LabelPreviewPanel } from "@/components/modules/label-preview-panel";
import { EvidencePanel, type EvidenceFile, type FileOption } from "@/components/modules/evidence-panel";
import { AiPanel } from "@/components/ai/ai-panel";
import { AiAssistantDrawer } from "@/components/layout/ai-assistant";
import { DEVICE_CLASS_LABEL, isTechnicalFileSectionKey } from "@/lib/domain/constants";
import { computeAuditReadiness } from "@/lib/domain/scoring";
import { BREAKDOWN_KEY } from "@/app/(app)/audit/audit-view";
import { IfuUploadAudit } from "@/components/modules/ifu-upload-audit";
import type { CompanyLabelProfile } from "@/lib/domain/label-data";
import { cerAiInput } from "@/lib/domain/ai-input";
import type { Product } from "@/lib/domain/types";
import { ClinicalGenerateButton } from "@/components/clinical/clinical-generate-button";
import { VerificationTestsPanel } from "@/components/products/verification-tests-panel";
import { ProductQualityPanel } from "@/components/products/product-quality-panel";
import { DesignControlPanel } from "@/components/products/design-control-panel";
import { CyberSecurityPanel } from "@/components/products/cybersecurity-panel";
import { SoftwareLifecyclePanel } from "@/components/products/software-lifecycle-panel";
import { UdiEudamedPanel } from "@/components/products/udi-eudamed-panel";
import {
  DEFAULT_VERIFICATION_TESTS,
  mergeVerificationTests,
} from "@/lib/domain/verification-tests";
import { ProductWorkflowMini } from "@/components/workflow/product-workflow-mini";
import { WorkflowWelcomeBanner } from "@/components/workflow/workflow-welcome-banner";
import type { DossierWorkflowStep } from "@/lib/workflow/dossier-checklist";

interface ProductEvidence {
  gspr: Record<string, EvidenceFile[]>;
  technicalFile: Record<string, EvidenceFile[]>;
  risk: Record<string, EvidenceFile[]>;
}

function aiInput(p: Product) {
  return {
    name: p.name,
    deviceClass: DEVICE_CLASS_LABEL[p.deviceClass],
    intendedPurpose: p.intendedPurpose,
    isSterile: p.isSterile,
    sterilization: p.sterilization,
    containsSoftware: p.containsSoftware,
    isInvasive: p.isInvasive,
    hasMeasuringFn: p.hasMeasuringFn,
    materials: p.materials,
    indications: p.indications,
    contraindications: p.contraindications,
    bodyContactDuration: p.bodyContactDuration,
  };
}

function Field({ label, value }: { label: string; value?: string | boolean }) {
  const { t } = useI18n();
  const display = typeof value === "boolean" ? (value ? t("common.yes") : t("common.no")) : value || "—";
  return (
    <div className="border-b border-border py-2.5 last:border-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{display}</dd>
    </div>
  );
}

export function ProductDetailTabs({
  product: p,
  evidence,
  fileOptions,
  recommendations,
  canEdit,
  canApprove,
  company,
  defaultTab = "overview",
  showSetup = false,
  companyId,
  productWorkflowSteps,
}: {
  product: Product;
  evidence: ProductEvidence;
  fileOptions: FileOption[];
  recommendations: Record<string, string[]>;
  canEdit: boolean;
  canApprove: boolean;
  company: CompanyLabelProfile;
  defaultTab?: string;
  showSetup?: boolean;
  companyId: string;
  productWorkflowSteps: DossierWorkflowStep[];
}) {
  const { t, lang } = useI18n();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const readiness = computeAuditReadiness(p);
  const input = aiInput(p);
  const vvSection = p.technicalSections.find((s) => s.key === "verification-validation");
  const verificationTests = mergeVerificationTests(
    vvSection?.sectionExtras?.verificationTests ?? [],
    DEFAULT_VERIFICATION_TESTS(p),
  );

  // Show the actual sterilization methods marked across the device family (e.g. "EO, GAMMA"),
  // not the derived scalar ("OTHER" when multiple methods are present).
  const sterMethods = Array.from(
    new Set((p.variants ?? []).flatMap((b) => b.models.flatMap((m) => m.sterilizations))),
  ).filter((s) => s !== "NON_STERILE");
  const sterilizationDisplay = sterMethods.length
    ? sterMethods.map((m) => t(`sterilization.${m}`)).join(", ")
    : p.isSterile
      ? t(`sterilization.${p.sterilization}`)
      : t("pd.nonSterile");

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <ScoreRing score={p.complianceScore} />
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{DEVICE_CLASS_LABEL[p.deviceClass]}</Badge>
              {p.isSterile && <Badge variant="default">{t("pd.sterile")} · {sterilizationDisplay}</Badge>}
              {p.isInvasive && <Badge variant="warning">{t("pd.invasive")}</Badge>}
            </div>
            <h1 className="mt-2 text-2xl font-bold">{p.name}</h1>
            <p className="text-sm text-muted-foreground">
              {p.brand} · {p.model} · UDI-DI {p.udiDi ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          <ExportButtons
            productId={p.id}
            items={[
              { type: "PRODUCT_DOSSIER_ZIP", label: "Dossier ZIP" },
              { type: "FULL_MDR_TECHNICAL_FILE_ZIP", label: "MDR ZIP" },
            ]}
          />
          {canEdit && (
            <Link href={`/products/${p.id}/edit`} className={buttonVariants({ variant: "outline", className: "gap-2" })}>
              <Pencil className="h-4 w-4" /> {t("pd.editProduct")}
            </Link>
          )}
          <Link href={`/composer?productId=${p.id}`} className={buttonVariants({ variant: "outline", className: "gap-2" })}>
            <PenLine className="h-4 w-4" /> {t("pd.generateDocument")}
          </Link>
          <Button variant="accent" className="gap-2" onClick={() => setAssistantOpen(true)}>
            <Bot className="h-4 w-4" /> {t("pd.askAi")}
          </Button>
        </div>
      </div>

      <WorkflowWelcomeBanner
        companyId={companyId}
        showSetup={showSetup}
        steps={productWorkflowSteps}
      />

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="overview">{t("pd.tab.overview")}</TabsTrigger>
          <TabsTrigger value="technical">{t("pd.tab.technical")}</TabsTrigger>
          <TabsTrigger value="gspr">{t("pd.tab.gspr")}</TabsTrigger>
          <TabsTrigger value="risk">{t("pd.tab.risk")}</TabsTrigger>
          <TabsTrigger value="clinical">{t("pd.tab.clinical")}</TabsTrigger>
          <TabsTrigger value="pms">{t("pd.tab.pms")}</TabsTrigger>
          <TabsTrigger value="ifu">{t("pd.tab.ifu")}</TabsTrigger>
          <TabsTrigger value="udi">{t("pd.tab.udi")}</TabsTrigger>
          <TabsTrigger value="tests">{t("pd.tab.tests")}</TabsTrigger>
          <TabsTrigger value="design">{t("pd.tab.design")}</TabsTrigger>
          {p.containsSoftware && (
            <TabsTrigger value="software">{t("pd.tab.software")}</TabsTrigger>
          )}
          {(p.containsSoftware || p.isActive) && (
            <TabsTrigger value="cyber">{t("pd.tab.cyber")}</TabsTrigger>
          )}
          <TabsTrigger value="quality">{t("pd.tab.quality")}</TabsTrigger>
          <TabsTrigger value="audit">{t("pd.tab.audit")}</TabsTrigger>
          <TabsTrigger value="ai">{t("pd.tab.ai")}</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>{t("pd.deviceSpec")}</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid gap-x-8 sm:grid-cols-2">
                  <Field label={t("pd.field.intendedPurpose")} value={p.intendedPurpose} />
                  <Field label={t("pd.field.userProfile")} value={p.userProfile} />
                  <Field label={t("pd.field.patientPopulation")} value={p.patientPopulation} />
                  <Field label={t("pd.field.indications")} value={p.indications} />
                  <Field label={t("pd.field.contraindications")} value={p.contraindications} />
                  <Field label={t("pd.field.bodyContactDuration")} value={p.bodyContactDuration} />
                  <Field label={t("pd.field.materials")} value={p.materials} />
                  <Field label={t("pd.field.packaging")} value={p.packagingType} />
                  <Field label={t("pd.field.shelfLife")} value={p.shelfLife} />
                  <Field label={t("pd.field.sterilization")} value={sterilizationDisplay} />
                  <Field label={t("pd.field.measuringFunction")} value={p.hasMeasuringFn} />
                  <Field label={t("pd.field.containsSoftware")} value={p.containsSoftware} />
                  <Field label={t("pd.field.invasive")} value={p.isInvasive} />
                  <Field label={t("pd.field.manufacturingProcess")} value={p.manufacturingProcess} />
                  <Field label={t("pd.field.criticalSuppliers")} value={p.criticalSuppliers} />
                  <Field label={t("pd.field.appliedStandards")} value={p.appliedStandards} />
                  <Field label={t("pd.field.emdnCode")} value={p.emdnCode} />
                  <Field label={t("pd.field.basicUdiDi")} value={p.basicUdiDi} />
                  <Field label={t("pd.field.udiDi")} value={p.udiDi} />
                </dl>
              </CardContent>
            </Card>
            <div className="space-y-4">
              <ProductWorkflowMini steps={productWorkflowSteps} />
              <Card>
                <CardHeader><CardTitle>{t("pd.auditReadiness")}</CardTitle></CardHeader>
                <CardContent className="flex flex-col items-center">
                  <ScoreRing score={readiness.score} size={120} label={t(`band.${readiness.band}`)} />
                  <p className="mt-3 text-center text-sm text-muted-foreground">
                    {readiness.band === "green"
                      ? t("pd.band.green")
                      : readiness.band === "yellow"
                        ? t("pd.band.yellow")
                        : t("pd.band.red")}
                  </p>
                </CardContent>
              </Card>
              <AiPanel promptId="technical-file" input={input} title={t("pd.ai.tfGap")} label={t("common.auditAI")} />
            </div>
          </div>
        </TabsContent>

        {/* Technical File */}
        <TabsContent value="technical">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("pd.tfStructure")} — {p.technicalSections.length} {t("pd.sections")}
              </p>
              <ExportButtons
                productId={p.id}
                items={[
                  { type: "TECHNICAL_FILE_DOCX", label: "DOCX" },
                  { type: "FULL_MDR_TECHNICAL_FILE_ZIP", label: t("pd.fullZip") },
                ]}
              />
            </div>
            <TechnicalFileTable sections={p.technicalSections} productId={p.id} canEdit={canEdit} />
            <Card>
              <CardHeader><CardTitle>{t("pd.evidencePerSection")}</CardTitle></CardHeader>
              <CardContent>
                <EvidencePanel
                  target="technical-file"
                  canEdit={canEdit}
                  fileOptions={fileOptions}
                  recommendations={recommendations}
                  evidence={evidence.technicalFile}
                  items={p.technicalSections
                    .filter((s) => isTechnicalFileSectionKey(s.key))
                    .map((s) => {
                    const k = `tf.section.${s.key}`;
                    const lbl = t(k);
                    return { id: s.id, label: lbl === k ? s.title : lbl, sublabel: s.annexRef };
                  })}
                />
              </CardContent>
            </Card>
            <AiPanel promptId="technical-file" input={input} title={t("pd.ai.tfAnalyze")} label={t("common.auditAI")} />
          </div>
        </TabsContent>

        {/* GSPR */}
        <TabsContent value="gspr">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{t("pd.gsprStructure")}</p>
              <div className="flex flex-wrap items-center gap-2">
                <GsprAutoFillButton productId={p.id} canEdit={canEdit} />
                <GsprBulkStatusButtons productId={p.id} canEdit={canEdit} canApprove={canApprove} />
                <ExportButtons productId={p.id} items={[{ type: "GSPR_XLSX", label: "XLSX" }]} />
              </div>
            </div>
            <GsprTable
              items={p.gsprItems}
              evidenceByItemId={evidence.gspr}
              fileOptions={fileOptions}
              recommendations={recommendations}
              productId={p.id}
              canEdit={canEdit}
              canApprove={canApprove}
            />
            <Card>
              <CardHeader><CardTitle>{t("pd.evidencePerGspr")}</CardTitle></CardHeader>
              <CardContent>
                <EvidencePanel
                  target="gspr"
                  canEdit={canEdit}
                  fileOptions={fileOptions}
                  recommendations={recommendations}
                  evidence={evidence.gspr}
                  items={p.gsprItems.map((g) => ({
                    id: g.id,
                    label: `GSPR ${g.gsprNo}`,
                    sublabel: gsprRequirementText(g.gsprNo, g.requirementSummary, lang),
                  }))}
                />
              </CardContent>
            </Card>
            <AiPanel promptId="gspr" input={input} title={t("pd.ai.gspr")} label={t("common.auditAI")} />
          </div>
        </TabsContent>

        {/* Risk */}
        <TabsContent value="risk">
          <div className="space-y-4">
            <RiskManagementTabs product={p} canEdit={canEdit} />
            <Card>
              <CardHeader><CardTitle>{t("pd.evidencePerRisk")}</CardTitle></CardHeader>
              <CardContent>
                <EvidencePanel
                  target="risk"
                  canEdit={canEdit}
                  fileOptions={fileOptions}
                  recommendations={recommendations}
                  evidence={evidence.risk}
                  items={p.riskItems.map((r) => ({
                    id: r.id,
                    label: r.hazardousSituation ?? r.hazard,
                    sublabel: r.harm,
                  }))}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Clinical */}
        <TabsContent value="clinical">
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle>{t("clinical.title")}</CardTitle>
                {canEdit && (
                  <ClinicalGenerateButton
                    productId={p.id}
                    onGenerated={() => {
                      /* draft saved server-side */
                    }}
                  />
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("clinical.desc")}</p>
                <Link href="/clinical" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  {t("clinical.openModule")}
                </Link>
              </CardContent>
            </Card>
            <AiPanel promptId="cer" input={cerAiInput(p)} title={t("clinical.aiReview")} label={t("clinical.aiReviewAction")} />
          </div>
        </TabsContent>

        {/* PMS / PMCF / PSUR */}
        <TabsContent value="pms">
          <div className="space-y-4">
            <AiPanel promptId="pms" input={input} title={t("pd.ai.pms")} />
            <PmsManagementTabs product={p} canEdit={canEdit} />
          </div>
        </TabsContent>

        {/* IFU */}
        <TabsContent value="ifu">
          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>{t("ifu.labelPreview")}</CardTitle></CardHeader>
              <CardContent className="min-w-0">
                <LabelPreviewPanel
                  product={p}
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
                  <CardTitle className="text-base">{t("ifu.createTitle")}</CardTitle>
                  <p className="text-xs text-muted-foreground">{t("ifu.createDesc")}</p>
                </CardHeader>
                <CardContent>
                  <IfuCreatePanel
                    product={p}
                    selectedModelIds={selectedModelIds}
                    onSelectedModelIdsChange={setSelectedModelIds}
                  />
                </CardContent>
              </Card>
              <IfuUploadAudit productId={p.id} />
              <AiPanel
                promptId="ifu"
                input={{ ...input, productId: p.id }}
                title={t("ifu.auditTitle")}
                label={t("common.auditAI")}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="udi">
          <UdiEudamedPanel productId={p.id} canEdit={canEdit} />
        </TabsContent>

        {/* Tests */}
        <TabsContent value="tests">
          <VerificationTestsPanel
            productId={p.id}
            initialTests={verificationTests}
            vvSectionId={vvSection?.id ?? null}
            evidence={evidence.technicalFile}
            fileOptions={fileOptions}
            recommendations={recommendations}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="design">
          <DesignControlPanel productId={p.id} canEdit={canEdit} />
        </TabsContent>

        {p.containsSoftware && (
          <TabsContent value="software">
            <SoftwareLifecyclePanel productId={p.id} canEdit={canEdit} />
          </TabsContent>
        )}

        {(p.containsSoftware || p.isActive) && (
          <TabsContent value="cyber">
            <CyberSecurityPanel productId={p.id} canEdit={canEdit} />
          </TabsContent>
        )}

        {/* Quality */}
        <TabsContent value="quality">
          <ProductQualityPanel productId={p.id} canEdit={canEdit} />
        </TabsContent>

        {/* Audit */}
        <TabsContent value="audit">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>{t("pd.readinessScore")}</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center gap-3">
                <ScoreRing score={readiness.score} size={140} label={t(`band.${readiness.band}`)} />
                <ExportButtons productId={p.id} items={[{ type: "AUDIT_READINESS_PDF", label: t("pd.auditPdf") }]} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>{t("pd.scoreBreakdown")}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {readiness.breakdown.map((b) => (
                  <div key={b.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{t(BREAKDOWN_KEY[b.label] ?? b.label)}</span>
                      <span className="font-medium">{b.value}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${b.value}%`,
                          background:
                            b.value >= 80
                              ? "hsl(var(--success))"
                              : b.value >= 50
                                ? "hsl(var(--warning))"
                                : "hsl(var(--destructive))",
                        }}
                      />
                    </div>
                  </div>
                ))}
                <Disclaimer className="mt-4" />
              </CardContent>
            </Card>
            <div className="lg:col-span-3">
              <AiPanel
                promptId="audit-readiness"
                input={{
                  productName: p.name,
                  deviceClass: DEVICE_CLASS_LABEL[p.deviceClass],
                  score: readiness.score,
                  breakdown: readiness.breakdown.map((b) => ({ label: b.label, value: b.value })),
                }}
                title={t("pd.ai.audit")}
                label={t("common.auditAI")}
              />
            </div>
          </div>
        </TabsContent>

        {/* AI tab */}
        <TabsContent value="ai">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <Bot className="h-7 w-7" />
              </div>
              <div>
                <p className="text-lg font-semibold">{t("pd.aiAssistantTitle")}</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  {t("pd.aiAssistantDesc")}{" "}
                  <span className="font-medium text-foreground">{p.name}</span>.
                </p>
              </div>
              <Button variant="accent" className="gap-2" onClick={() => setAssistantOpen(true)}>
                <Bot className="h-4 w-4" /> {t("pd.openAssistant")}
              </Button>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5" /> {t("pd.draftsOnly")}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AiAssistantDrawer open={assistantOpen} onClose={() => setAssistantOpen(false)} productId={p.id} />
    </div>
  );
}
