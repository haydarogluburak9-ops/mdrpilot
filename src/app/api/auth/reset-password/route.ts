import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { consumeAuthToken } from "@/lib/auth/tokens";
import { rateLimit, clientKey } from "@/lib/security/rate-limit";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(16).max(200),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "reset-password")).ok) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const row = await consumeAuthToken(parsed.data.token, "PASSWORD_RESET");
  if (!row) {
    return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: row.userId },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  await writeAuditLog({
    action: "auth.password_reset",
    userId: row.userId,
    entity: "User",
    entityId: row.userId,
    ip: ipFromRequest(req),
  });

  return NextResponse.json({ ok: true });
}
