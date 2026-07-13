import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/security/rate-limit";

import { createAuthToken } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/email/auth-emails";

import { isEmailVerificationRequired } from "@/lib/security/policy";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(160),
  password: z.string().min(8).max(200),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms and privacy policy." }) }),
});

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "register")).ok) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "auth.register.emailExists", code: "EMAIL_EXISTS" }, { status: 409 });
  }

  const now = new Date();
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name.trim(),
      passwordHash: await hashPassword(parsed.data.password),
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
    },
  });

  await createSession(user.id, null);

  const verifyToken = await createAuthToken(user.id, "EMAIL_VERIFY", 48);
  await sendVerificationEmail(email, verifyToken);
  await writeAuditLog({
    action: "auth.register",
    userId: user.id,
    entity: "User",
    entityId: user.id,
    ip: ipFromRequest(req),
  });

  return NextResponse.json({
    ok: true,
    hasCompany: false,
    emailVerified: false,
    requiresVerification: isEmailVerificationRequired(),
  });
}
