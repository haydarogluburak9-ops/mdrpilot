import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/security/rate-limit";
import { isEmailVerificationRequired } from "@/lib/security/policy";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "login")).ok) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    include: { memberships: { orderBy: { createdAt: "asc" }, take: 1 } },
  });

  // Constant-ish response to avoid user enumeration.
  const ok = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !ok) {
    await writeAuditLog({ action: "auth.login.failed", entity: "User", metadata: { email }, ip: ipFromRequest(req) });
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
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
  });

  return NextResponse.json({
    ok: true,
    hasCompany: Boolean(companyId),
    emailVerified: Boolean(user.emailVerifiedAt),
    requiresVerification: isEmailVerificationRequired() && !user.emailVerifiedAt,
  });
}
