import "server-only";
import { prisma } from "@/lib/db";
import type { CompanyRole } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "@/lib/auth/errors";
import { assertCanAddSeat } from "@/lib/billing/plan-limits";
import { createInviteToken } from "@/lib/auth/tokens";
import { sendTeamInviteEmail } from "@/lib/email/auth-emails";

const INVITE_TTL_DAYS = 7;

export async function listTeamMembers(companyId: string) {
  return prisma.companyMember.findMany({
    where: { companyId },
    include: { user: { select: { id: true, name: true, email: true, emailVerifiedAt: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function listPendingInvites(companyId: string) {
  return prisma.companyInvite.findMany({
    where: { companyId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTeamInvite(input: {
  companyId: string;
  invitedById: string;
  inviterName: string;
  companyName: string;
  email: string;
  role: CompanyRole;
}) {
  const email = input.email.toLowerCase().trim();
  await assertCanAddSeat(input.companyId);

  const existingMember = await prisma.companyMember.findFirst({
    where: { companyId: input.companyId, user: { email } },
  });
  if (existingMember) {
    throw new ForbiddenError("This user is already a team member.");
  }

  await prisma.companyInvite.updateMany({
    where: { companyId: input.companyId, email, acceptedAt: null },
    data: { acceptedAt: new Date() },
  });

  const token = await createInviteToken();
  const invite = await prisma.companyInvite.create({
    data: {
      companyId: input.companyId,
      email,
      role: input.role,
      token,
      invitedById: input.invitedById,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  await sendTeamInviteEmail(email, input.companyName, token, input.inviterName);
  return invite;
}

export async function revokeInvite(companyId: string, inviteId: string) {
  const invite = await prisma.companyInvite.findFirst({
    where: { id: inviteId, companyId, acceptedAt: null },
  });
  if (!invite) throw new NotFoundError("Invite not found");
  await prisma.companyInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });
}

export async function acceptTeamInvite(token: string, userId: string, userEmail: string) {
  const invite = await prisma.companyInvite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    throw new ForbiddenError("Invalid or expired invitation.");
  }
  if (invite.email !== userEmail.toLowerCase()) {
    throw new ForbiddenError("This invitation was sent to a different email address.");
  }

  await assertCanAddSeat(invite.companyId);

  await prisma.$transaction([
    prisma.companyMember.upsert({
      where: { companyId_userId: { companyId: invite.companyId, userId } },
      create: { companyId: invite.companyId, userId, role: invite.role },
      update: { role: invite.role },
    }),
    prisma.companyInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return invite.companyId;
}

export async function removeTeamMember(companyId: string, targetUserId: string, actorUserId: string) {
  if (targetUserId === actorUserId) {
    throw new ForbiddenError("You cannot remove yourself. Transfer ownership first.");
  }

  const member = await prisma.companyMember.findUnique({
    where: { companyId_userId: { companyId, userId: targetUserId } },
  });
  if (!member) throw new NotFoundError("Member not found");
  if (member.role === "OWNER") {
    const owners = await prisma.companyMember.count({
      where: { companyId, role: "OWNER" },
    });
    if (owners <= 1) {
      throw new ForbiddenError("Cannot remove the only owner.");
    }
  }

  await prisma.companyMember.delete({
    where: { companyId_userId: { companyId, userId: targetUserId } },
  });
}
