import "server-only";

import { prisma } from "@/lib/db";

import { PlanLimitError } from "@/lib/auth/errors";

import { planByKey, normalizePlanKey } from "@/lib/billing/plans";

import { getAiTokenBalance } from "@/lib/billing/ai-tokens";

async function countPendingInvites(companyId: string): Promise<number> {
  if (!("companyInvite" in prisma)) return 0;
  return prisma.companyInvite.count({
    where: { companyId, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
}



export interface CompanyPlanUsage {

  planKey: string;

  planName: string;

  maxProducts: number;

  maxSeats: number;

  productCount: number;

  seatCount: number;

  pendingInvites: number;

  monthlyAiTokens: number;

  extraAiTokens: number;

  aiTokensUsed: number;

  aiTokensRemaining: number;

}



export async function getCompanyPlanUsage(companyId: string): Promise<CompanyPlanUsage> {

  const now = new Date();

  const [company, pendingInvites] = await Promise.all([

    prisma.company.findUnique({

      where: { id: companyId },

      include: {

        subscription: true,

        _count: {

          select: {

            products: { where: { deletedAt: null } },

            members: true,

          },

        },

      },

    }),

    countPendingInvites(companyId),

  ]);



  const sub = company?.subscription;
  const planKey = normalizePlanKey(sub?.key ?? "starter");
  const catalog = planByKey(sub?.key ?? "starter");

  const tokens = await getAiTokenBalance(companyId);

  return {
    planKey,
    planName: sub?.name ?? catalog?.nameKey ?? "Starter",

    maxProducts: sub?.maxProducts ?? catalog?.maxProducts ?? 1,

    maxSeats: sub?.maxSeats ?? catalog?.maxSeats ?? 1,

    productCount: company?._count.products ?? 0,

    seatCount: company?._count.members ?? 0,

    pendingInvites,

    monthlyAiTokens: tokens.monthlyAllowance,

    extraAiTokens: tokens.extraPurchased,

    aiTokensUsed: tokens.used,

    aiTokensRemaining: tokens.remaining,

  };

}



export async function assertCanAddProduct(companyId: string): Promise<void> {

  const usage = await getCompanyPlanUsage(companyId);

  if (usage.productCount >= usage.maxProducts) {

    throw new PlanLimitError(

      `Product limit reached (${usage.maxProducts} on ${usage.planName}). Upgrade your plan to add more devices.`,

    );

  }

}



export async function assertCanAddSeat(companyId: string): Promise<void> {

  const usage = await getCompanyPlanUsage(companyId);

  const reserved = usage.seatCount + usage.pendingInvites;

  if (reserved >= usage.maxSeats) {

    throw new PlanLimitError(

      `Seat limit reached (${usage.maxSeats} on ${usage.planName}). Upgrade your plan or revoke pending invites.`,

    );

  }

}

