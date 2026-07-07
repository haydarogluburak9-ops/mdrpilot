import "server-only";
import { prisma } from "@/lib/db";
import { assertCompanyAccess } from "@/lib/auth/guards";
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import { buildCepDocument, buildCepCore, type CepBuildInput } from "@/lib/domain/clinical-cep-builder";
import { enrichCepExportMarkdown } from "@/lib/domain/clinical-cep-premium";
import { embedLiteratureEvidenceMarker } from "@/lib/domain/clinical-literature-evidence-export";
import { databaseLabel, parseLiteratureSearchJson } from "@/lib/domain/clinical-literature-model";
import { parseEquivalentDevicesJson } from "@/lib/domain/clinical-equivalent-model";
import { displayRiskNo } from "@/lib/domain/risk-category-codes";
import { readLiteratureEvidenceBuffer } from "@/lib/products/literature-evidence";
import { upsertClinicalEvaluation, applyCerPlanSync, getClinicalEvaluation } from "@/lib/products/clinical-evaluation-service";

async function loadLiteratureEvidenceBase64(
  shots:
    | Array<{ storageKey: string; caption?: string; fileName: string }>
    | undefined,
): Promise<{ base64: string; caption: string }[]> {
  const result: { base64: string; caption: string }[] = [];
  for (const ss of shots ?? []) {
    const buf = await readLiteratureEvidenceBuffer(ss.storageKey);
    if (buf) {
      result.push({
        base64: buf.toString("base64"),
        caption: ss.caption?.trim() || ss.fileName,
      });
    }
  }
  return result;
}

async function appendLiteratureEvidenceMarkers(
  markdown: string,
  literatureData: ReturnType<typeof parseLiteratureSearchJson>,
  locale: "tr" | "en",
): Promise<string> {
  if (!literatureData) return markdown;
  const markers: string[] = [];
  const tr = locale === "tr";

  const pubmedShots = await loadLiteratureEvidenceBase64(literatureData.evidenceScreenshots);
  if (pubmedShots.length) {
    markers.push(
      embedLiteratureEvidenceMarker({
        locale,
        title: tr ? "Canlı PubMed — kanıt ekran görüntüleri" : "Live PubMed — evidence screenshots",
        screenshots: pubmedShots,
      }),
    );
  }

  for (const row of literatureData.registryResults ?? []) {
    const shots = await loadLiteratureEvidenceBase64(row.evidenceScreenshots);
    if (!shots.length) continue;
    markers.push(
      embedLiteratureEvidenceMarker({
        locale,
        title: tr
          ? `${databaseLabel(row.registryId, locale)} — kanıt ekran görüntüleri`
          : `${databaseLabel(row.registryId, locale)} — evidence screenshots`,
        screenshots: shots,
      }),
    );
  }

  if (!markers.length) return markdown;
  return [
    markdown,
    "",
    tr ? "## Kanıt ekran görüntüleri" : "## Evidence screenshots",
    "",
    ...markers,
  ].join("\n");
}

export async function buildCepInput(
  companyId: string,
  productId: string,
  locale: "tr" | "en",
  existingPlan?: string | null,
): Promise<CepBuildInput | null> {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    include: {
      riskItems: { orderBy: { createdAt: "asc" } },
      clinicalEvaluation: true,
    },
  });
  if (!product) return null;
  assertCompanyAccess(product.companyId, companyId);

  const codingCtx = product.riskItems.map((r) => ({
    id: r.id,
    riskNo: r.riskNo,
    tableERef: r.tableERef,
    riskSource: r.riskSource,
  }));

  const cer = product.clinicalEvaluation;
  const literatureData = parseLiteratureSearchJson(cer?.literatureDataJson ?? null);
  const equivalentDevicesData = parseEquivalentDevicesJson(cer?.equivalentDevicesDataJson ?? null);

  return {
    locale,
    product: {
      name: product.name,
      brand: product.brand,
      model: product.model,
      emdnCode: product.emdnCode,
      basicUdiDi: product.basicUdiDi,
      deviceClass: DEVICE_CLASS_LABEL[product.deviceClass] ?? product.deviceClass,
      intendedPurpose: product.intendedPurpose,
      indications: product.indications,
      contraindications: product.contraindications,
      patientPopulation: product.patientPopulation,
      userProfile: product.userProfile,
      materials: product.materials,
      isSterile: product.isSterile,
      sterilization: product.sterilization,
      isInvasive: product.isInvasive,
      containsSoftware: product.containsSoftware,
      isImplantable: product.isImplantable,
      hasMeasuringFn: product.hasMeasuringFn,
      bodyContactDuration: product.bodyContactDuration,
      isReusable: product.isReusable,
      shelfLife: product.shelfLife,
    },
    risks: product.riskItems.map((r) => ({
      riskNo: displayRiskNo(r, codingCtx),
      hazardousSituation: r.hazardousSituation,
      harm: r.harm,
      initialSeverity: r.initialSeverity,
      initialProbability: r.initialProbability,
      residualSeverity: r.residualSeverity,
      residualProbability: r.residualProbability,
    })),
    literatureData,
    equivalentDevicesData,
    pmsPmcfInputs: cer?.pmsPmcfInputs ?? null,
    planNotes: existingPlan ?? cer?.plan ?? null,
    variantsJson: product.variantsJson,
  };
}

export async function resolveCepExportMarkdown(
  companyId: string,
  productId: string,
  locale: "tr" | "en",
): Promise<{ markdown: string; productName: string } | null> {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    select: { name: true, clinicalEvaluation: { select: { plan: true, literatureDataJson: true } } },
  });
  if (!product) return null;

  const input = await buildCepInput(companyId, productId, locale, product.clinicalEvaluation?.plan);
  if (!input) return null;

  const literatureData = parseLiteratureSearchJson(product.clinicalEvaluation?.literatureDataJson ?? null);
  let body = buildCepDocument(input);
  body = await appendLiteratureEvidenceMarkers(body, literatureData, locale);

  const markdown = enrichCepExportMarkdown(body, locale, input.product.name, {
    preparedAt: literatureData?.preparedAt || literatureData?.searchDate,
    searchDate: literatureData?.searchDate,
  });

  return { markdown, productName: product.name };
}

export async function generatePreparedCep(
  companyId: string,
  productId: string,
  locale: "tr" | "en" = "tr",
) {
  const input = await buildCepInput(companyId, productId, locale);
  if (!input) return null;

  const plan = buildCepCore(input);
  await upsertClinicalEvaluation(companyId, productId, { plan });
  await applyCerPlanSync(companyId, productId, locale);
  return getClinicalEvaluation(companyId, productId);
}
