import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import {
  createTeamInvite,
  listPendingInvites,
  listTeamMembers,
  revokeInvite,
} from "@/lib/team/invite-service";
import { getCompanyPlanUsage } from "@/lib/billing/plan-limits";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";

export const runtime = "nodejs";

const inviteSchema = z.object({
  email: z.string().email().max(160),
  role: z.enum(["QUALITY_MANAGER", "REGULATORY_AFFAIRS", "CONSULTANT", "VIEWER"]),
});

export async function GET() {
  try {
    const ctx = await requireRole("QUALITY_MANAGER");
    const [members, invites, usage] = await Promise.all([
      listTeamMembers(ctx.companyId),
      listPendingInvites(ctx.companyId),
      getCompanyPlanUsage(ctx.companyId),
    ]);
    return NextResponse.json({
      members: members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        emailVerified: !!m.user.emailVerifiedAt,
      })),
      invites: invites.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        expiresAt: i.expiresAt.toISOString(),
      })),
      usage,
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireRole("OWNER");
    const parsed = inviteSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { name: true },
    });

    const invite = await createTeamInvite({
      companyId: ctx.companyId,
      invitedById: ctx.user.id,
      inviterName: ctx.user.name ?? ctx.user.email,
      companyName: company?.name ?? "your company",
      email: parsed.data.email,
      role: parsed.data.role,
    });

    await writeAuditLog({
      action: "team.invite",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "CompanyInvite",
      entityId: invite.id,
      metadata: { email: invite.email, role: invite.role },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ ok: true, id: invite.id });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireRole("OWNER");
    const inviteId = new URL(req.url).searchParams.get("id");
    if (!inviteId) {
      return NextResponse.json({ error: "Missing invite id" }, { status: 400 });
    }
    await revokeInvite(ctx.companyId, inviteId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
