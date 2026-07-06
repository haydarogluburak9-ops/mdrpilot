import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { consumeAuthToken } from "@/lib/auth/tokens";
import { verifyUserTotpCode } from "@/lib/account/two-factor";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/security/rate-limit";
import { isEmailVerificationRequired } from "@/lib/security/policy";

export const runtime = "nodejs";

const schema = z.object({
  challengeToken: z.string().min(16).max(200),
  code: z.string().min(6).max(12),
});

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "login-2fa")).ok) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const row = await consumeAuthToken(parsed.data.challengeToken, "TWO_FACTOR_LOGIN");
  if (!row) {
    return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: { id: row.userId, deletedAt: null },
    include: { memberships: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (!user?.twoFactorEnabledAt) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const ok = await verifyUserTotpCode(user.id, parsed.data.code);
  if (!ok) {
    await writeAuditLog({
      action: "auth.login.2fa_failed",
      userId: user.id,
      entity: "User",
      entityId: user.id,
      ip: ipFromRequest(req),
    });
    return NextResponse.json({ error: "Invalid verification code." }, { status: 401 });
  }

  const companyId = user.memberships[0]?.companyId ?? null;
  await createSession(user.id, companyId);
  await writeAuditLog({
    action: "auth.login",
    userId: user.id,
    companyId,
    entity: "User",
    entityId: user.id,
    ip: ipFromRequest(req),
    metadata: { twoFactor: true },
  });

  return NextResponse.json({
    ok: true,
    hasCompany: Boolean(companyId),
    emailVerified: Boolean(user.emailVerifiedAt),
    requiresVerification: isEmailVerificationRequired() && !user.emailVerifiedAt,
  });
}
