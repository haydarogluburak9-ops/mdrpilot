import "server-only";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import type { AuthTokenType } from "@prisma/client";

const TOKEN_BYTES = 32;

function newToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

export async function createAuthToken(userId: string, type: AuthTokenType, ttlHours: number) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  await prisma.authToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.authToken.create({
    data: { userId, type, token, expiresAt },
  });

  return token;
}

export async function createAuthTokenMinutes(userId: string, type: AuthTokenType, ttlMinutes: number) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await prisma.authToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.authToken.create({
    data: { userId, type, token, expiresAt },
  });

  return token;
}

export async function consumeAuthToken(token: string, type: AuthTokenType) {
  const row = await prisma.authToken.findUnique({ where: { token } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) {
    return null;
  }

  await prisma.authToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });

  return row;
}

export async function createInviteToken() {
  return newToken();
}
