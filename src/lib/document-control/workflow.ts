import "server-only";
import type { DocumentSourceType } from "@prisma/client";
import { prisma } from "@/lib/db";

const WORKFLOW_STEPS = [
  { stepOrder: 1, stepRole: "REVIEWER" as const, assignedRole: "CONSULTANT" as const },
  { stepOrder: 2, stepRole: "APPROVER" as const, assignedRole: "QUALITY_MANAGER" as const },
  { stepOrder: 3, stepRole: "RELEASE" as const, assignedRole: "QUALITY_MANAGER" as const },
];

export async function initDocumentReviewWorkflow(input: {
  companyId: string;
  sourceType: DocumentSourceType;
  sourceId: string;
  revisionNo: number;
}) {
  await prisma.documentReviewStep.deleteMany({
    where: {
      companyId: input.companyId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      revisionNo: input.revisionNo,
    },
  });

  await prisma.documentReviewStep.createMany({
    data: WORKFLOW_STEPS.map((s) => ({
      companyId: input.companyId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      revisionNo: input.revisionNo,
      stepOrder: s.stepOrder,
      stepRole: s.stepRole,
      assignedRole: s.assignedRole,
      status: "PENDING",
    })),
  });
}

export async function getDocumentReviewSteps(
  companyId: string,
  sourceType: DocumentSourceType,
  sourceId: string,
  revisionNo: number,
) {
  return prisma.documentReviewStep.findMany({
    where: { companyId, sourceType, sourceId, revisionNo },
    orderBy: { stepOrder: "asc" },
  });
}

export async function approveDocumentReviewStep(input: {
  companyId: string;
  userId: string;
  userName: string;
  sourceType: DocumentSourceType;
  sourceId: string;
  revisionNo: number;
  stepOrder: number;
  intentText: string;
  ipAddress?: string;
}) {
  const step = await prisma.documentReviewStep.findFirst({
    where: {
      companyId: input.companyId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      revisionNo: input.revisionNo,
      stepOrder: input.stepOrder,
    },
  });
  if (!step) throw new Error("Not found");
  if (step.status !== "PENDING") throw new Error("docControl.stepNotPending");

  const prior = await prisma.documentReviewStep.findFirst({
    where: {
      companyId: input.companyId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      revisionNo: input.revisionNo,
      stepOrder: { lt: input.stepOrder },
      status: { not: "APPROVED" },
    },
  });
  if (prior) throw new Error("docControl.priorStepIncomplete");

  await prisma.documentReviewStep.update({
    where: { id: step.id },
    data: {
      status: "APPROVED",
      reviewerId: input.userId,
      reviewerName: input.userName,
      intentText: input.intentText.trim(),
      reviewedAt: new Date(),
      ipAddress: input.ipAddress,
    },
  });

  const remaining = await prisma.documentReviewStep.count({
    where: {
      companyId: input.companyId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      revisionNo: input.revisionNo,
      status: "PENDING",
    },
  });

  return { allApproved: remaining === 0, stepRole: step.stepRole };
}

export async function hasActiveWorkflow(
  companyId: string,
  sourceType: DocumentSourceType,
  sourceId: string,
  revisionNo: number,
) {
  const count = await prisma.documentReviewStep.count({
    where: { companyId, sourceType, sourceId, revisionNo },
  });
  return count > 0;
}
