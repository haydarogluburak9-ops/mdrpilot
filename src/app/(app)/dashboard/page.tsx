import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getDashboardData } from "@/lib/data/queries";
import { DashboardView } from "./dashboard-view";

export const dynamic = "force-dynamic";

export interface CompanyProfile {
  industry?: "MEDICAL" | "FOOD" | "PHARMA" | "OTHER";
  standards?: string[];
  productCount?: number;
  goal?: "GENERATE" | "GAPS" | "AUDIT";
}

export default async function DashboardPage() {
  // Redirect (rather than throw) on missing/stale session so users are never
  // trapped on an error screen — they get sent to login/onboarding cleanly.
  const auth = await getCurrentUser();
  if (!auth) redirect("/login");
  if (!auth.companyId || !auth.role) redirect("/onboarding");
  const ctx = { companyId: auth.companyId, role: auth.role };
  const [{ products, capas, complaints }, company] = await Promise.all([
    getDashboardData(ctx.companyId),
    prisma.company.findUnique({ where: { id: ctx.companyId }, select: { name: true, profileJson: true } }),
  ]);
  return (
    <DashboardView
      products={products}
      capas={capas}
      complaints={complaints}
      companyName={company?.name ?? "MDRpilot"}
      profile={(company?.profileJson as CompanyProfile | null) ?? null}
    />
  );
}
