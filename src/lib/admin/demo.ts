import "server-only";

import { prisma } from "@/lib/db";
import { demoAccessStatus } from "@/lib/demo/access";
import type { AdminDemoData } from "@/lib/admin/demo-types";

export type { AdminDemoGrantRow, AdminDemoData } from "@/lib/admin/demo-types";

export async function listAdminDemoGrants(): Promise<AdminDemoData> {
  const grants = await prisma.demoAccess.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, email: true, name: true } },
      company: { select: { id: true, name: true } },
    },
  });

  const now = Date.now();
  const rows = grants.map((g) => {
    const status = demoAccessStatus(g);
    const daysRemaining =
      status === "active"
        ? Math.max(0, Math.ceil((g.expiresAt.getTime() - now) / 86_400_000))
        : 0;

    return {
      id: g.id,
      userId: g.user.id,
      userEmail: g.user.email,
      userName: g.user.name,
      companyId: g.company.id,
      companyName: g.company.name,
      trialPlanKey: g.trialPlanKey,
      expiresAt: g.expiresAt,
      revokedAt: g.revokedAt,
      status,
      notes: g.notes,
      createdBy: g.createdBy,
      createdAt: g.createdAt,
      daysRemaining,
    };
  });

  return {
    grants: rows,
    summary: {
      active: rows.filter((r) => r.status === "active").length,
      expired: rows.filter((r) => r.status === "expired").length,
      revoked: rows.filter((r) => r.status === "revoked").length,
    },
  };
}
