import "server-only";
import { prisma } from "@/lib/db";
import { ForbiddenError, AiTokenLimitError } from "@/lib/auth/errors";
import { canPurchaseTokenPack, planByKey, tokenPackByKey, normalizePlanKey } from "@/lib/billing/plans";
import { writeAuditLog } from "@/lib/audit";

export interface AiTokenBalance {
  planKey: string;
  monthlyAllowance: number;
  extraPurchased: number;
  used: number;
  allowance: number;
  remaining: number;
  allowsLiveAi: boolean;
  periodStart: Date;
}

function currentPeriodStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function resetTokenPeriodIfNeeded(companyId: string): Promise<void> {
  const periodStart = currentPeriodStart();
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { tokenPeriodStart: true },
  });
  if (!company) return;
  if (company.tokenPeriodStart >= periodStart) return;
  await prisma.company.update({
    where: { id: companyId },
    data: { aiTokensUsed: 0, tokenPeriodStart: periodStart },
  });
}

export async function getAiTokenBalance(companyId: string): Promise<AiTokenBalance> {
  await resetTokenPeriodIfNeeded(companyId);

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { subscription: true },
  });
  if (!company) {
    return {
      planKey: "starter",
      monthlyAllowance: 0,
      extraPurchased: 0,
      used: 0,
      allowance: 0,
      remaining: 0,
      allowsLiveAi: false,
      periodStart: currentPeriodStart(),
    };
  }

  const planKey = company.subscription?.key ?? "starter";
  const catalog = planByKey(planKey);
  const monthlyAllowance =
    company.subscription?.monthlyAiTokens ?? catalog?.monthlyAiTokens ?? 0;
  const extraPurchased = company.extraAiTokens;
  const used = company.aiTokensUsed;
  const allowance = monthlyAllowance + extraPurchased;
  const remaining = Math.max(0, allowance - used);

  return {
    planKey,
    monthlyAllowance,
    extraPurchased,
    used,
    allowance,
    remaining,
    allowsLiveAi: allowance > 0,
    periodStart: company.tokenPeriodStart,
  };
}

export async function assertAiTokensAvailable(companyId: string, estimated = 1): Promise<void> {
  const balance = await getAiTokenBalance(companyId);
  if (!balance.allowsLiveAi || balance.remaining < estimated) {
    throw new AiTokenLimitError(
      "AI token limit reached. Purchase extra tokens or upgrade your plan.",
    );
  }
}

export async function debitAiTokens(
  companyId: string,
  tokens: number,
  meta?: { feature?: string; userId?: string },
): Promise<void> {
  if (tokens <= 0) return;
  await resetTokenPeriodIfNeeded(companyId);

  const balance = await getAiTokenBalance(companyId);
  if (balance.remaining < tokens) {
    throw new AiTokenLimitError(
      "AI token limit reached. Purchase extra tokens or upgrade your plan.",
    );
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { aiTokensUsed: { increment: tokens } },
  });

  await writeAuditLog({
    action: "ai.tokens.debit",
    companyId,
    userId: meta?.userId,
    metadata: { tokens, feature: meta?.feature },
  });
}

export function estimateTokensFromText(input: string, output: string): number {
  const chars = input.length + output.length;
  return Math.max(1, Math.ceil(chars / 3.5));
}

export async function purchaseTokenPack(input: {
  companyId: string;
  userId: string;
  packKey: string;
}): Promise<{ tokens: number; newExtraBalance: number }> {
  const pack = tokenPackByKey(input.packKey);
  if (!pack) throw new Error("Unknown token pack");

  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
    include: { subscription: true },
  });
  const planKey = normalizePlanKey(company?.subscription?.key ?? "starter");
  if (!canPurchaseTokenPack(planKey, pack.key)) {
    throw new ForbiddenError(
      planKey === "starter"
        ? "Extra token packs are not available on the Starter plan."
        : "This token pack is not available on your current plan.",
    );
  }

  const updated = await prisma.company.update({
    where: { id: input.companyId },
    data: { extraAiTokens: { increment: pack.tokens } },
    select: { extraAiTokens: true },
  });

  await prisma.aiTokenPurchase.create({
    data: {
      companyId: input.companyId,
      packKey: pack.key,
      tokens: pack.tokens,
      amountEur: pack.priceEur,
    },
  });

  await writeAuditLog({
    action: "ai.tokens.purchase",
    companyId: input.companyId,
    userId: input.userId,
    metadata: { packKey: pack.key, tokens: pack.tokens, amountEur: pack.priceEur },
  });

  return { tokens: pack.tokens, newExtraBalance: updated.extraAiTokens };
}
