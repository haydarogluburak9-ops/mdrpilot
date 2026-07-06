import "server-only";

import { prisma } from "@/lib/db";
import { BadRequestError, ForbiddenError } from "@/lib/auth/errors";
import { verifyPassword } from "@/lib/auth/password";
import {
  buildTotpSetupPayload,
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  verifyTotpCode,
} from "@/lib/auth/totp";

export async function getTwoFactorStatus(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { twoFactorEnabledAt: true, twoFactorPendingSecret: true },
  });
  if (!user) throw new BadRequestError("Kullanıcı bulunamadı.");
  return {
    enabled: Boolean(user.twoFactorEnabledAt),
    hasPendingSetup: Boolean(user.twoFactorPendingSecret),
  };
}

export async function startTwoFactorSetup(userId: string, email: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, twoFactorEnabledAt: true },
  });
  if (!user) throw new BadRequestError("Kullanıcı bulunamadı.");
  if (user.twoFactorEnabledAt) throw new BadRequestError("İki adımlı doğrulama zaten etkin.");

  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorPendingSecret: encryptTotpSecret(secret) },
  });

  return buildTotpSetupPayload(email, secret);
}

export async function confirmTwoFactorSetup(userId: string, code: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, twoFactorPendingSecret: true, twoFactorEnabledAt: true },
  });
  if (!user) throw new BadRequestError("Kullanıcı bulunamadı.");
  if (user.twoFactorEnabledAt) throw new BadRequestError("İki adımlı doğrulama zaten etkin.");
  if (!user.twoFactorPendingSecret) {
    throw new BadRequestError("Kurulum başlatılmadı. Önce QR kodunu oluşturun.");
  }

  const secret = decryptTotpSecret(user.twoFactorPendingSecret);
  if (!verifyTotpCode(secret, code)) {
    throw new ForbiddenError("Doğrulama kodu geçersiz.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorSecret: user.twoFactorPendingSecret,
      twoFactorPendingSecret: null,
      twoFactorEnabledAt: new Date(),
    },
  });
}

export async function cancelTwoFactorSetup(userId: string) {
  await prisma.user.updateMany({
    where: { id: userId, twoFactorEnabledAt: null },
    data: { twoFactorPendingSecret: null },
  });
}

export async function disableTwoFactor(params: { userId: string; password: string; code: string }) {
  const user = await prisma.user.findFirst({
    where: { id: params.userId, deletedAt: null },
    select: {
      id: true,
      passwordHash: true,
      twoFactorSecret: true,
      twoFactorEnabledAt: true,
    },
  });
  if (!user) throw new BadRequestError("Kullanıcı bulunamadı.");
  if (!user.twoFactorEnabledAt || !user.twoFactorSecret) {
    throw new BadRequestError("İki adımlı doğrulama etkin değil.");
  }

  const passwordOk = await verifyPassword(params.password, user.passwordHash);
  if (!passwordOk) throw new ForbiddenError("Parola hatalı.");

  const secret = decryptTotpSecret(user.twoFactorSecret);
  if (!verifyTotpCode(secret, params.code)) {
    throw new ForbiddenError("Doğrulama kodu geçersiz.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorSecret: null,
      twoFactorPendingSecret: null,
      twoFactorEnabledAt: null,
    },
  });
}

export async function verifyUserTotpCode(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { twoFactorSecret: true, twoFactorEnabledAt: true },
  });
  if (!user?.twoFactorEnabledAt || !user.twoFactorSecret) return false;
  const secret = decryptTotpSecret(user.twoFactorSecret);
  return verifyTotpCode(secret, code);
}
