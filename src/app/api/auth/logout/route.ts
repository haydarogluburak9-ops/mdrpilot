import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { destroySession } from "@/lib/auth/session";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ctx = await getCurrentUser();
  await destroySession();
  if (ctx) {
    await writeAuditLog({
      action: "auth.logout",
      userId: ctx.user.id,
      companyId: ctx.companyId,
      ip: ipFromRequest(req),
    });
  }
  return NextResponse.json({ ok: true });
}
