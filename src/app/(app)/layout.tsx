import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/guards";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { PlanRouteGate } from "@/components/billing/plan-route-gate";
import { SessionIdleGuard } from "@/components/auth/session-idle-guard";
import { normalizePlanKey } from "@/lib/billing/plans";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/login");
  if (!ctx.companyId || !ctx.role) redirect("/onboarding");

  const company = await prisma.company.findUnique({
    where: { id: ctx.companyId },
    include: { subscription: { select: { name: true, key: true } } },
  });

  const planKey = normalizePlanKey(company?.subscription?.key ?? "starter");

  const shellUser = {
    name: ctx.user.name ?? ctx.user.email,
    email: ctx.user.email,
    role: ctx.role,
  };
  const shellCompany = {
    name: company?.name ?? "Company",
    plan: company?.subscription?.name ?? "Starter",
  };

  return (
    <div className="flex min-h-screen">
      <SessionIdleGuard />
      <Sidebar company={shellCompany} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={shellUser} company={shellCompany} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <PlanRouteGate planKey={planKey}>{children}</PlanRouteGate>
        </main>
      </div>
    </div>
  );
}
