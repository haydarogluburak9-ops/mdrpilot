import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { changeUserPassword } from "@/lib/account/privacy";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  try {
    const ctx = await requireUser();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    await changeUserPassword({
      userId: ctx.user.id,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });

    await writeAuditLog({
      action: "auth.password_change",
      userId: ctx.user.id,
      companyId: ctx.companyId,
      entity: "User",
      entityId: ctx.user.id,
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
