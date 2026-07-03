import "server-only";
import type { CompanyRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getRawSession } from "./session";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "./errors";
import { isEmailVerificationRequired } from "@/lib/security/policy";

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  emailVerifiedAt: Date | null;
}

export interface AuthContext {
  user: CurrentUser;
  token: string;
  companyId: string | null;
  role: CompanyRole | null;
}

export interface CompanyContext {
  user: CurrentUser;
  token: string;
  companyId: string;
  role: CompanyRole;
}

const ROLE_RANK: Record<CompanyRole, number> = {
  VIEWER: 0,
  CONSULTANT: 1,
  REGULATORY_AFFAIRS: 2,
  QUALITY_MANAGER: 3,
  OWNER: 4,
};

/** Resolve the current user + active company context, or null if not authenticated. */
export async function getCurrentUser(): Promise<AuthContext | null> {
  const raw = await getRawSession();
  if (!raw) return null;

  const user = await prisma.user.findFirst({
    where: { id: raw.userId, deletedAt: null },
    select: { id: true, email: true, name: true, avatarUrl: true, emailVerifiedAt: true },
  });
  if (!user) return null;

  let companyId: string | null = null;
  let role: CompanyRole | null = null;

  if (raw.companyId) {
    const membership = await prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId: raw.companyId, userId: user.id } },
      select: { role: true },
    });
    if (membership) {
      companyId = raw.companyId;
      role = membership.role;
    }
  }

  return { user, token: raw.token, companyId, role };
}

/** Require an authenticated user (401 otherwise). Company may still be null. */
export async function requireUser(): Promise<AuthContext> {
  const ctx = await getCurrentUser();
  if (!ctx) throw new UnauthorizedError();
  return ctx;
}

/** Require an authenticated user WITH an active company membership (401/403). */
export async function requireCompany(): Promise<CompanyContext> {
  const ctx = await requireUser();
  if (isEmailVerificationRequired() && !ctx.user.emailVerifiedAt) {
    throw new ForbiddenError("Please verify your email before using the app.");
  }
  if (!ctx.companyId || !ctx.role) {
    throw new ForbiddenError("No active company. Complete onboarding first.");
  }
  return { user: ctx.user, token: ctx.token, companyId: ctx.companyId, role: ctx.role };
}

/** Require a minimum role within the active company (403 otherwise). */
export async function requireRole(min: CompanyRole): Promise<CompanyContext> {
  const ctx = await requireCompany();
  if (ROLE_RANK[ctx.role] < ROLE_RANK[min]) {
    throw new ForbiddenError(`Requires role ${min} or higher`);
  }
  return ctx;
}

export function hasRole(role: CompanyRole, min: CompanyRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/**
 * Assert that an entity belongs to the active company.
 * Throws NotFound (NOT Forbidden) to avoid leaking the existence of other companies' data.
 */
export function assertCompanyAccess(
  entityCompanyId: string | null | undefined,
  companyId: string,
): void {
  if (!entityCompanyId || entityCompanyId !== companyId) {
    throw new NotFoundError();
  }
}
