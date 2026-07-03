import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { mergeProfileJson, type QmsOnboardingPath } from "@/lib/qms/onboarding-path";

export const runtime = "nodejs";

const schema = z.object({
  qmsPath: z.enum(["GREENFIELD", "IMPORTED"]),
});

/** PUT /api/settings/qms-path — set greenfield vs imported KYS onboarding path. */
export async function PUT(req: Request) {
  try {
    const ctx = await requireRole("QUALITY_MANAGER");
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { profileJson: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const profileJson = mergeProfileJson(company.profileJson, {
      qmsPath: parsed.data.qmsPath as QmsOnboardingPath,
    });

    await prisma.company.update({
      where: { id: ctx.companyId },
      data: { profileJson: profileJson as object },
    });

    await writeAuditLog({
      action: "company.qms_path",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "Company",
      entityId: ctx.companyId,
      metadata: { qmsPath: parsed.data.qmsPath },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ ok: true, qmsPath: parsed.data.qmsPath });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
