import "server-only";

import { prisma } from "@/lib/db";
import { BadRequestError, ForbiddenError } from "@/lib/auth/errors";
import { verifyPassword, hashPassword } from "@/lib/auth/password";

export async function changeUserPassword(params: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}) {
  if (params.newPassword.length < 8) {
    throw new BadRequestError("Yeni parola en az 8 karakter olmalı.");
  }
  if (params.currentPassword === params.newPassword) {
    throw new BadRequestError("Yeni parola mevcut paroladan farklı olmalı.");
  }

  const user = await prisma.user.findFirst({
    where: { id: params.userId, deletedAt: null },
    select: { id: true, passwordHash: true },
  });
  if (!user) throw new BadRequestError("Kullanıcı bulunamadı.");

  const ok = await verifyPassword(params.currentPassword, user.passwordHash);
  if (!ok) throw new ForbiddenError("Mevcut parola hatalı.");

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(params.newPassword) },
  });
}

export async function deleteUserAccount(params: { userId: string; password: string }) {
  const user = await prisma.user.findFirst({
    where: { id: params.userId, deletedAt: null },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!user) throw new BadRequestError("Kullanıcı bulunamadı.");

  const ok = await verifyPassword(params.password, user.passwordHash);
  if (!ok) throw new ForbiddenError("Parola hatalı.");

  const ownerMemberships = await prisma.companyMember.findMany({
    where: { userId: user.id, role: "OWNER", company: { deletedAt: null } },
    include: { company: { select: { id: true, _count: { select: { members: true } } } } },
  });

  for (const m of ownerMemberships) {
    if (m.company._count.members > 1) {
      throw new BadRequestError(
        "Sahip olduğunuz bir firmada başka kullanıcılar var. Önce sahipliği devredin veya firma verilerini silin.",
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
    },
  });
}

export async function deleteCompanyData(params: {
  userId: string;
  companyId: string;
  password: string;
}) {
  const membership = await prisma.companyMember.findUnique({
    where: { companyId_userId: { companyId: params.companyId, userId: params.userId } },
    include: {
      company: { select: { id: true, deletedAt: true } },
      user: { select: { passwordHash: true, deletedAt: true } },
    },
  });

  if (!membership || membership.role !== "OWNER" || membership.company.deletedAt) {
    throw new ForbiddenError("Yalnızca firma sahibi firma verilerini silebilir.");
  }
  if (membership.user.deletedAt) throw new BadRequestError("Kullanıcı bulunamadı.");

  const ok = await verifyPassword(params.password, membership.user.passwordHash);
  if (!ok) throw new ForbiddenError("Parola hatalı.");

  const now = new Date();
  await prisma.company.update({
    where: { id: params.companyId },
    data: { deletedAt: now },
  });
  await prisma.session.deleteMany({ where: { companyId: params.companyId } });
}
