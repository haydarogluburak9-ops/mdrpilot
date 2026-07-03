import "server-only";
import { prisma } from "@/lib/db";
import type { DesignControlPhase } from "@prisma/client";
import type { DocStatus } from "@/lib/domain/types";

export const DESIGN_CONTROL_PHASES: DesignControlPhase[] = [
  "DESIGN_INPUT",
  "DESIGN_OUTPUT",
  "DESIGN_REVIEW",
  "DESIGN_VERIFICATION",
  "DESIGN_VALIDATION",
  "DESIGN_TRANSFER",
];

const DEFAULT_TITLES: Record<DesignControlPhase, { en: string; tr: string }> = {
  DESIGN_INPUT: { en: "Design inputs", tr: "Tasarım girdileri" },
  DESIGN_OUTPUT: { en: "Design outputs", tr: "Tasarım çıktıları" },
  DESIGN_REVIEW: { en: "Design review", tr: "Tasarım gözden geçirme" },
  DESIGN_VERIFICATION: { en: "Design verification", tr: "Tasarım doğrulama" },
  DESIGN_VALIDATION: { en: "Design validation", tr: "Tasarım validasyonu" },
  DESIGN_TRANSFER: { en: "Design transfer to production", tr: "Üretime tasarım devri" },
};

export async function ensureDesignControlRecords(productId: string, locale: "tr" | "en") {
  const existing = await prisma.designControlRecord.findMany({ where: { productId } });
  const byPhase = new Map(existing.map((r) => [r.phase, r]));
  const toCreate = DESIGN_CONTROL_PHASES.filter((p) => !byPhase.has(p));
  if (toCreate.length === 0) return existing;

  await prisma.designControlRecord.createMany({
    data: toCreate.map((phase) => ({
      productId,
      phase,
      title: DEFAULT_TITLES[phase][locale],
      status: "DRAFT" as DocStatus,
    })),
  });

  return prisma.designControlRecord.findMany({
    where: { productId },
    orderBy: { phase: "asc" },
  });
}

export async function loadDesignControl(productId: string, companyId: string, locale: "tr" | "en") {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    select: { id: true },
  });
  if (!product) return null;
  const records = await ensureDesignControlRecords(productId, locale);
  return records.map((r) => ({
    id: r.id,
    phase: r.phase,
    title: r.title,
    description: r.description,
    reference: r.reference,
    status: r.status as DocStatus,
    ownerName: r.ownerName,
    completedAt: r.completedAt?.toISOString() ?? null,
    evidenceFileIds: (r.evidenceFileIds as string[] | null) ?? [],
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function updateDesignControlRecord(
  companyId: string,
  recordId: string,
  patch: {
    title?: string;
    description?: string | null;
    reference?: string | null;
    status?: DocStatus;
    ownerName?: string | null;
    completedAt?: string | null;
    evidenceFileIds?: string[];
  },
) {
  const record = await prisma.designControlRecord.findFirst({
    where: { id: recordId, product: { companyId } },
  });
  if (!record) return null;

  return prisma.designControlRecord.update({
    where: { id: recordId },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.reference !== undefined ? { reference: patch.reference } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.ownerName !== undefined ? { ownerName: patch.ownerName } : {}),
      ...(patch.completedAt !== undefined
        ? { completedAt: patch.completedAt ? new Date(patch.completedAt) : null }
        : {}),
      ...(patch.evidenceFileIds !== undefined
        ? { evidenceFileIds: patch.evidenceFileIds }
        : {}),
    },
  });
}
