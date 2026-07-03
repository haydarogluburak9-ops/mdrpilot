import { notFound, redirect } from "next/navigation";
import { requireCompany, hasRole } from "@/lib/auth/guards";
import { getQmsProcedureBundle } from "@/lib/data/queries";
import { parseOperationalLink } from "@/lib/operational/modules";
import {
  isOperationalManagedChild,
  operationalHrefForFormCode,
  operationalNoticeForSop,
} from "@/lib/operational/operational-form-registry";
import { ProcedureDetailView } from "./procedure-detail-view";

export default async function QmsProcedurePage({
  params,
  searchParams,
}: {
  params: { code: string };
  searchParams?: { doc?: string; queue?: string; hint?: string; record?: string };
}) {
  const ctx = await requireCompany();
  const procedureCode = params.code.trim().toUpperCase();

  const docCode = searchParams?.doc?.trim().toUpperCase() ?? "";
  const operationalHref = docCode ? operationalHrefForFormCode(docCode) : null;
  if (operationalHref) {
    redirect(operationalHref);
  }

  const bundle = await getQmsProcedureBundle(ctx.companyId, params.code);
  if (!bundle) notFound();

  const childDocs = bundle.children.filter(
    (c) => !isOperationalManagedChild(procedureCode, c.code),
  );

  const initialDocQueue =
    searchParams?.queue
      ?.split(",")
      .map((c) => c.trim())
      .filter(Boolean) ?? [];

  const initialOperationalLink = parseOperationalLink(searchParams?.record);
  const operationalOnlyNotice = operationalNoticeForSop(procedureCode);

  return (
    <ProcedureDetailView
      procedure={bundle.procedure}
      childDocs={childDocs}
      companyName={bundle.companyName}
      canEdit={hasRole(ctx.role, "CONSULTANT")}
      canApprove={hasRole(ctx.role, "QUALITY_MANAGER")}
      initialDocCode={searchParams?.doc}
      initialDocQueue={initialDocQueue}
      initialHint={searchParams?.hint}
      initialOperationalLink={initialOperationalLink}
      operationalOnlyNotice={operationalOnlyNotice ?? undefined}
    />
  );
}
