import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { deleteCompanyData } from "@/lib/account/privacy";
import { destroySession } from "@/lib/auth/session";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  password: z.string().min(1).max(200),
  confirm: z.literal("FIRMA VERILERINI SIL"),
});

export async function POST(req: Request) {
  try {
    const ctx = await requireRole("OWNER");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Onay metnini FIRMA VERILERINI SIL olarak yazın." },
        { status: 400 },
      );
    }

    await deleteCompanyData({
      userId: ctx.user.id,
      companyId: ctx.companyId,
      password: parsed.data.password,
    });

    await writeAuditLog({
      action: "company.delete",
      userId: ctx.user.id,
      companyId: ctx.companyId,
      entity: "Company",
      entityId: ctx.companyId,
      ip: ipFromRequest(req),
    });

    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
