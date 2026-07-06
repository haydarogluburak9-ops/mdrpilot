import "server-only";

import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/lib/auth/errors";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { setCompanySubscriptionPlan } from "@/lib/billing/subscription-db";
import { getActiveDemoGrantForCompany, revokeDemoAccess } from "@/lib/demo/access";
import type { AdminUsersData } from "@/lib/admin/users-types";

export type { AdminUserRow, AdminUsersData } from "@/lib/admin/users-types";

function primaryMembership<T extends { role: string }>(memberships: T[]): T | undefined {
  return memberships.find((m) => m.role === "OWNER") ?? memberships[0];
}

export async function listAdminUsers(): Promise<AdminUsersData> {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      emailVerifiedAt: true,
      memberships: {
        where: { company: { deletedAt: null } },
        select: {
          role: true,
          company: {
            select: {
              id: true,
              name: true,
              subscription: { select: { key: true, name: true } },
              demoAccessGrants: {
                where: { revokedAt: null },
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { expiresAt: true, revokedAt: true },
              },
            },
          },
        },
      },
    },
  });

  const now = Date.now();
  const rows = users.map((u) => {
    const membership = primaryMembership(u.memberships);
    const company = membership?.company;
    const demoGrant = company?.demoAccessGrants[0];
    const activeDemo = Boolean(
      demoGrant && !demoGrant.revokedAt && demoGrant.expiresAt.getTime() > now,
    );

    return {
      userId: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
      emailVerified: Boolean(u.emailVerifiedAt),
      companyId: company?.id ?? null,
      companyName: company?.name ?? null,
      role: membership?.role ?? null,
      planKey: company?.subscription?.key ?? "starter",
      planName: company?.subscription?.name ?? "Starter",
      activeDemo,
    };
  });

  return {
    users: rows,
    summary: {
      total: rows.length,
      withCompany: rows.filter((r) => r.companyId).length,
      withoutCompany: rows.filter((r) => !r.companyId).length,
    },
  };
}

export async function adminCreateUser(params: {
  email: string;
  name: string;
  password: string;
  planKey?: string;
}) {
  const email = params.email.trim().toLowerCase();
  const name = params.name.trim();
  if (!email) throw new BadRequestError("E-posta gerekli.");
  if (!name) throw new BadRequestError("Ad gerekli.");
  if (params.password.length < 8) {
    throw new BadRequestError("Parola en az 8 karakter olmalı.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && !existing.deletedAt) {
    throw new BadRequestError("Bu e-posta ile kayıtlı kullanıcı zaten var.");
  }

  const now = new Date();
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          email,
          name,
          passwordHash: await hashPassword(params.password),
          emailVerifiedAt: now,
          termsAcceptedAt: now,
          privacyAcceptedAt: now,
        },
      })
    : await prisma.user.create({
        data: {
          email,
          name,
          passwordHash: await hashPassword(params.password),
          emailVerifiedAt: now,
          termsAcceptedAt: now,
          privacyAcceptedAt: now,
        },
      });

  if (params.planKey) {
    const membership = await prisma.companyMember.findFirst({
      where: { userId: user.id, company: { deletedAt: null } },
      select: { companyId: true },
    });
    if (membership) {
      await adminAssignCompanyPlan(membership.companyId, params.planKey);
    }
  }

  return user;
}

export async function adminAssignCompanyPlan(companyId: string, planKey: string) {
  const activeDemo = await getActiveDemoGrantForCompany(companyId);
  if (activeDemo) {
    await revokeDemoAccess(activeDemo.id);
  }
  return setCompanySubscriptionPlan(companyId, planKey);
}

export async function adminAssignUserPlan(userId: string, planKey: string) {
  const memberships = await prisma.companyMember.findMany({
    where: { userId, company: { deletedAt: null } },
    select: { companyId: true, role: true },
  });
  const membership = primaryMembership(memberships);
  if (!membership) {
    throw new BadRequestError("Kullanıcının firması yok. Önce onboarding tamamlanmalı.");
  }
  await adminAssignCompanyPlan(membership.companyId, planKey);
}

export async function adminRemoveUser(params: { userId: string; actorEmail: string }) {
  const user = await prisma.user.findFirst({
    where: { id: params.userId, deletedAt: null },
    select: { id: true, email: true },
  });
  if (!user) throw new NotFoundError("Kullanıcı bulunamadı.");
  if (isPlatformAdmin(user.email)) {
    throw new ForbiddenError("Platform yöneticisi hesabı silinemez.");
  }
  if (user.email === params.actorEmail.trim().toLowerCase()) {
    throw new ForbiddenError("Kendi hesabınızı bu ekrandan silemezsiniz.");
  }

  const ownerMemberships = await prisma.companyMember.findMany({
    where: { userId: user.id, role: "OWNER", company: { deletedAt: null } },
    include: { company: { select: { id: true, _count: { select: { members: true } } } } },
  });

  for (const m of ownerMemberships) {
    if (m.company._count.members > 1) {
      throw new BadRequestError(
        "Kullanıcı tek sahip olduğu bir firmada başka üyeler var. Önce üyeleri çıkarın veya sahipliği devredin.",
      );
    }
  }

  const now = new Date();

  for (const m of ownerMemberships) {
    await prisma.company.update({
      where: { id: m.company.id },
      data: { deletedAt: now },
    });
    await prisma.session.deleteMany({ where: { companyId: m.company.id } });
  }

  await prisma.companyMember.deleteMany({ where: { userId: user.id } });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await prisma.authToken.deleteMany({ where: { userId: user.id } });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      deletedAt: now,
      email: `deleted+${user.id}@mdrpilot.invalid`,
      name: null,
      passwordHash: null,
      avatarUrl: null,
      twoFactorSecret: null,
      twoFactorPendingSecret: null,
      twoFactorEnabledAt: null,
    },
  });
}
