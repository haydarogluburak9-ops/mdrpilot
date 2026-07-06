import "server-only";

import type { DemoAccess } from "@prisma/client";
import { prisma } from "@/lib/db";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/lib/auth/errors";
import { normalizePlanKey } from "@/lib/billing/plans";

export type DemoAccessStatus = "active" | "expired" | "revoked";

export function demoAccessStatus(grant: Pick<DemoAccess, "expiresAt" | "revokedAt">, now = new Date()): DemoAccessStatus {
  if (grant.revokedAt) return "revoked";
  if (grant.expiresAt <= now) return "expired";
  return "active";
}

export function isDemoAccessActive(grant: Pick<DemoAccess, "expiresAt" | "revokedAt">, now = new Date()): boolean {
  return demoAccessStatus(grant, now) === "active";
}

async function ensureSubscriptionPlan(planKey: string) {
  const key = normalizePlanKey(planKey);
  const catalog: Record<string, { name: string; priceMonthly: number; maxProducts: number; maxSeats: number; monthlyAiTokens: number }> = {
    starter: { name: "Starter", priceMonthly: 0, maxProducts: 1, maxSeats: 1, monthlyAiTokens: 0 },
    basic: { name: "Basic", priceMonthly: 250, maxProducts: 1, maxSeats: 1, monthlyAiTokens: 500_000 },
    plus: { name: "Plus", priceMonthly: 450, maxProducts: 3, maxSeats: 3, monthlyAiTokens: 1_500_000 },
    pro: { name: "Pro", priceMonthly: 750, maxProducts: 5, maxSeats: 5, monthlyAiTokens: 2_500_000 },
    enterprise: { name: "Enterprise", priceMonthly: 0, maxProducts: 9999, maxSeats: 9999, monthlyAiTokens: 50_000_000 },
  };
  const row = catalog[key] ?? catalog.plus;
  return prisma.subscriptionPlan.upsert({
    where: { key },
    update: row,
    create: { key, ...row },
  });
}

async function applyTrialPlan(companyId: string, planKey: string) {
  const plan = await ensureSubscriptionPlan(planKey);
  await prisma.company.update({
    where: { id: companyId },
    data: { subscriptionId: plan.id },
  });
}

async function restorePreviousPlan(grant: Pick<DemoAccess, "companyId" | "previousSubscriptionId">) {
  if (grant.previousSubscriptionId) {
    await prisma.company.update({
      where: { id: grant.companyId },
      data: { subscriptionId: grant.previousSubscriptionId },
    });
    return;
  }
  const starter = await ensureSubscriptionPlan("starter");
  await prisma.company.update({
    where: { id: grant.companyId },
    data: { subscriptionId: starter.id },
  });
}

export async function getActiveDemoGrantForCompany(companyId: string) {
  const grant = await prisma.demoAccess.findFirst({
    where: { companyId, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!grant || !isDemoAccessActive(grant)) return null;
  return grant;
}

/** Block company-scoped APIs when a demo grant exists but has expired. */
export async function assertCompanyDemoAccess(companyId: string): Promise<void> {
  const grant = await prisma.demoAccess.findFirst({
    where: { companyId, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!grant) return;
  if (isDemoAccessActive(grant)) return;
  throw new ForbiddenError(
    "Demo süreniz doldu. Devam etmek için bir plan satın alın veya destek@mdrpilot.com ile iletişime geçin.",
  );
}

async function resolveUserCompany(userId: string, companyId?: string) {
  if (companyId) {
    const membership = await prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
      include: { company: { select: { id: true, subscriptionId: true, deletedAt: true } } },
    });
    if (!membership || membership.company.deletedAt) {
      throw new BadRequestError("Kullanıcı bu firmaya bağlı değil.");
    }
    return { companyId: membership.company.id, previousSubscriptionId: membership.company.subscriptionId };
  }

  const memberships = await prisma.companyMember.findMany({
    where: { userId, company: { deletedAt: null } },
    include: { company: { select: { id: true, subscriptionId: true } } },
  });
  const membership = memberships.find((m) => m.role === "OWNER") ?? memberships[0];
  if (!membership) {
    throw new BadRequestError("Kullanıcının firması yok. Önce onboarding tamamlanmalı.");
  }
  return {
    companyId: membership.company.id,
    previousSubscriptionId: membership.company.subscriptionId,
  };
}

export async function grantDemoAccess(params: {
  email: string;
  days: number;
  planKey?: string;
  companyId?: string;
  notes?: string;
  createdBy?: string;
}) {
  const email = params.email.trim().toLowerCase();
  if (!email) throw new BadRequestError("E-posta gerekli.");
  if (!Number.isFinite(params.days) || params.days < 1 || params.days > 365) {
    throw new BadRequestError("Demo süresi 1–365 gün arasında olmalı.");
  }

  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true, email: true, name: true },
  });
  if (!user) throw new NotFoundError("Kullanıcı bulunamadı.");

  const trialPlanKey = normalizePlanKey(params.planKey ?? "plus");
  const { companyId, previousSubscriptionId } = await resolveUserCompany(user.id, params.companyId);
  const expiresAt = new Date(Date.now() + params.days * 86_400_000);

  const existing = await prisma.demoAccess.findFirst({
    where: { companyId, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });

  let grant;
  if (existing && isDemoAccessActive(existing)) {
    grant = await prisma.demoAccess.update({
      where: { id: existing.id },
      data: {
        expiresAt,
        trialPlanKey,
        notes: params.notes?.trim() || existing.notes,
        createdBy: params.createdBy ?? existing.createdBy,
      },
    });
  } else {
    if (existing && demoAccessStatus(existing) === "expired") {
      await restorePreviousPlan(existing);
    }
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { subscriptionId: true },
    });
    grant = await prisma.demoAccess.create({
      data: {
        userId: user.id,
        companyId,
        expiresAt,
        trialPlanKey,
        previousSubscriptionId: company?.subscriptionId ?? previousSubscriptionId,
        notes: params.notes?.trim() || null,
        createdBy: params.createdBy ?? null,
      },
    });
  }

  await applyTrialPlan(companyId, trialPlanKey);

  return { grant, user };
}

export async function extendDemoAccess(params: { grantId: string; days: number }) {
  if (!Number.isFinite(params.days) || params.days < 1 || params.days > 365) {
    throw new BadRequestError("Uzatma süresi 1–365 gün arasında olmalı.");
  }

  const grant = await prisma.demoAccess.findUnique({ where: { id: params.grantId } });
  if (!grant) throw new NotFoundError("Demo kaydı bulunamadı.");
  if (grant.revokedAt) throw new BadRequestError("İptal edilmiş demo süresi uzatılamaz.");

  const base = grant.expiresAt > new Date() ? grant.expiresAt : new Date();
  const expiresAt = new Date(base.getTime() + params.days * 86_400_000);

  const updated = await prisma.demoAccess.update({
    where: { id: grant.id },
    data: { expiresAt },
  });

  await applyTrialPlan(grant.companyId, grant.trialPlanKey);
  return updated;
}

export async function revokeDemoAccess(grantId: string) {
  const grant = await prisma.demoAccess.findUnique({ where: { id: grantId } });
  if (!grant) throw new NotFoundError("Demo kaydı bulunamadı.");
  if (grant.revokedAt) return grant;

  const updated = await prisma.demoAccess.update({
    where: { id: grantId },
    data: { revokedAt: new Date() },
  });

  await restorePreviousPlan(grant);
  return updated;
}
