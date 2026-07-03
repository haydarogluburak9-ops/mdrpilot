import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { removeTeamMember } from "@/lib/team/invite-service";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";

export const runtime = "nodejs";

export async function DELETE(req: Request, { params }: { params: { userId: string } }) {
  try {
    const ctx = await requireRole("OWNER");
    await removeTeamMember(ctx.companyId, params.userId, ctx.user.id);

    await writeAuditLog({
      action: "team.member_removed",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "User",
      entityId: params.userId,
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
