import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { statusForError } from "@/lib/auth/errors";
import { adminCreateUser, listAdminUsers } from "@/lib/admin/users";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";

export const runtime = "nodejs";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(200),
  planKey: z.enum(["starter", "basic", "plus", "pro"]).optional(),
});

export async function GET() {
  try {
    await requirePlatformAdmin();
    const data = await listAdminUsers();
    return NextResponse.json(data);
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requirePlatformAdmin();
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    const user = await adminCreateUser(parsed.data);

    await writeAuditLog({
      action: "admin.user_create",
      userId: admin.user.id,
      entity: "User",
      entityId: user.id,
      ip: ipFromRequest(req),
      metadata: { email: user.email, planKey: parsed.data.planKey ?? null },
    });

    return NextResponse.json({
      ok: true,
      userId: user.id,
      email: user.email,
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
