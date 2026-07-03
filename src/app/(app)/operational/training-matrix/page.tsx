import { requireCompany, hasRole } from "@/lib/auth/guards";
import { TrainingMatrixView } from "@/components/eqms/training-matrix-view";

export default async function TrainingMatrixPage() {
  const ctx = await requireCompany();
  return <TrainingMatrixView canEdit={hasRole(ctx.role, "CONSULTANT")} />;
}
