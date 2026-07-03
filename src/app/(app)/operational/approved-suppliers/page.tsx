import { requireCompany, hasRole } from "@/lib/auth/guards";
import { ApprovedSuppliersView } from "./approved-suppliers-view";

export default async function ApprovedSuppliersPage() {
  const ctx = await requireCompany();
  return <ApprovedSuppliersView canEdit={hasRole(ctx.role, "CONSULTANT")} />;
}
