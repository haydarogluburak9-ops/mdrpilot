import "server-only";
import { prisma } from "@/lib/db";
import { BadRequestError } from "@/lib/auth/errors";
import type { DocStatus } from "@/lib/domain/types";
import {
  canTransitionGsprStatus,
  gsprStatusBlockReason,
  resolveGsprStatus,
  type GsprRowStatusInput,
} from "@/lib/domain/gspr-row-status";

async function loadRow(gsprItemId: string): Promise<{
  id: string;
  status: DocStatus;
  applicable: string;
  justification: string | null;
  evidenceDocument: string | null;
  evidenceManual: boolean;
  linkedFileCount: number;
} | null> {
  const item = await prisma.gSPRItem.findUnique({
    where: { id: gsprItemId },
    select: {
      id: true,
      status: true,
      applicable: true,
      justification: true,
      evidenceDocument: true,
      evidenceManual: true,
      _count: { select: { evidenceLinks: true } },
    },
  });
  if (!item) return null;
  return {
    id: item.id,
    status: item.status as DocStatus,
    applicable: item.applicable,
    justification: item.justification,
    evidenceDocument: item.evidenceDocument,
    evidenceManual: item.evidenceManual,
    linkedFileCount: item._count.evidenceLinks,
  };
}

function rowContext(row: NonNullable<Awaited<ReturnType<typeof loadRow>>>) {
  return {
    applicable: row.applicable,
    justification: row.justification,
    evidenceDocument: row.evidenceDocument,
    evidenceManual: row.evidenceManual,
    linkedFileCount: row.linkedFileCount,
  };
}

/** Stored status adjusted for content readiness (UI and transition source of truth). */
function effectiveStatus(row: NonNullable<Awaited<ReturnType<typeof loadRow>>>): DocStatus {
  return resolveGsprStatus(row.status, rowContext(row));
}

async function syncToEffective(gsprItemId: string, row: NonNullable<Awaited<ReturnType<typeof loadRow>>>): Promise<DocStatus> {
  const effective = effectiveStatus(row);
  if (effective !== row.status && row.status !== "APPROVED" && row.status !== "IN_REVIEW") {
    await prisma.gSPRItem.update({ where: { id: gsprItemId }, data: { status: effective } });
    row.status = effective;
  }
  return row.status;
}

/** Recompute and persist GSPR row status from current evidence + justification. */
export async function recomputeGsprStatus(gsprItemId: string): Promise<void> {
  const row = await loadRow(gsprItemId);
  if (!row) return;

  const next = resolveGsprStatus(row.status, rowContext(row));

  if (next !== row.status) {
    await prisma.gSPRItem.update({ where: { id: gsprItemId }, data: { status: next } });
  }
}

export async function setGsprStatus(
  gsprItemId: string,
  target: DocStatus,
  opts?: { allowApprove?: boolean },
): Promise<DocStatus> {
  const row = await loadRow(gsprItemId);
  if (!row) throw new BadRequestError("gspr.api.err.itemNotFound");

  if (target === "APPROVED" && !opts?.allowApprove) {
    throw new BadRequestError("gspr.status.err.approveRole");
  }

  const from = await syncToEffective(gsprItemId, row);

  if (!canTransitionGsprStatus(from, target)) {
    throw new BadRequestError("gspr.status.err.transition");
  }

  const input: GsprRowStatusInput = { status: from, ...rowContext(row) };
  const block = gsprStatusBlockReason(input, target);
  if (block) {
    throw new BadRequestError(block);
  }

  if (target !== from) {
    await prisma.gSPRItem.update({ where: { id: gsprItemId }, data: { status: target } });
  }
  return target;
}

/** Sync auto-derived statuses (MISSING/DRAFT). Downgrade IN_REVIEW/APPROVED only when content no longer qualifies. */
export async function recomputeAllGsprStatuses(productId: string): Promise<number> {
  const items = await prisma.gSPRItem.findMany({
    where: { productId },
    select: {
      id: true,
      status: true,
      applicable: true,
      justification: true,
      evidenceDocument: true,
      evidenceManual: true,
      _count: { select: { evidenceLinks: true } },
    },
  });

  let updated = 0;
  const ops = items
    .map((item) => {
      const next = resolveGsprStatus(item.status as DocStatus, {
        applicable: item.applicable,
        justification: item.justification,
        evidenceDocument: item.evidenceDocument,
        evidenceManual: item.evidenceManual,
        linkedFileCount: item._count.evidenceLinks,
      });
      if (next === item.status) return null;
      updated++;
      return prisma.gSPRItem.update({ where: { id: item.id }, data: { status: next } });
    })
    .filter(Boolean);

  if (ops.length) await prisma.$transaction(ops as ReturnType<typeof prisma.gSPRItem.update>[]);
  return updated;
}

export interface BulkGsprStatusResult {
  updated: number;
  skipped: number;
}

/** Move all eligible rows to IN_REVIEW or APPROVED. */
export async function bulkSetGsprStatus(
  productId: string,
  target: "IN_REVIEW" | "APPROVED",
  opts: { allowApprove: boolean; itemIds?: string[] },
): Promise<BulkGsprStatusResult> {
  if (target === "APPROVED" && !opts.allowApprove) {
    throw new BadRequestError("gspr.status.err.approveRole");
  }

  const items = await prisma.gSPRItem.findMany({
    where: {
      productId,
      ...(opts.itemIds?.length ? { id: { in: opts.itemIds } } : {}),
    },
    select: {
      id: true,
      status: true,
      applicable: true,
      justification: true,
      evidenceDocument: true,
      evidenceManual: true,
      _count: { select: { evidenceLinks: true } },
    },
  });

  let updated = 0;
  let skipped = 0;
  const ops: ReturnType<typeof prisma.gSPRItem.update>[] = [];

  for (const item of items) {
    const ctx = {
      applicable: item.applicable,
      justification: item.justification,
      evidenceDocument: item.evidenceDocument,
      evidenceManual: item.evidenceManual,
      linkedFileCount: item._count.evidenceLinks,
    };
    const from = resolveGsprStatus(item.status as DocStatus, ctx);
    const input: GsprRowStatusInput = { status: from, ...ctx };

    if (from === target) {
      skipped++;
      continue;
    }
    if (!canTransitionGsprStatus(from, target)) {
      skipped++;
      continue;
    }
    if (gsprStatusBlockReason(input, target)) {
      skipped++;
      continue;
    }

    ops.push(prisma.gSPRItem.update({ where: { id: item.id }, data: { status: target } }));
    updated++;
  }

  if (ops.length) await prisma.$transaction(ops);
  return { updated, skipped };
}
