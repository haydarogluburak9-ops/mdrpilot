import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { consumeAuthToken } from "@/lib/auth/tokens";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const row = await consumeAuthToken(token, "EMAIL_VERIFY");
  if (!row) {
    return NextResponse.json({ error: "Invalid or expired verification link." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: row.userId },
    data: { emailVerifiedAt: new Date() },
  });

  await writeAuditLog({
    action: "auth.email_verified",
    userId: row.userId,
    entity: "User",
    entityId: row.userId,
    ip: ipFromRequest(req),
  });

  return NextResponse.json({ ok: true });
}
