import "server-only";
import { prisma } from "@/lib/db";
import { NotFoundError, BadRequestError } from "@/lib/auth/errors";
import { writeAuditLog } from "@/lib/audit";
import { loadComplianceSnapshot } from "@/lib/compliance/snapshot";
import { selectQuestions, weightForQuestion } from "./questions";
import { evaluateAudit, type AnsweredQuestion } from "./engine";
import { augmentAudit } from "./ai";
import { aiProviderInfo } from "@/lib/ai/provider-factory";
import type { AssessmentType, AuditStandardScope } from "./types";
import type { AuditAssessmentType, AuditSessionStatus, AuditStandardScope as PrismaScope } from "@prisma/client";

export interface CreateAuditParams {
  companyId: string;
  userId: string;
  productId?: string | null;
  standard: AuditStandardScope;
  assessmentType: AssessmentType;
  ip?: string | null;
}

export async function createAuditSession(params: CreateAuditParams) {
  if (params.productId) {
    const p = await prisma.product.findFirst({ where: { id: params.productId, deletedAt: null }, select: { companyId: true } });
    if (!p || p.companyId !== params.companyId) throw new NotFoundError();
  }

  const templates = selectQuestions(params.standard, params.assessmentType);
  if (templates.length === 0) throw new BadRequestError("No questions available for this scope");

  const session = await prisma.auditSession.create({
    data: {
      companyId: params.companyId,
      productId: params.productId ?? null,
      createdById: params.userId,
      standard: params.standard as PrismaScope,
      assessmentType: params.assessmentType as AuditAssessmentType,
      status: "IN_PROGRESS",
      questions: {
        create: templates.map((q, i) => ({
          order: i + 1,
          standardCode: q.standardCode,
          clauseNo: q.clauseNo,
          question: q.question,
          expectedEvidence: q.expectedEvidence,
        })),
      },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  await writeAuditLog({
    action: "audit.start", userId: params.userId, companyId: params.companyId,
    entity: "AuditSession", entityId: session.id,
    metadata: { standard: params.standard, assessmentType: params.assessmentType, questions: templates.length }, ip: params.ip,
  });

  return session;
}

async function loadSessionOr404(companyId: string, id: string) {
  const session = await prisma.auditSession.findFirst({ where: { id }, select: { id: true, companyId: true, status: true, productId: true, standard: true, assessmentType: true } });
  if (!session || session.companyId !== companyId) throw new NotFoundError();
  return session;
}

export async function submitAuditAnswer(params: {
  companyId: string; userId: string; sessionId: string; questionId: string; answerText: string; evidenceFileIds?: string[]; ip?: string | null;
}) {
  const session = await loadSessionOr404(params.companyId, params.sessionId);
  if (session.status !== "IN_PROGRESS") throw new BadRequestError("Audit session is not in progress");

  const question = await prisma.auditQuestion.findFirst({ where: { id: params.questionId, sessionId: params.sessionId }, select: { id: true } });
  if (!question) throw new NotFoundError();

  const answer = await prisma.auditAnswer.upsert({
    where: { questionId: params.questionId },
    create: {
      sessionId: params.sessionId, questionId: params.questionId, answerText: params.answerText,
      evidenceFileIdsJson: params.evidenceFileIds ?? undefined, createdById: params.userId,
    },
    update: { answerText: params.answerText, evidenceFileIdsJson: params.evidenceFileIds ?? undefined },
  });

  return answer;
}

export async function completeAuditSession(params: { companyId: string; userId: string; sessionId: string; ip?: string | null }) {
  const session = await loadSessionOr404(params.companyId, params.sessionId);
  if (session.status === "ARCHIVED") throw new BadRequestError("Session is archived");

  const questions = await prisma.auditQuestion.findMany({
    where: { sessionId: params.sessionId }, orderBy: { order: "asc" }, include: { answer: true },
  });

  const answered: AnsweredQuestion[] = questions.map((q) => ({
    standardCode: q.standardCode,
    clauseNo: q.clauseNo,
    question: q.question,
    expectedEvidence: q.expectedEvidence,
    weight: weightForQuestion(q.question),
    answerText: q.answer?.answerText ?? "",
  }));

  const snap = await loadComplianceSnapshot(params.companyId, session.productId);
  const deterministic = evaluateAudit(answered, snap);
  const { findings, summary } = await augmentAudit(deterministic, answered, snap, session.standard, session.assessmentType);

  await prisma.$transaction([
    prisma.auditSimFinding.deleteMany({ where: { sessionId: params.sessionId } }),
    prisma.auditSimFinding.createMany({
      data: findings.map((f) => ({
        sessionId: params.sessionId,
        companyId: params.companyId,
        standardCode: f.standardCode,
        clauseNo: f.clauseNo,
        severity: f.severity,
        description: f.description,
        evidence: f.evidence,
        rootCause: f.rootCause,
        correctiveAction: f.correctiveAction,
        dueDateSuggestion: f.dueDateSuggestion ? new Date(f.dueDateSuggestion) : null,
        priority: f.priority,
      })),
    }),
    prisma.auditSession.update({
      where: { id: params.sessionId },
      data: { status: "COMPLETED", score: summary.score, summaryJson: summary as object, completedAt: new Date() },
    }),
  ]);

  const ai = aiProviderInfo();
  await writeAuditLog({
    action: "audit.complete", userId: params.userId, companyId: params.companyId,
    entity: "AuditSession", entityId: params.sessionId,
    metadata: { score: summary.score, major: summary.major, minor: summary.minor, findings: findings.length, provider: ai.provider, model: ai.model }, ip: params.ip,
  });

  return { score: summary.score, summary, findingsCount: findings.length };
}

export async function archiveAuditSession(params: { companyId: string; userId: string; sessionId: string; ip?: string | null }) {
  const session = await loadSessionOr404(params.companyId, params.sessionId);
  await prisma.auditSession.update({ where: { id: session.id }, data: { status: "ARCHIVED" as AuditSessionStatus } });
  await writeAuditLog({
    action: "audit.archive", userId: params.userId, companyId: params.companyId,
    entity: "AuditSession", entityId: session.id, ip: params.ip,
  });
}

export async function listAuditSessions(companyId: string) {
  const rows = await prisma.auditSession.findMany({
    where: { companyId }, orderBy: { createdAt: "desc" }, take: 100,
    include: {
      _count: { select: { questions: true, answers: true, findings: true } },
      product: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    standard: r.standard,
    assessmentType: r.assessmentType,
    status: r.status,
    score: r.score,
    productName: r.product?.name ?? null,
    questionCount: r._count.questions,
    answerCount: r._count.answers,
    findingCount: r._count.findings,
    createdAt: r.createdAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
  }));
}

export async function getAuditSessionDetail(companyId: string, id: string) {
  const session = await prisma.auditSession.findFirst({
    where: { id },
    include: {
      product: { select: { id: true, name: true } },
      questions: { orderBy: { order: "asc" }, include: { answer: true } },
      findings: { orderBy: { priority: "desc" } },
    },
  });
  if (!session || session.companyId !== companyId) throw new NotFoundError();

  return {
    id: session.id,
    standard: session.standard,
    assessmentType: session.assessmentType,
    status: session.status,
    score: session.score,
    productId: session.productId,
    productName: session.product?.name ?? null,
    summary: session.summaryJson as object | null,
    createdAt: session.createdAt.toISOString(),
    completedAt: session.completedAt?.toISOString() ?? null,
    questions: session.questions.map((q) => ({
      id: q.id, order: q.order, standardCode: q.standardCode, clauseNo: q.clauseNo,
      question: q.question, expectedEvidence: q.expectedEvidence,
      answer: q.answer?.answerText ?? "",
    })),
    findings: session.findings.map((f) => ({
      id: f.id, standardCode: f.standardCode, clauseNo: f.clauseNo, severity: f.severity,
      description: f.description, evidence: f.evidence, rootCause: f.rootCause,
      correctiveAction: f.correctiveAction,
      dueDateSuggestion: f.dueDateSuggestion?.toISOString() ?? null, priority: f.priority,
    })),
  };
}
