import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import {
  cancelTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
  getTwoFactorStatus,
  startTwoFactorSetup,
} from "@/lib/account/two-factor";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";

export const runtime = "nodejs";

const confirmSchema = z.object({
  code: z.string().min(6).max(12),
});

const disableSchema = z.object({
  password: z.string().min(1).max(200),
  code: z.string().min(6).max(12),
});

export async function GET() {
  try {
    const ctx = await requireUser();
    const status = await getTwoFactorStatus(ctx.user.id);
    return NextResponse.json(status);
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireUser();
    const body = await req.json().catch(() => null);
    const action = typeof body?.action === "string" ? body.action : "setup";

    if (action === "setup") {
      const payload = await startTwoFactorSetup(ctx.user.id, ctx.user.email);
      return NextResponse.json({ ok: true, ...payload });
    }

    if (action === "confirm") {
      const parsed = confirmSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
      }
      await confirmTwoFactorSetup(ctx.user.id, parsed.data.code);
      await writeAuditLog({
        action: "auth.2fa_enabled",
        userId: ctx.user.id,
        companyId: ctx.companyId,
        entity: "User",
        entityId: ctx.user.id,
        ip: ipFromRequest(req),
      });
      return NextResponse.json({ ok: true, enabled: true });
    }

    if (action === "cancel") {
      await cancelTwoFactorSetup(ctx.user.id);
      return NextResponse.json({ ok: true });
    }

    if (action === "disable") {
      const parsed = disableSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
      }
      await disableTwoFactor({
        userId: ctx.user.id,
        password: parsed.data.password,
        code: parsed.data.code,
      });
      await writeAuditLog({
        action: "auth.2fa_disabled",
        userId: ctx.user.id,
        companyId: ctx.companyId,
        entity: "User",
        entityId: ctx.user.id,
        ip: ipFromRequest(req),
      });
      return NextResponse.json({ ok: true, enabled: false });
    }

    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
