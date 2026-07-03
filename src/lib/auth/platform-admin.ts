import "server-only";
import type { AuthContext } from "@/lib/auth/guards";
import { requireUser } from "@/lib/auth/guards";
import { ForbiddenError } from "@/lib/auth/errors";

/** Comma-separated platform owner emails (server-only). */
export function getPlatformAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdmin(email: string): boolean {
  const admins = getPlatformAdminEmails();
  if (admins.length === 0) return false;
  return admins.includes(email.trim().toLowerCase());
}

export async function requirePlatformAdmin(): Promise<AuthContext> {
  const ctx = await requireUser();
  if (!isPlatformAdmin(ctx.user.email)) {
    throw new ForbiddenError("Platform admin access required");
  }
  return ctx;
}
