import "server-only";
import type { ComposerStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { NotFoundError, BadRequestError } from "@/lib/auth/errors";

/** Allowed status transitions for composer documents. ARCHIVED is terminal. */
export const COMPOSER_TRANSITIONS: Record<ComposerStatus, ComposerStatus[]> = {
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["APPROVED", "REJECTED"],
  REJECTED: ["DRAFT"],
  APPROVED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function assertTransition(from: ComposerStatus, to: ComposerStatus) {
  if (!COMPOSER_TRANSITIONS[from]?.includes(to)) {
    throw new BadRequestError(`Invalid status transition: ${from} → ${to}`);
  }
}

/** True when a document may be edited or AI-regenerated (i.e. is mutable). */
export function isMutable(status: ComposerStatus): boolean {
  return status === "DRAFT" || status === "REJECTED";
}

interface TransitionParams {
  companyId: string;
  userId: string;
  id: string;
  status: ComposerStatus;
  action: string;
  setApprover?: boolean;
  ip?: string | null;
}

export async function transitionComposer(params: TransitionParams) {
  const doc = await prisma.composerDocument.findFirst({ where: { id: params.id } });
  if (!doc || doc.companyId !== params.companyId) throw new NotFoundError();

  assertTransition(doc.status, params.status);

  const updated = await prisma.composerDocument.update({
    where: { id: doc.id },
    data: {
      status: params.status,
      ...(params.setApprover
        ? { approvedById: params.userId, approvedAt: new Date() }
        : params.status === "REJECTED"
          ? { approvedById: null, approvedAt: null }
          : {}),
      ...(params.status === "ARCHIVED" ? { archivedAt: new Date() } : {}),
    },
  });

  await writeAuditLog({
    action: params.action, userId: params.userId, companyId: params.companyId,
    entity: "ComposerDocument", entityId: doc.id, metadata: { status: params.status }, ip: params.ip,
  });

  return updated;
}
