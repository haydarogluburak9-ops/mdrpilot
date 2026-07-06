import { NextResponse } from "next/server";
import { z } from "zod";
import { listAdminDemoGrants } from "@/lib/admin/demo";
import { grantDemoAccess } from "@/lib/demo/access";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { statusForError } from "@/lib/auth/errors";

export const runtime = "nodejs";

const grantSchema = z.object({
  email: z.string().email(),
  days: z.number().int().min(1).max(365).default(14),
  planKey: z.enum(["plus", "pro", "basic"]).optional(),
  companyId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function GET() {
  try {
    await requirePlatformAdmin();
    const data = await listAdminDemoGrants();
    return NextResponse.json(data);
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requirePlatformAdmin();
    const parsed = grantSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    const result = await grantDemoAccess({
      ...parsed.data,
      createdBy: admin.user.email,
    });

    return NextResponse.json({
      ok: true,
      grantId: result.grant.id,
      expiresAt: result.grant.expiresAt,
      userEmail: result.user.email,
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
