import "server-only";
import type { DocumentKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/auth/errors";
import { linkEvidence, syncAllGsprEvidenceForProduct } from "@/lib/files/evidence-service";
import {
  getGsprEvidenceHint,
  ifuEvidenceHint,
  labelArtworkHint,
} from "@/lib/domain/gspr-evidence-i18n";
import {
  DOCUMENT_KIND_TO_GSPR,
  resolveStandardForGspr,
  type GsprStandardContext,
} from "@/lib/products/gspr-standards";
import { formatStandardReference } from "@/lib/domain/standards-catalog";
import { GSPR_TEMPLATE, OBSOLETE_GSPR_NOS } from "@/lib/domain/gspr-template";
import { gsprRequirementText } from "@/lib/domain/gspr-text";
import { sortByGsprNo } from "@/lib/domain/gspr-sort";
import { applyApplicability } from "@/lib/products/applicability";
import { fillGsprJustifications } from "@/lib/products/gspr-justification-fill";
import { recomputeAllGsprStatuses, recomputeGsprStatus } from "@/lib/products/gspr-status-sync";

export interface GsprAutoFillResult {
  standardsUpdated: number;
  linksCreated: number;
  hintsUpdated: number;
  evidenceSynced: number;
  rowsAdded: number;
  justificationsUpdated: number;
  justificationSource: "ai" | "rules" | "none";
}

function gsprContext(product: {
  isSterile: boolean;
  sterilization: GsprStandardContext["sterilization"];
  hasMeasuringFn: boolean;
  containsSoftware: boolean;
  isInvasive: boolean;
  isActive: boolean;
  emitsRadiation: boolean;
  administersMedicineOrEnergy: boolean;
  containsMedicinalSubstance: boolean;
  containsBiologicalMaterial: boolean;
  isAbsorbable: boolean;
  containsCmrOrEndocrine: boolean;
  containsNanomaterial: boolean;
  isForLayUser: boolean;
  isReusable: boolean;
  isImplantable: boolean;
  bodyContactDuration: string | null;
  materials: string | null;
}): GsprStandardContext {
  return {
    isSterile: product.isSterile,
    sterilization: product.sterilization,
    hasMeasuringFn: product.hasMeasuringFn,
    containsSoftware: product.containsSoftware,
    isInvasive: product.isInvasive,
    isActive: product.isActive,
    emitsRadiation: product.emitsRadiation,
    administersMedicineOrEnergy: product.administersMedicineOrEnergy,
    containsMedicinalSubstance: product.containsMedicinalSubstance,
    containsBiologicalMaterial: product.containsBiologicalMaterial,
    isAbsorbable: product.isAbsorbable,
    containsCmrOrEndocrine: product.containsCmrOrEndocrine,
    containsNanomaterial: product.containsNanomaterial,
    isForLayUser: product.isForLayUser,
    isReusable: product.isReusable,
    isImplantable: product.isImplantable,
    bodyContactDuration: product.bodyContactDuration,
    materials: product.materials,
  };
}

function resolveGsprTargetIds(
  documentKind: DocumentKind,
  analysisJson: unknown,
  items: { id: string; gsprNo: string }[],
): string[] {
  const ids = new Set<string>();
  const byNo = new Map(items.map((g) => [g.gsprNo, g]));
  const byId = new Map(items.map((g) => [g.id, g]));

  const linkParents = DOCUMENT_KIND_TO_GSPR[documentKind] ?? [];
  for (const parent of linkParents) {
    for (const g of items) {
      if (g.gsprNo === parent || g.gsprNo.startsWith(`${parent}.`)) ids.add(g.id);
    }
  }

  const links = (analysisJson as { recommendedLinks?: { targetType?: string; targetIdOrHint?: string }[] } | null)
    ?.recommendedLinks ?? [];
  for (const l of links) {
    if (l.targetType !== "GSPR" || typeof l.targetIdOrHint !== "string") continue;
    const hint = l.targetIdOrHint;
    if (byId.has(hint)) ids.add(hint);
    else {
      const item = byNo.get(hint);
      if (item) ids.add(item.id);
    }
  }
  return Array.from(ids);
}

/**
 * Auto-fill GSPR standard references and evidence links from device properties,
 * the standards catalogue mapping, and files in the File Center.
 */
export async function autoFillGspr(
  productId: string,
  companyId: string,
  userId: string,
  locale = "tr",
): Promise<GsprAutoFillResult> {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    include: {
      gsprItems: { orderBy: { gsprNo: "asc" } },
      ifuDocuments: { orderBy: { updatedAt: "desc" }, take: 1 },
      labelDocuments: { orderBy: { updatedAt: "desc" }, take: 1 },
      uploadedFiles: {
        where: { deletedAt: null },
        select: { id: true, documentKind: true, analysisJson: true },
      },
    },
  });
  if (!product) throw new NotFoundError();

  await prisma.gSPRItem.deleteMany({
    where: {
      productId,
      gsprNo: { in: [...OBSOLETE_GSPR_NOS] },
      status: "MISSING",
      evidenceDocument: null,
    },
  });

  const haveNos = new Set(product.gsprItems.map((g) => g.gsprNo));
  const missing = GSPR_TEMPLATE.filter((g) => !haveNos.has(g.gsprNo));
  let rowsAdded = 0;
  if (missing.length) {
    await prisma.gSPRItem.createMany({
      data: missing.map((g) => ({
        productId,
        gsprNo: g.gsprNo,
        requirementSummary:
          locale === "tr" ? gsprRequirementText(g.gsprNo, g.requirementSummary, "tr") : g.requirementSummary,
        applicable: "JUSTIFICATION" as const,
        status: "MISSING" as const,
      })),
    });
    rowsAdded = missing.length;
    await applyApplicability(productId);
    product.gsprItems = sortByGsprNo(
      await prisma.gSPRItem.findMany({
        where: { productId },
        orderBy: { gsprNo: "asc" },
      }),
    );
  }

  const ctx = gsprContext(product);
  const gsprById = new Map(product.gsprItems.map((g) => [g.id, g]));
  const gsprByNo = new Map(product.gsprItems.map((g) => [g.gsprNo, g]));

  let standardsUpdated = 0;
  let hintsUpdated = 0;
  let linksCreated = 0;

  const gsprItemIds = product.gsprItems.map((g) => g.id);
  const linkedItemIds = new Set(
    (
      await prisma.gSPREvidenceLink.findMany({
        where: { gsprItemId: { in: gsprItemIds } },
        select: { gsprItemId: true },
        distinct: ["gsprItemId"],
      })
    ).map((l) => l.gsprItemId),
  );

  const standardOps: Promise<unknown>[] = [];
  const hintOps: Promise<unknown>[] = [];

  for (const g of product.gsprItems) {
    if (g.applicable === "NO") continue;

    const standard = resolveStandardForGspr(g.gsprNo, ctx);
    const formattedExisting = g.standardReference ? formatStandardReference(g.standardReference) : null;
    const toWrite = standard ?? formattedExisting;
    if (toWrite && toWrite !== g.standardReference) {
      standardOps.push(
        prisma.gSPRItem.update({ where: { id: g.id }, data: { standardReference: toWrite } }),
      );
      standardsUpdated++;
    }

    const hint = getGsprEvidenceHint(g.gsprNo, locale);
    if (hint && !g.evidenceDocument && !g.evidenceManual && !linkedItemIds.has(g.id)) {
      hintOps.push(
        prisma.gSPRItem.update({ where: { id: g.id }, data: { evidenceDocument: hint, evidenceManual: false } }),
      );
      hintsUpdated++;
    }
  }

  await Promise.all([...standardOps, ...hintOps]);

  const latestIfu = product.ifuDocuments[0];
  const latestLabel = product.labelDocuments[0];

  if (latestIfu) {
    const ifuOps: Promise<unknown>[] = [];
    for (const g of product.gsprItems) {
      if (g.applicable === "NO") continue;
      if (!g.gsprNo.startsWith("23.4.") && g.gsprNo !== "23.1") continue;
      if (!linkedItemIds.has(g.id) && !g.evidenceDocument) {
        ifuOps.push(
          prisma.gSPRItem.update({ where: { id: g.id }, data: { evidenceDocument: ifuEvidenceHint(latestIfu.version, locale), evidenceManual: false } }),
        );
        hintsUpdated++;
      }
    }
    await Promise.all(ifuOps);
  }

  if (latestLabel) {
    const labelOps: Promise<unknown>[] = [];
    for (const g of product.gsprItems) {
      if (g.applicable === "NO" || !g.gsprNo.startsWith("23.2.")) continue;
      if (!linkedItemIds.has(g.id) && !g.evidenceDocument) {
        labelOps.push(
          prisma.gSPRItem.update({ where: { id: g.id }, data: { evidenceDocument: labelArtworkHint(locale), evidenceManual: false } }),
        );
        hintsUpdated++;
      }
    }
    await Promise.all(labelOps);
  }

  const companyFiles = await prisma.uploadedFile.findMany({
    where: {
      companyId,
      deletedAt: null,
      OR: [{ productId }, { productId: null }],
    },
    select: { id: true, documentKind: true, analysisJson: true, productId: true },
  });

  const filesToScan = [
    ...product.uploadedFiles.map((f) => ({ id: f.id, documentKind: f.documentKind, analysisJson: f.analysisJson })),
    ...companyFiles.filter((f) => f.productId === null),
  ];

  const existingLinks = await prisma.gSPREvidenceLink.findMany({
    where: { productId, companyId },
    select: { gsprItemId: true, uploadedFileId: true },
  });
  const linked = new Set(existingLinks.map((l) => `${l.gsprItemId}:${l.uploadedFileId}`));

  for (const file of filesToScan) {
    const targetIds = resolveGsprTargetIds(file.documentKind, file.analysisJson, product.gsprItems);

    for (const gsprItemId of targetIds) {
      const item = gsprById.get(gsprItemId);
      if (!item || item.applicable === "NO") continue;
      const key = `${gsprItemId}:${file.id}`;
      if (linked.has(key)) continue;

      await linkEvidence("gspr", {
        companyId,
        userId,
        targetId: gsprItemId,
        uploadedFileId: file.id,
        note: locale === "tr" ? "Belge türü / analizden otomatik bağlandı" : "Auto-linked from document type / file analysis",
      });
      linked.add(key);
      linksCreated++;

      await recomputeGsprStatus(gsprItemId);
    }
  }

  const evidenceSynced = await syncAllGsprEvidenceForProduct(productId);
  await recomputeAllGsprStatuses(productId);

  const { justificationsUpdated, source: justificationSource } = await fillGsprJustifications(
    productId,
    companyId,
    locale,
    { overwriteNo: true, overwriteGeneric: true, useAi: true },
  );

  return {
    standardsUpdated,
    linksCreated,
    hintsUpdated,
    evidenceSynced,
    rowsAdded,
    justificationsUpdated,
    justificationSource: justificationsUpdated ? justificationSource : "none",
  };
}
