import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { deleteUserAccount } from "@/lib/account/privacy";
import { destroySession } from "@/lib/auth/session";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  password: z.string().min(1).max(200),
  confirm: z.literal("HESABIMI SIL"),
});

export async function POST(req: Request) {
  try {
    const ctx = await requireUser();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Onay metnini HESABIMI SIL olarak yazın." }, { status: 400 });
    }

    await deleteUserAccount({ userId: ctx.user.id, password: parsed.data.password });

    await writeAuditLog({
      action: "account.delete",
      userId: ctx.user.id,
      companyId: ctx.companyId,
      entity: "User",
      entityId: ctx.user.id,
      ip: ipFromRequest(req),
    });

    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
