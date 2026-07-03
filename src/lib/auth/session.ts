import "server-only";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_IDLE_MS, SESSION_MAX_AGE_MS } from "@/lib/auth/session-policy";
import { SESSION_COOKIE_DEFAULT, SESSION_COOKIE_LEGACY } from "@/lib/brand";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? SESSION_COOKIE_DEFAULT;

const COOKIE_SECURE = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === "true"
  : process.env.NODE_ENV === "production";

export interface RawSession {
  token: string;
  userId: string;
  companyId: string | null;
}

function newToken(): string {
  return randomBytes(32).toString("hex");
}

function absoluteSessionMax(createdAt: Date): number {
  return createdAt.getTime() + SESSION_MAX_AGE_MS;
}

function nextSessionExpiry(from: Date, createdAt: Date): Date {
  const capped = Math.min(from.getTime() + SESSION_IDLE_MS, absoluteSessionMax(createdAt));
  return new Date(capped);
}

function setSessionCookie(token: string, expiresAt: Date): void {
  const maxAge = Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: "/",
    maxAge,
  });
}

/** Create a DB session and set the httpOnly cookie. */
export async function createSession(userId: string, companyId: string | null): Promise<string> {
  const token = newToken();
  const now = new Date();
  const expiresAt = nextSessionExpiry(now, now);
  await prisma.session.create({ data: { token, userId, companyId, expiresAt } });
  setSessionCookie(token, expiresAt);
  return token;
}

/** Read + validate the current session from the cookie. Returns null if absent/expired. */
export async function getRawSession(): Promise<RawSession | null> {
  const token =
    cookies().get(COOKIE_NAME)?.value ?? cookies().get(SESSION_COOKIE_LEGACY)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({ where: { token } });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() < now || absoluteSessionMax(session.createdAt) < now) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return null;
  }

  return { token, userId: session.userId, companyId: session.companyId };
}

/** Extend session expiry after confirmed user activity (client idle guard). */
export async function touchSession(token: string): Promise<boolean> {
  const session = await prisma.session.findUnique({ where: { token } });
  if (!session) return false;

  const now = Date.now();
  if (session.expiresAt.getTime() < now || absoluteSessionMax(session.createdAt) < now) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return false;
  }

  const refreshed = nextSessionExpiry(new Date(now), session.createdAt);
  if (refreshed.getTime() > session.expiresAt.getTime()) {
    await prisma.session.update({ where: { token }, data: { expiresAt: refreshed } });
    setSessionCookie(token, refreshed);
  }

  return true;
}

/** Attach a company to the active session (used after onboarding / company switch). */
export async function setSessionCompany(token: string, companyId: string): Promise<void> {
  await prisma.session.update({ where: { token }, data: { companyId } });
}

/** Destroy the current session and clear the cookie. */
export async function destroySession(): Promise<void> {
  const token =
    cookies().get(COOKIE_NAME)?.value ?? cookies().get(SESSION_COOKIE_LEGACY)?.value;
  if (token) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
  }
  cookies().delete(COOKIE_NAME);
  cookies().delete(SESSION_COOKIE_LEGACY);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
