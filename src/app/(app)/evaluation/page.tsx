import { requireCompany, hasRole } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import { aiProviderInfo, availableProviders } from "@/lib/ai/provider-factory";
import { EvaluationView } from "./evaluation-view";

export const dynamic = "force-dynamic";

export default async function EvaluationPage() {
  const ctx = await requireCompany();
  if (!hasRole(ctx.role, "QUALITY_MANAGER")) redirect("/dashboard");

  const info = aiProviderInfo();
  const providers = availableProviders();

  return (
    <EvaluationView
      provider={info.provider}
      model={info.model}
      configured={info.configured}
      availableProviders={providers}
    />
  );
}
