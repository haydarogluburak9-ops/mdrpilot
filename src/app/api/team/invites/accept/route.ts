import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { acceptTeamInvite } from "@/lib/team/invite-service";
import { setSessionCompany } from "@/lib/auth/session";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({ token: z.string().min(16).max(200) });

export async function POST(req: Request) {
  try {
    const ctx = await requireUser();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const companyId = await acceptTeamInvite(parsed.data.token, ctx.user.id, ctx.user.email);
    await setSessionCompany(ctx.token, companyId);

    await writeAuditLog({
      action: "team.invite_accepted",
      companyId,
      userId: ctx.user.id,
      entity: "Company",
      entityId: companyId,
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ ok: true, companyId });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
