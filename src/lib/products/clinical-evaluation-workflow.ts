import "server-only";
import type { DocStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { BadRequestError, NotFoundError } from "@/lib/auth/errors";
import { computeClinicalReadiness } from "@/lib/domain/clinical-readiness";
import type { ClinicalEvaluationData } from "@/lib/domain/clinical-evaluation";
import { parseLiteratureSearchJson } from "@/lib/domain/clinical-literature-model";
import { parseEquivalentDevicesJson } from "@/lib/domain/clinical-equivalent-model";
import { parseClinicalStudiesJson } from "@/lib/domain/clinical-study-model";

import type { CerRevisionEntry } from "@/lib/domain/clinical-evaluation";
import { CER_TRANSITIONS } from "@/lib/domain/clinical-evaluation";

export type { CerRevisionEntry } from "@/lib/domain/clinical-evaluation";
export { CER_TRANSITIONS } from "@/lib/domain/clinical-evaluation";

export function assertCerTransition(from: DocStatus, to: DocStatus) {
  if (!CER_TRANSITIONS[from]?.includes(to)) {
    throw new BadRequestError(`cer.status.err.transition`);
  }
}

export function isCerMutable(status: DocStatus): boolean {
  return status === "DRAFT" || status === "REJECTED" || status === "MISSING";
}

export function parseCerRevisionHistory(raw: unknown): CerRevisionEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e) => e && typeof e === "object")
    .map((e) => {
      const o = e as Record<string, unknown>;
      return {
        rev: Number(o.rev) || 0,
        date: String(o.date ?? ""),
        by: String(o.by ?? ""),
        note: String(o.note ?? ""),
      };
    })
    .filter((e) => e.rev > 0);
}

function cerReadinessBlockReason(evaluation: ClinicalEvaluationData): string | null {
  const readiness = computeClinicalReadiness(evaluation);
  if (readiness.percent < 70) return "cer.status.err.readiness";
  if (!evaluation.literatureData?.preparedByMedDoc) return "cer.status.err.literature";
  if ((evaluation.clinicalStudies?.length ?? 0) < 3) return "cer.status.err.studies";
  if (!evaluation.report?.trim() || evaluation.report.trim().length < 40) return "cer.status.err.report";
  return null;
}

async function loadCerRow(productId: string, companyId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    include: {
      clinicalEvaluation: {
        include: {
          submittedBy: { select: { id: true, name: true, email: true } },
          approvedBy: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  if (!product?.clinicalEvaluation) throw new NotFoundError();
  return { product, cer: product.clinicalEvaluation };
}

function toEvaluationData(cer: NonNullable<Awaited<ReturnType<typeof loadCerRow>>["cer"]>): ClinicalEvaluationData {
  return {
    id: cer.id,
    plan: cer.plan ?? undefined,
    stateOfTheArt: cer.stateOfTheArt ?? undefined,
    equivalentDevices: cer.equivalentDevices ?? undefined,
    literatureStrategy: cer.literatureStrategy ?? undefined,
    clinicalDataSummary: cer.clinicalDataSummary ?? undefined,
    benefitRiskConclusion: cer.benefitRiskConclusion ?? undefined,
    pmsPmcfInputs: cer.pmsPmcfInputs ?? undefined,
    report: cer.report ?? undefined,
    literatureData: parseLiteratureSearchJson(cer.literatureDataJson),
    clinicalStudies: parseClinicalStudiesJson(cer.clinicalStudiesJson),
    equivalentDevicesData: parseEquivalentDevicesJson(cer.equivalentDevicesDataJson),
    status: cer.status,
    updatedAt: cer.updatedAt.toISOString(),
  };
}

export async function transitionClinicalEvaluation(params: {
  companyId: string;
  productId: string;
  userId: string;
  userName: string;
  status: DocStatus;
  action: string;
  canApprove: boolean;
  ip?: string | null;
}) {
  const { cer } = await loadCerRow(params.productId, params.companyId);
  assertCerTransition(cer.status, params.status);

  if (params.status === "IN_REVIEW") {
    const block = cerReadinessBlockReason(toEvaluationData(cer));
    if (block) throw new BadRequestError(block);
  }

  if (params.status === "APPROVED" && !params.canApprove) {
    throw new BadRequestError("cer.status.err.approveRole");
  }

  const now = new Date();
  let revisionNo = cer.revisionNo ?? 0;
  let revisionHistoryJson = parseCerRevisionHistory(cer.revisionHistoryJson);

  if (params.status === "APPROVED") {
    revisionNo = Math.max(revisionNo, 1);
    const entry: CerRevisionEntry = {
      rev: revisionNo,
      date: now.toISOString().slice(0, 10),
      by: params.userName,
      note: "CER approved",
    };
    const withoutDup = revisionHistoryJson.filter((e) => e.rev !== revisionNo);
    revisionHistoryJson = [...withoutDup, entry];
  }

  const updated = await prisma.clinicalEvaluation.update({
    where: { id: cer.id },
    data: {
      status: params.status,
      submittedById: params.status === "IN_REVIEW" ? params.userId : cer.submittedById,
      approvedById:
        params.status === "APPROVED"
          ? params.userId
          : params.status === "REJECTED"
            ? null
            : cer.approvedById,
      approvedAt:
        params.status === "APPROVED" ? now : params.status === "REJECTED" ? null : cer.approvedAt,
      revisionNo: params.status === "APPROVED" ? revisionNo : cer.revisionNo,
      ...(params.status === "APPROVED"
        ? { revisionHistoryJson: revisionHistoryJson as object[] }
        : {}),
      ...(params.status === "DRAFT" && cer.status === "REJECTED"
        ? { submittedById: null, approvedById: null, approvedAt: null }
        : {}),
    },
    include: {
      submittedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
    },
  });

  await writeAuditLog({
    action: params.action,
    userId: params.userId,
    companyId: params.companyId,
    entity: "ClinicalEvaluation",
    entityId: cer.id,
    metadata: { productId: params.productId, status: params.status },
    ip: params.ip,
  });

  return updated;
}
