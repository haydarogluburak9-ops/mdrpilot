import "server-only";
import { prisma } from "@/lib/db";
import type { AdminCustomersData } from "@/lib/admin/customers-types";

export type {
  AdminCompanyRow,
  AdminCompanyMember,
  AdminPendingUser,
  AdminCustomerSummary,
  AdminCustomersData,
} from "@/lib/admin/customers-types";

export async function listAdminCustomers(): Promise<AdminCustomersData> {
  const [companies, usersWithoutCompany] = await Promise.all([
    prisma.company.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        country: true,
        createdAt: true,
        extraAiTokens: true,
        aiTokensUsed: true,
        subscription: {
          select: { key: true, name: true, priceMonthly: true, monthlyAiTokens: true },
        },
        _count: { select: { products: true, members: true } },
        members: {
          orderBy: { createdAt: "asc" },
          select: {
            role: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                emailVerifiedAt: true,
              },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        deletedAt: null,
        memberships: { none: {} },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    }),
  ]);

  const planCounts: Record<string, number> = {};
  const companyRows = companies.map((c) => {
    const planKey = c.subscription?.key ?? "starter";
    planCounts[planKey] = (planCounts[planKey] ?? 0) + 1;

    const monthlyAiTokens = c.subscription?.monthlyAiTokens ?? 0;
    const allowance = monthlyAiTokens + c.extraAiTokens;
    const aiTokensRemaining = Math.max(0, allowance - c.aiTokensUsed);

    return {
      companyId: c.id,
      companyName: c.name,
      country: c.country,
      createdAt: c.createdAt,
      planKey,
      planName: c.subscription?.name ?? "Starter",
      priceMonthly: c.subscription?.priceMonthly ?? 0,
      productCount: c._count.products,
      memberCount: c._count.members,
      monthlyAiTokens,
      extraAiTokens: c.extraAiTokens,
      aiTokensUsed: c.aiTokensUsed,
      aiTokensRemaining,
      members: c.members.map((m) => ({
        userId: m.user.id,
        email: m.user.email,
        name: m.user.name,
        role: m.role,
        emailVerified: Boolean(m.user.emailVerifiedAt),
        joinedAt: m.createdAt,
      })),
    };
  });

  const totalUsers = await prisma.user.count({ where: { deletedAt: null } });

  return {
    companies: companyRows,
    pendingUsers: usersWithoutCompany.map((u) => ({
      userId: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
      emailVerified: Boolean(u.emailVerifiedAt),
    })),
    summary: {
      totalUsers,
      totalCompanies: companies.length,
      usersPendingOnboarding: usersWithoutCompany.length,
      planCounts,
    },
  };
}
