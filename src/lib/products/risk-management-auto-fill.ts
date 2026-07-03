import "server-only";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/auth/errors";
import { extractSuggestedRisks } from "@/lib/domain/risk-suggestions";
import { riskAiInput } from "@/lib/domain/ai-input";
import { bulkCreateRiskItems, backfillRiskItemNarratives, type CreateRiskItemInput } from "@/lib/products/risk-service";
import { fillAnnexAQuestions } from "@/lib/products/risk-annex-a-fill";
import { fillTableEForProduct } from "@/lib/products/risk-table-e-fill";
import { generateRiskDocument } from "@/lib/products/generate-risk-document";
import { getProductForCompany } from "@/lib/data/queries";
import { annexAHasAnswers, parseAnnexARowsJson } from "@/lib/domain/risk-annex-a";
import { tableEHasEvaluations, parseTableERowsJson } from "@/lib/domain/risk-table-e";
import { generateFmeaBenefitRisk } from "@/lib/products/generate-fmea-benefit-risk";
import { runPrompt } from "@/lib/ai/orchestrator";

export interface RiskManagementAutoFillResult {
  sectionsUpdated: number;
  source: "ai" | "rules";
  fmeaAdded?: number;
  narrativesFilled?: number;
  annexFilled?: boolean;
  tableEFilled?: boolean;
  tableEFmeaLinked?: number;
  documentsGenerated?: string[];
}

function isEmpty(v: string | null | undefined) {
  return !v?.trim();
}

export async function autoFillRiskManagement(
  productId: string,
  companyId: string,
  options: {
    locale?: string;
    overwrite?: boolean;
    fillFmea?: boolean;
  } = {},
): Promise<RiskManagementAutoFillResult> {
  const locale = options.locale === "en" ? "en" : "tr";
  const overwrite = options.overwrite ?? false;
  const fillFmea = options.fillFmea ?? true;

  const row = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    include: {
      riskItems: { orderBy: { createdAt: "asc" } },
      riskManagementFile: true,
    },
  });
  if (!row) throw new NotFoundError("Product not found");

  let sectionsUpdated = 0;
  let source: "ai" | "rules" = "rules";
  let annexFilled = false;
  let tableEFilled = false;
  let tableEFmeaLinked = 0;
  const documentsGenerated: string[] = [];
  const existing = row.riskManagementFile;

  const e1Existing = parseTableERowsJson(existing?.planTableE1Rows, "E1", locale);
  const e2Existing = parseTableERowsJson(existing?.planTableE2Rows, "E2", locale);
  if (overwrite || !tableEHasEvaluations(e1Existing) || !tableEHasEvaluations(e2Existing)) {
    const tableResult = await fillTableEForProduct(productId, companyId, {
      locale,
      overwrite,
      linkFmea: fillFmea,
    });
    tableEFilled = true;
    tableEFmeaLinked = tableResult.fmeaLinked;
    sectionsUpdated++;
  }

  for (const kind of ["plan", "policy", "report"] as const) {
    const textField =
      kind === "plan" ? existing?.plan : kind === "report" ? existing?.report : existing?.managementPolicy;
    const fileField =
      kind === "plan"
        ? existing?.planUploadedFileId
        : kind === "report"
          ? existing?.reportUploadedFileId
          : existing?.policyUploadedFileId;
    if (!overwrite && (fileField || !isEmpty(textField))) continue;

    const gen = await generateRiskDocument(companyId, productId, kind, locale);
    if (gen) {
      documentsGenerated.push(kind);
      sectionsUpdated++;
      if (gen.source !== "mock") source = "ai";
    }
  }

  const annexExisting = parseAnnexARowsJson(existing?.annexARows, locale);
  if (overwrite || !annexAHasAnswers(annexExisting)) {
    const annexResult = await fillAnnexAQuestions(productId, companyId, {
      locale,
      overwrite,
    });
    if (annexResult.rows.length > 0) {
      annexFilled = true;
      if (annexResult.source === "ai") source = "ai";
      sectionsUpdated++;
    }
  }

  let fmeaAdded = 0;
  if (fillFmea && row.riskItems.length === 0) {
    const product = await getProductForCompany(companyId, productId);
    if (product) {
      const narrativeContext: NonNullable<CreateRiskItemInput["narrativeContext"]> = {
        intendedPurpose: product.intendedPurpose,
        productName: product.name,
        locale,
      };
      const { result } = await runPrompt(
        "risk",
        { ...riskAiInput(product), _locale: locale },
        { companyId, feature: "risk-suggest" },
      );
      const suggestions = extractSuggestedRisks(result).map((s) => ({
        ...s,
        narrativeContext,
      }));
      if (suggestions.length > 0) {
        const created = await bulkCreateRiskItems(companyId, productId, suggestions);
        fmeaAdded = created?.length ?? 0;
      }
    }
  }

  let narrativesFilled = 0;
  if (fillFmea) {
    narrativesFilled = await backfillRiskItemNarratives(companyId, productId, locale, overwrite);
    if (narrativesFilled > 0) sectionsUpdated++;
  }

  const riskCount =
    fmeaAdded > 0
      ? fmeaAdded
      : await prisma.riskItem.count({ where: { productId } });
  if (riskCount > 0 && (overwrite || isEmpty(existing?.fmeaBenefitRiskAnalysis))) {
    const br = await generateFmeaBenefitRisk(companyId, productId, locale);
    if (br) {
      sectionsUpdated++;
      if (br.source !== "mock") source = "ai";
    }
  }

  return {
    sectionsUpdated,
    source,
    fmeaAdded,
    narrativesFilled,
    annexFilled,
    tableEFilled,
    tableEFmeaLinked,
    documentsGenerated,
  };
}
