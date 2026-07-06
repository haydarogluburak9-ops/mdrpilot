import { NextResponse } from "next/server";
import { z } from "zod";
import { extendDemoAccess, revokeDemoAccess } from "@/lib/demo/access";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { statusForError } from "@/lib/auth/errors";

export const runtime = "nodejs";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("extend"), days: z.number().int().min(1).max(365) }),
  z.object({ action: z.literal("revoke") }),
]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requirePlatformAdmin();
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    if (parsed.data.action === "extend") {
      const grant = await extendDemoAccess({ grantId: params.id, days: parsed.data.days });
      return NextResponse.json({ ok: true, expiresAt: grant.expiresAt });
    }

    await revokeDemoAccess(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
