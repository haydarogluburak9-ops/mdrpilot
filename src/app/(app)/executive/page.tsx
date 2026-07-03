import { requireCompany, hasRole } from "@/lib/auth/guards";
import { loadExecutiveData } from "@/lib/compliance/executive";
import { ExecutiveView } from "./executive-view";

export const dynamic = "force-dynamic";

export default async function ExecutivePage() {
  const ctx = await requireCompany();
  const data = await loadExecutiveData(ctx.companyId);
  return <ExecutiveView data={data} canExport={hasRole(ctx.role, "CONSULTANT")} />;
}
