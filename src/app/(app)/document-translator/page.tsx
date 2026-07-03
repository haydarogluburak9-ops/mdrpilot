import { requireCompany, hasRole } from "@/lib/auth/guards";
import { DocumentTranslatorView } from "./document-translator-view";

export const dynamic = "force-dynamic";

export default async function DocumentTranslatorPage() {
  const ctx = await requireCompany();
  return <DocumentTranslatorView canTranslate={hasRole(ctx.role, "CONSULTANT")} />;
}
