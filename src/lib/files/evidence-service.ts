import "server-only";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { recomputeGsprStatus } from "@/lib/products/gspr-status-sync";
import { NotFoundError } from "@/lib/auth/errors";

type EvidenceTarget = "gspr" | "technical-file" | "risk";

interface LinkParams {
  companyId: string;
  userId: string;
  targetId: string;
  uploadedFileId: string;
  note?: string | null;
  ip?: string | null;
}

async function assertFileInCompany(companyId: string, fileId: string): Promise<string> {
  const file = await prisma.uploadedFile.findFirst({ where: { id: fileId, deletedAt: null }, select: { companyId: true } });
  if (!file || file.companyId !== companyId) throw new NotFoundError();
  return companyId;
}

/** Resolve a target item's productId, enforcing company isolation. */
async function resolveTarget(target: EvidenceTarget, companyId: string, targetId: string): Promise<string> {
  if (target === "gspr") {
    const item = await prisma.gSPRItem.findUnique({ where: { id: targetId }, select: { productId: true, product: { select: { companyId: true } } } });
    if (!item || item.product.companyId !== companyId) throw new NotFoundError();
    return item.productId;
  }
  if (target === "technical-file") {
    const item = await prisma.technicalFileSection.findUnique({ where: { id: targetId }, select: { productId: true, product: { select: { companyId: true } } } });
    if (!item || item.product.companyId !== companyId) throw new NotFoundError();
    return item.productId;
  }
  const item = await prisma.riskItem.findUnique({ where: { id: targetId }, select: { productId: true, product: { select: { companyId: true } } } });
  if (!item || item.product.companyId !== companyId) throw new NotFoundError();
  return item.productId;
}

export async function linkEvidence(target: EvidenceTarget, params: LinkParams) {
  await assertFileInCompany(params.companyId, params.uploadedFileId);
  const productId = await resolveTarget(target, params.companyId, params.targetId);

  const data = {
    companyId: params.companyId,
    productId,
    uploadedFileId: params.uploadedFileId,
    linkedById: params.userId,
    note: params.note ?? null,
  };

  let link;
  if (target === "gspr") {
    link = await prisma.gSPREvidenceLink.upsert({
      where: { gsprItemId_uploadedFileId: { gsprItemId: params.targetId, uploadedFileId: params.uploadedFileId } },
      update: { note: params.note ?? null },
      create: { ...data, gsprItemId: params.targetId },
    });
  } else if (target === "technical-file") {
    link = await prisma.technicalFileEvidenceLink.upsert({
      where: { technicalFileSectionId_uploadedFileId: { technicalFileSectionId: params.targetId, uploadedFileId: params.uploadedFileId } },
      update: { note: params.note ?? null },
      create: { ...data, technicalFileSectionId: params.targetId },
    });
  } else {
    link = await prisma.riskEvidenceLink.upsert({
      where: { riskItemId_uploadedFileId: { riskItemId: params.targetId, uploadedFileId: params.uploadedFileId } },
      update: { note: params.note ?? null },
      create: { ...data, riskItemId: params.targetId },
    });
  }

  await writeAuditLog({
    action: "evidence.link",
    userId: params.userId,
    companyId: params.companyId,
    entity: "EvidenceLink",
    entityId: link.id,
    metadata: { target, targetId: params.targetId, uploadedFileId: params.uploadedFileId },
    ip: params.ip,
  });

  if (target === "gspr") await syncGsprEvidenceDocument(params.targetId);
  if (target === "gspr") await recomputeGsprStatus(params.targetId);
  return link;
}

/** Merge linked file names into GSPRItem.evidenceDocument for table/export display. */
export async function syncGsprEvidenceDocument(gsprItemId: string): Promise<boolean> {
  const links = await prisma.gSPREvidenceLink.findMany({
    where: { gsprItemId },
    include: { uploadedFile: { select: { fileName: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (!links.length) return false;

  const names = links.map((l) => l.uploadedFile.fileName).join(", ");
  await prisma.gSPRItem.update({
    where: { id: gsprItemId },
    data: { evidenceDocument: names || null, evidenceManual: false },
  });
  return links.length > 0;
}

/** Batch-sync evidenceDocument for all GSPR rows of a product (one query instead of N). */
export async function syncAllGsprEvidenceForProduct(productId: string): Promise<number> {
  const links = await prisma.gSPREvidenceLink.findMany({
    where: { gsprItem: { productId } },
    include: { uploadedFile: { select: { fileName: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (!links.length) return 0;

  const namesByItem = new Map<string, string[]>();
  for (const link of links) {
    const list = namesByItem.get(link.gsprItemId) ?? [];
    list.push(link.uploadedFile.fileName);
    namesByItem.set(link.gsprItemId, list);
  }

  await prisma.$transaction(
    [...namesByItem.entries()].map(([gsprItemId, names]) =>
      prisma.gSPRItem.update({
        where: { id: gsprItemId },
        data: { evidenceDocument: names.join(", "), evidenceManual: false },
      }),
    ),
  );
  return namesByItem.size;
}

export async function unlinkEvidence(
  target: EvidenceTarget,
  params: { companyId: string; userId: string; linkId: string; ip?: string | null },
) {
  if (target === "gspr") {
    const link = await prisma.gSPREvidenceLink.findUnique({ where: { id: params.linkId } });
    if (!link || link.companyId !== params.companyId) throw new NotFoundError();
    const gsprItemId = link.gsprItemId;
    await prisma.gSPREvidenceLink.delete({ where: { id: params.linkId } });
    await syncGsprEvidenceDocument(gsprItemId).catch(() => undefined);
  } else if (target === "technical-file") {
    const link = await prisma.technicalFileEvidenceLink.findUnique({ where: { id: params.linkId } });
    if (!link || link.companyId !== params.companyId) throw new NotFoundError();
    await prisma.technicalFileEvidenceLink.delete({ where: { id: params.linkId } });
  } else {
    const link = await prisma.riskEvidenceLink.findUnique({ where: { id: params.linkId } });
    if (!link || link.companyId !== params.companyId) throw new NotFoundError();
    await prisma.riskEvidenceLink.delete({ where: { id: params.linkId } });
  }

  await writeAuditLog({
    action: "evidence.unlink",
    userId: params.userId,
    companyId: params.companyId,
    entity: "EvidenceLink",
    entityId: params.linkId,
    metadata: { target },
    ip: params.ip,
  });
}
