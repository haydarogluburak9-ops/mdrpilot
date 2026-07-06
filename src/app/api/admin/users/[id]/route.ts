import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { statusForError } from "@/lib/auth/errors";
import { adminAssignUserPlan, adminRemoveUser } from "@/lib/admin/users";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";

export const runtime = "nodejs";

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("assign_plan"),
    planKey: z.enum(["starter", "basic", "plus", "pro", "enterprise"]),
  }),
  z.object({ action: z.literal("remove") }),
]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requirePlatformAdmin();
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    if (parsed.data.action === "assign_plan") {
      await adminAssignUserPlan(params.id, parsed.data.planKey);
      await writeAuditLog({
        action: "admin.user_assign_plan",
        userId: admin.user.id,
        entity: "User",
        entityId: params.id,
        ip: ipFromRequest(req),
        metadata: { planKey: parsed.data.planKey },
      });
      return NextResponse.json({ ok: true, planKey: parsed.data.planKey });
    }

    await adminRemoveUser({ userId: params.id, actorEmail: admin.user.email });
    await writeAuditLog({
      action: "admin.user_remove",
      userId: admin.user.id,
      entity: "User",
      entityId: params.id,
      ip: ipFromRequest(req),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
